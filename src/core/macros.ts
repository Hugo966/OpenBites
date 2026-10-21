import type { Alimentos, Alimento, Comida, Dia, Item, Macros, Menu } from './types'

export const CERO: Macros = { kcal: 0, p: 0, hc: 0, g: 0 }
export const MACROS = ['kcal', 'p', 'hc', 'g'] as const
export const MARGEN_COMIDA: Macros = { kcal: 5, p: 2, hc: 2, g: 2 }
export const MARGEN_DIA: Macros = { kcal: 20, p: 5, hc: 5, g: 5 }

const combinar = (a: Macros, b: Macros, f: (x: number, y: number) => number): Macros =>
  ({ kcal: f(a.kcal, b.kcal), p: f(a.p, b.p), hc: f(a.hc, b.hc), g: f(a.g, b.g) })

export const sumar = (a: Macros, b: Macros) => combinar(a, b, (x, y) => x + y)
export const restar = (a: Macros, b: Macros) => combinar(a, b, (x, y) => x - y)

export const gramos = (a: Alimento, cantidad: number) => (a.gUnidad ? cantidad * a.gUnidad : cantidad)

export function macrosDe(a: Alimento, cantidad: number): Macros {
  const f = gramos(a, cantidad) / 100
  return { kcal: a.por100.kcal * f, p: a.por100.p * f, hc: a.por100.hc * f, g: a.por100.g * f }
}

export function macrosItem(alimentos: Alimentos, item: Item): Macros {
  const a = alimentos[item.alimentoId]
  if (!a) throw new Error(`Alimento desconocido: ${item.alimentoId}`)
  return macrosDe(a, item.cantidad)
}

export const totalItems = (alimentos: Alimentos, items: Item[]) =>
  items.reduce((t, i) => sumar(t, macrosItem(alimentos, i)), CERO)

export const totalComida = (alimentos: Alimentos, c: Comida) => (c.libre ? CERO : totalItems(alimentos, c.items))

export const totalDia = (alimentos: Alimentos, d: Dia) =>
  d.comidas.reduce((t, c) => sumar(t, totalComida(alimentos, c)), CERO)

export const totalMenu = (alimentos: Alimentos, m: Menu) =>
  m.dias.reduce((t, d) => sumar(t, totalDia(alimentos, d)), CERO)

// Un día con comidas libres no se compara con su objetivo
export const diaLibre = (d: Dia) => d.comidas.some(c => c.libre)

export const dentroMargen = (real: Macros, objetivo: Macros, margen: Macros) =>
  MACROS.every(k => Math.abs(real[k] - objetivo[k]) <= margen[k])
