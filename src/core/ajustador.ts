import { CERO, gramos, MACROS, MARGEN_COMIDA, macrosDe, restar, sumar } from './macros'
import type { Alimento, Alimentos, Item, Macros } from './types'

type Clave = (typeof MACROS)[number]

export type Peticion = {
  objetivo: Partial<Macros> // deltas a conseguir en los macros fijados; el resto queda libre
  tolerancia?: Macros
  excluir?: string[] // alimentos que no se tocan ni se sugieren en esta petición
  n?: number
}

export type Cambio = { alimentoId: string; de: number; a: number } // de 0 = añadir, a 0 = quitar
export type Opcion = { cambios: Cambio[]; delta: Macros; error: number; dentro: boolean }

const PASO_G = 5

// Macros por cada unidad de cantidad (1 g, o 1 unidad si el alimento va por unidades)
const porCantidad = (a: Alimento) => macrosDe(a, 1)

function redondeos(a: Alimento, x: number): number[] {
  const paso = a.gUnidad ? 1 : PASO_G
  return [...new Set([Math.floor(x / paso) * paso, Math.ceil(x / paso) * paso])]
}

function valida(a: Alimento, q: number, actual: number): boolean {
  if (q < 0 || q === actual) return false
  if (q === 0) return actual > 0 // quitar solo si estaba
  const g = gramos(a, q)
  return g >= (a.minG ?? 0) && g <= (a.maxG ?? Infinity)
}

export function ajustar(alimentos: Alimentos, items: Item[], pet: Peticion): Opcion[] {
  const tol = pet.tolerancia ?? MARGEN_COMIDA
  const excluir = new Set(pet.excluir)
  const fijados = MACROS.filter(k => pet.objetivo[k] !== undefined) as Clave[]
  if (!fijados.length) return []
  const T = fijados.map(k => pet.objetivo[k]!)

  const actual: Record<string, number> = {}
  for (const i of items) actual[i.alimentoId] = (actual[i.alimentoId] ?? 0) + i.cantidad

  // Variables: lo que ya está en la comida + alimentos sugeribles
  const vars = Object.values(alimentos).filter(a =>
    !excluir.has(a.id) && (a.id in actual || !a.nuncaSugerir))
  // Vector de macros fijados ponderado por 1/tolerancia, para mínimos cuadrados
  const wCache = new Map(vars.map(a => [a.id, fijados.map(k => porCantidad(a)[k] / tol[k])]))
  const w = (a: Alimento) => wCache.get(a.id)!
  const Tw = fijados.map((k, i) => T[i] / tol[k])
  const dot = (x: number[], y: number[]) => x.reduce((s, v, i) => s + v * y[i], 0)
  const cur = (a: Alimento) => actual[a.id] ?? 0

  const vistas = new Set<string>()
  const opciones: Opcion[] = []

  function evaluar(propuesta: [Alimento, number][]) {
    if (!propuesta.every(([a, q]) => valida(a, q, cur(a)))) return
    const cambios = propuesta.map(([a, q]) => ({ alimentoId: a.id, de: cur(a), a: q }))
    const clave = cambios.map(c => `${c.alimentoId}:${c.a}`).sort().join('|')
    if (vistas.has(clave)) return
    vistas.add(clave)
    const delta = propuesta.reduce((d, [a, q]) => sumar(d, restar(macrosDe(a, q), macrosDe(a, cur(a)))), CERO)
    const error = fijados.reduce((s, k, i) => s + ((delta[k] - T[i]) / tol[k]) ** 2, 0)
    const dentro = fijados.every((k, i) => Math.abs(delta[k] - T[i]) <= tol[k])
    opciones.push({ cambios, delta, error, dentro })
  }

  // 1D: mejor cantidad de `a` para cubrir el objetivo restante `R` (ponderado)
  const resolver1 = (a: Alimento, R: number[]) => {
    const m = w(a)
    const mm = dot(m, m)
    return mm ? cur(a) + dot(m, R) / mm : null
  }

  for (const a of vars) {
    const q = resolver1(a, Tw)
    if (q !== null) for (const r of redondeos(a, q)) evaluar([[a, r]])
    if (cur(a)) evaluar([[a, 0]])
  }

  // ponytail: pares O(n²), ~250 ms con 200 alimentos; si crece, limitar pares a ítems de la comida × candidatos
  for (let i = 0; i < vars.length; i++) {
    for (let j = i + 1; j < vars.length; j++) {
      const a = vars[i], b = vars[j]
      // Sustituir: quitar uno que está y ajustar el otro
      for (const [x, y] of [[a, b], [b, a]]) {
        if (!cur(x)) continue
        const R = Tw.map((t, k) => t + w(x)[k] * cur(x))
        const q = resolver1(y, R)
        if (q !== null) for (const r of redondeos(y, q)) evaluar([[x, 0], [y, r]])
      }
      // Mover ambos: sistema 2x2 (solo si hay ≥2 macros fijados)
      const ma = w(a), mb = w(b)
      const A = dot(ma, ma), B = dot(ma, mb), C = dot(mb, mb)
      const det = A * C - B * B
      if (Math.abs(det) < 1e-9 * (A * C || 1)) continue
      const ra = dot(ma, Tw), rb = dot(mb, Tw)
      const xa = cur(a) + (C * ra - B * rb) / det
      const xb = cur(b) + (A * rb - B * ra) / det
      for (const qa of redondeos(a, xa)) for (const qb of redondeos(b, xb)) {
        evaluar([[a, qa], [b, qb]])
      }
    }
  }

  // Dentro de tolerancia primero; entre esas, menos cambios; luego error y menos gramos movidos
  // ponytail: aún no prefiere cantidades que cuadren con envases (spec 5, bonus); añadir como desempate si se echa en falta
  const movido = (o: Opcion) => o.cambios.reduce((s, c) => s + Math.abs(gramos(alimentos[c.alimentoId], c.a - c.de)), 0)
  opciones.sort((x, y) =>
    Number(y.dentro) - Number(x.dentro) ||
    (x.dentro ? x.cambios.length - y.cambios.length : 0) ||
    x.error - y.error ||
    movido(x) - movido(y))
  return opciones.slice(0, pet.n ?? 5)
}

export function aplicar(items: Item[], opcion: Opcion): Item[] {
  // Respeta el orden; si un alimento estaba repetido queda una sola línea con la cantidad nueva
  const nuevo = new Map(opcion.cambios.map(c => [c.alimentoId, c.a]))
  const res: Item[] = []
  for (const i of items) {
    if (!nuevo.has(i.alimentoId)) res.push(i)
    else if (!res.some(r => r.alimentoId === i.alimentoId) && nuevo.get(i.alimentoId)! > 0)
      res.push({ alimentoId: i.alimentoId, cantidad: nuevo.get(i.alimentoId)! })
  }
  for (const c of opcion.cambios)
    if (c.de === 0 && c.a > 0) res.push({ alimentoId: c.alimentoId, cantidad: c.a })
  return res
}
