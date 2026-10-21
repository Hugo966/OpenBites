import { expect, test } from 'vitest'
import { ajustar, aplicar } from './ajustador'
import { MARGEN_COMIDA, totalItems } from './macros'
import type { Alimentos, Item } from './types'

const alimentos: Alimentos = {
  arroz: { id: 'arroz', nombre: 'Arroz', por100: { kcal: 350, p: 7, hc: 78, g: 1 } },
  pollo: { id: 'pollo', nombre: 'Pollo', por100: { kcal: 110, p: 23, hc: 0, g: 1.5 } },
  aceite: { id: 'aceite', nombre: 'Aceite', maxG: 20, por100: { kcal: 884, p: 0, hc: 0, g: 100 } },
  huevo: { id: 'huevo', nombre: 'Huevo', gUnidad: 60, por100: { kcal: 150, p: 12.5, hc: 1, g: 10 } },
  atun: { id: 'atun', nombre: 'Atún', por100: { kcal: 110, p: 25, hc: 0, g: 1 } },
}
const comida: Item[] = [
  { alimentoId: 'arroz', cantidad: 80 },
  { alimentoId: 'pollo', cantidad: 150 },
  { alimentoId: 'aceite', cantidad: 10 },
]

const cantidades = (o: { cambios: { alimentoId: string; a: number }[] }) =>
  Object.fromEntries(o.cambios.map(c => [c.alimentoId, c.a]))

test('un macro: la mejor opción es un solo cambio dentro de tolerancia', () => {
  const [mejor, ...resto] = ajustar(alimentos, comida, { objetivo: { p: 20 } })
  expect(mejor.dentro).toBe(true)
  expect(mejor.cambios).toHaveLength(1)
  expect(Math.abs(mejor.delta.p - 20)).toBeLessThanOrEqual(MARGEN_COMIDA.p)
  expect(resto.length).toBe(4)
})

test('varios macros: +15 g prot sin subir kcal', () => {
  const ops = ajustar(alimentos, comida, { objetivo: { p: 15, kcal: 0 }, tolerancia: { kcal: 20, p: 3, hc: 2, g: 2 } })
  const mejor = ops[0]
  expect(mejor.dentro).toBe(true)
  expect(Math.abs(mejor.delta.kcal)).toBeLessThanOrEqual(20)
  // el delta coincide con aplicar la opción
  const antes = totalItems(alimentos, comida), despues = totalItems(alimentos, aplicar(comida, mejor))
  expect(despues.p - antes.p).toBeCloseTo(mejor.delta.p)
})

test('cantidades: gramos de 5 en 5, unidades enteras, límites', () => {
  const ops = ajustar(alimentos, comida, { objetivo: { p: 12, g: 10 }, n: 50 })
  for (const o of ops) for (const c of o.cambios) {
    const a = alimentos[c.alimentoId]
    expect(c.a % (a.gUnidad ? 1 : 5)).toBe(0)
    if (a.maxG) expect(c.a).toBeLessThanOrEqual(a.maxG)
  }
})

test('quitar: -88.4 kcal = fuera el aceite', () => {
  const [mejor] = ajustar(alimentos, comida, { objetivo: { kcal: -88.4 } })
  expect(mejor.cambios).toEqual([{ alimentoId: 'aceite', de: 10, a: 0 }])
})

test('exclusiones: por petición y nunca sugerir', () => {
  const ops = ajustar(alimentos, comida, { objetivo: { p: 20 }, excluir: ['pollo'], n: 100 })
  expect(ops.length).toBeGreaterThan(0)
  expect(ops.every(o => o.cambios.every(c => c.alimentoId !== 'pollo'))).toBe(true)

  const sinAtun = { ...alimentos, atun: { ...alimentos.atun, nuncaSugerir: true } }
  const ops2 = ajustar(sinAtun, comida, { objetivo: { p: 20 }, n: 100 })
  expect(ops2.every(o => o.cambios.every(c => c.alimentoId !== 'atun'))).toBe(true)
  // nunca sugerir no impide ajustar si ya está en la comida
  const conAtun = [...comida, { alimentoId: 'atun', cantidad: 50 }]
  expect(ajustar(sinAtun, conAtun, { objetivo: { p: 20 }, n: 100 }).some(o => cantidades(o).atun)).toBe(true)
})

test('sustituir: quitar uno y añadir otro', () => {
  const al: Alimentos = {
    x: { id: 'x', nombre: 'X', por100: { kcal: 100, p: 10, hc: 0, g: 0 } },
    y: { id: 'y', nombre: 'Y', por100: { kcal: 100, p: 0, hc: 10, g: 0 } },
  }
  const [mejor] = ajustar(al, [{ alimentoId: 'y', cantidad: 100 }], { objetivo: { p: 10, hc: -10 } })
  expect(cantidades(mejor)).toEqual({ x: 100, y: 0 })
  expect(aplicar([{ alimentoId: 'y', cantidad: 100 }], mejor)).toEqual([{ alimentoId: 'x', cantidad: 100 }])
})

test('sin macros fijados no hay opciones', () => {
  expect(ajustar(alimentos, comida, { objetivo: {} })).toEqual([])
})
