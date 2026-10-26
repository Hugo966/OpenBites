import { grams } from './macros'
import type { FoodMap, Menu } from './types'

export type PackageUsage = {
  foodId: string
  uses: number // per menu cycle
  grams: number // eaten per cycle
  packages: number // opened per cycle (average)
  wasted: number // grams thrown away per cycle (average)
  usesPerPackage: number // uses within the package's shelf life, starting at the first use
  suggestions: { amount: number; uses: number }[] // in the food's unit (g or units)
}

const CYCLES = 60 // the menu repeats; the first cycle is only a warm-up

// Uses of each food in order: menu day and grams. Free meals don't count.
function usesByFood(foods: FoodMap, menu: Menu) {
  const uses: Record<string, { day: number; g: number }[]> = {}
  menu.days.forEach((d, day) => d.meals.forEach(m => {
    if (m.free) return
    for (const it of m.items) {
      const f = foods[it.foodId]
      if (!f || it.amount <= 0) continue
      ;(uses[f.id] ??= []).push({ day, g: grams(f, it.amount) })
    }
  }))
  return uses
}

function simulate(size: number, daysOpen: number, uses: { day: number; g: number }[], nDays: number) {
  let left = 0, openedOn = -Infinity, thrown = 0
  for (let c = 0; c < CYCLES; c++) {
    const measure = c > 0
    for (const u of uses) {
      const day = c * nDays + u.day
      if (left > 1e-6 && day - openedOn >= daysOpen) { if (measure) thrown += left; left = 0 }
      let need = u.g
      while (need > 1e-6) {
        if (left <= 1e-6) { left = size; openedOn = day }
        const t = Math.min(need, left)
        need -= t
        left -= t
      }
    }
  }
  const wasted = thrown / (CYCLES - 1)
  // Everything that comes home is either eaten or thrown away
  return { packages: (uses.reduce((s, u) => s + u.g, 0) + wasted) / size, wasted }
}

export function analyzePackages(foods: FoodMap, menu: Menu): PackageUsage[] {
  const nDays = Math.max(menu.days.length, 1)
  return Object.entries(usesByFood(foods, menu)).flatMap(([id, uses]) => {
    const f = foods[id]
    if (!f.package) return []
    const { grams: size, daysOpen } = f.package
    const { packages, wasted } = simulate(size, daysOpen, uses, nDays)
    // Uses that fall within the shelf life starting at the first use (including following cycles)
    const start = uses[0].day
    let k = 0
    for (let c = 0; c * nDays < daysOpen + nDays; c++)
      for (const u of uses) { const d = c * nDays + u.day; if (d >= start && d - start < daysOpen) k++ }
    const inUnit = (g: number) => Math.round((f.gramsPerUnit ? g / f.gramsPerUnit : g) * 10) / 10
    const suggestions = [k, k + 1, k - 1].filter(n => n > 0).map(n => ({ amount: inUnit(size / n), uses: n }))
    return [{ foodId: id, uses: uses.length, grams: uses.reduce((s, u) => s + u.g, 0), packages, wasted, usesPerPackage: k, suggestions }]
  })
}

export type ShoppingLine = { foodId: string; grams: number; amount: number; packages?: number; wasted?: number }

// What one menu cycle needs. With a package: how many to buy (rounded up).
export function shoppingList(foods: FoodMap, menu: Menu): ShoppingLine[] {
  const pkg = Object.fromEntries(analyzePackages(foods, menu).map(p => [p.foodId, p]))
  return Object.entries(usesByFood(foods, menu))
    .map(([id, uses]) => {
      const f = foods[id]
      const g = uses.reduce((s, u) => s + u.g, 0)
      const p = pkg[id]
      return {
        foodId: id, grams: g, amount: f.gramsPerUnit ? g / f.gramsPerUnit : g,
        ...(p && { packages: Math.ceil(p.packages - 1e-6), wasted: p.wasted }),
      }
    })
    .sort((x, y) => foods[x.foodId].name.localeCompare(foods[y.foodId].name))
}
