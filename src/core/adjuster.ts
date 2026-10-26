import { add, grams, MACROS, MEAL_TOLERANCE, macrosOf, subtract, ZERO } from './macros'
import type { Food, FoodMap, Item, Macros } from './types'

type Key = (typeof MACROS)[number]

export type Request = {
  target: Partial<Macros> // deltas to reach on the fixed macros; the rest are free
  tolerance?: Macros
  exclude?: string[] // foods not touched nor suggested in this request
  limit?: number
}

export type Change = { foodId: string; from: number; to: number } // from 0 = add, to 0 = remove
export type Option = { changes: Change[]; delta: Macros; error: number; within: boolean }

const GRAM_STEP = 5

// Macros per unit of amount (1 g, or 1 unit for unit-based foods)
const perAmount = (f: Food) => macrosOf(f, 1)

function roundings(f: Food, x: number): number[] {
  const step = f.gramsPerUnit ? 1 : GRAM_STEP
  return [...new Set([Math.floor(x / step) * step, Math.ceil(x / step) * step])]
}

function isValid(f: Food, amount: number, current: number): boolean {
  if (amount < 0 || amount === current) return false
  if (amount === 0) return current > 0 // can only remove what is there
  const g = grams(f, amount)
  return g >= (f.minGrams ?? 0) && g <= (f.maxGrams ?? Infinity)
}

export function adjust(foods: FoodMap, items: Item[], req: Request): Option[] {
  const tol = req.tolerance ?? MEAL_TOLERANCE
  const exclude = new Set(req.exclude)
  const fixed = MACROS.filter(k => req.target[k] !== undefined) as Key[]
  if (!fixed.length) return []
  const T = fixed.map(k => req.target[k]!)

  const current: Record<string, number> = {}
  for (const i of items) current[i.foodId] = (current[i.foodId] ?? 0) + i.amount

  // Variables: what is already in the meal + suggestable foods
  const vars = Object.values(foods).filter(f =>
    !exclude.has(f.id) && (f.id in current || !f.neverSuggest))
  // Fixed-macro vector weighted by 1/tolerance, for least squares
  const wCache = new Map(vars.map(f => [f.id, fixed.map(k => perAmount(f)[k] / tol[k])]))
  const w = (f: Food) => wCache.get(f.id)!
  const Tw = fixed.map((k, i) => T[i] / tol[k])
  const dot = (x: number[], y: number[]) => x.reduce((s, v, i) => s + v * y[i], 0)
  const cur = (f: Food) => current[f.id] ?? 0

  const seen = new Set<string>()
  const options: Option[] = []

  function evaluate(proposal: [Food, number][]) {
    if (!proposal.every(([f, q]) => isValid(f, q, cur(f)))) return
    const changes = proposal.map(([f, q]) => ({ foodId: f.id, from: cur(f), to: q }))
    const key = changes.map(c => `${c.foodId}:${c.to}`).sort().join('|')
    if (seen.has(key)) return
    seen.add(key)
    const delta = proposal.reduce((d, [f, q]) => add(d, subtract(macrosOf(f, q), macrosOf(f, cur(f)))), ZERO)
    const error = fixed.reduce((s, k, i) => s + ((delta[k] - T[i]) / tol[k]) ** 2, 0)
    const within = fixed.every((k, i) => Math.abs(delta[k] - T[i]) <= tol[k])
    options.push({ changes, delta, error, within })
  }

  // 1-D: best amount of `f` to cover the remaining (weighted) target `R`
  const solve1 = (f: Food, R: number[]) => {
    const m = w(f)
    const mm = dot(m, m)
    return mm ? cur(f) + dot(m, R) / mm : null
  }

  for (const f of vars) {
    const q = solve1(f, Tw)
    if (q !== null) for (const r of roundings(f, q)) evaluate([[f, r]])
    if (cur(f)) evaluate([[f, 0]])
  }

  // ponytail: O(n²) pairs, ~250 ms with 200 foods; if it grows, restrict pairs to meal items × candidates
  for (let i = 0; i < vars.length; i++) {
    for (let j = i + 1; j < vars.length; j++) {
      const a = vars[i], b = vars[j]
      // Swap: remove one that is in the meal and solve for the other
      for (const [x, y] of [[a, b], [b, a]]) {
        if (!cur(x)) continue
        const R = Tw.map((t, k) => t + w(x)[k] * cur(x))
        const q = solve1(y, R)
        if (q !== null) for (const r of roundings(y, q)) evaluate([[x, 0], [y, r]])
      }
      // Move both: 2×2 normal equations (only solvable with ≥2 fixed macros)
      const ma = w(a), mb = w(b)
      const A = dot(ma, ma), B = dot(ma, mb), C = dot(mb, mb)
      const det = A * C - B * B
      if (Math.abs(det) < 1e-9 * (A * C || 1)) continue
      const ra = dot(ma, Tw), rb = dot(mb, Tw)
      const xa = cur(a) + (C * ra - B * rb) / det
      const xb = cur(b) + (A * rb - B * ra) / det
      for (const qa of roundings(a, xa)) for (const qb of roundings(b, xb)) {
        evaluate([[a, qa], [b, qb]])
      }
    }
  }

  // Within tolerance first. Among those every option is good enough, so prefer the smallest edit to the meal
  // (fewer changes, then fewer grams moved) instead of a marginally lower error from a huge change.
  // Outside tolerance, the closest to the target wins.
  // ponytail: doesn't yet prefer package-friendly amounts (spec 5, bonus); add as a tie-breaker if missed
  const moved = (o: Option) => o.changes.reduce((s, c) => s + Math.abs(grams(foods[c.foodId], c.to - c.from)), 0)
  options.sort((x, y) =>
    Number(y.within) - Number(x.within) ||
    (x.within ? x.changes.length - y.changes.length || moved(x) - moved(y) : 0) ||
    x.error - y.error ||
    moved(x) - moved(y))
  return options.slice(0, req.limit ?? 5)
}

export function apply(items: Item[], option: Option): Item[] {
  // Keeps the order; a food that appeared twice ends up as a single line with the new amount
  const next = new Map(option.changes.map(c => [c.foodId, c.to]))
  const res: Item[] = []
  for (const i of items) {
    if (!next.has(i.foodId)) res.push(i)
    else if (!res.some(r => r.foodId === i.foodId) && next.get(i.foodId)! > 0)
      res.push({ foodId: i.foodId, amount: next.get(i.foodId)! })
  }
  for (const c of option.changes)
    if (c.from === 0 && c.to > 0) res.push({ foodId: c.foodId, amount: c.to })
  return res
}
