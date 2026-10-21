import { expect, test } from 'vitest'
import { analizarEnvases, listaCompra } from './envases'
import type { Alimentos, Menu } from './types'

const alimentos: Alimentos = {
  guaca: { id: 'guaca', nombre: 'Guacamole', envase: { g: 200, diasAbierto: 7 }, por100: { kcal: 190, p: 2, hc: 5, g: 17 } },
  yogur: { id: 'yogur', nombre: 'Yogur', gUnidad: 125, envase: { g: 500, diasAbierto: 30 }, por100: { kcal: 60, p: 10, hc: 4, g: 0 } },
  arroz: { id: 'arroz', nombre: 'Arroz', por100: { kcal: 350, p: 7, hc: 78, g: 1 } },
}

// Menú de n días, una sola comida; usos: día → ítems
function menu(n: number, usos: Record<number, [string, number][]>, libres: number[] = []): Menu {
  return {
    id: 'm', nombre: 'm', comidas: ['Comida'],
    dias: Array.from({ length: n }, (_, d) => ({
      nombre: `D${d}`,
      comidas: [{ libre: libres.includes(d) || undefined, items: (usos[d] ?? []).map(([alimentoId, cantidad]) => ({ alimentoId, cantidad })) }],
    })),
  }
}
const guaca = (m: Menu) => analizarEnvases(alimentos, m).find(e => e.alimentoId === 'guaca')!

test('guacamole 60 g una vez por semana: se tiran 140 g y propone 200 g o 100 g ×2', () => {
  const e = guaca(menu(7, { 0: [['guaca', 60]] }))
  expect(e.envases).toBeCloseTo(1)
  expect(e.sobran).toBeCloseTo(140)
  expect(e.usosPorEnvase).toBe(1)
  expect(e.sugerencias).toEqual([{ cantidad: 200, usos: 1 }, { cantidad: 100, usos: 2 }])
})

test('100 g lunes y jueves: cuadra', () => {
  const e = guaca(menu(7, { 0: [['guaca', 100]], 3: [['guaca', 100]] }))
  expect(e.sobran).toBeCloseTo(0)
  expect(e.envases).toBeCloseTo(1)
  expect(e.usosPorEnvase).toBe(2)
})

test('caduca antes del segundo uso: dos envases y se tira la mitad de cada uno', () => {
  const al = { ...alimentos, guaca: { ...alimentos.guaca, envase: { g: 200, diasAbierto: 3 } } }
  const e = analizarEnvases(al, menu(7, { 0: [['guaca', 100]], 4: [['guaca', 100]] }))[0]
  expect(e.envases).toBeCloseTo(2)
  expect(e.sobran).toBeCloseTo(200)
})

test('la vida del envase cruza la vuelta del menú', () => {
  // 50 g cada lunes, dura 30 días: 4 usos por envase → sin desperdicio
  const e = guaca(menu(7, { 0: [['guaca', 50]] }))
  expect(e.sobran).toBeCloseTo(150) // con 7 días de vida se tira el resto cada semana
  const al = { ...alimentos, guaca: { ...alimentos.guaca, envase: { g: 200, diasAbierto: 30 } } }
  const e2 = analizarEnvases(al, menu(7, { 0: [['guaca', 50]] }))[0]
  expect(e2.sobran).toBeCloseTo(0)
  expect(e2.envases).toBeCloseTo(0.25)
  expect(e2.usosPorEnvase).toBe(5) // lunes 0,7,14,21,28 caen en 30 días
})

test('comidas libres no cuentan y alimentos sin envase no salen', () => {
  const r = analizarEnvases(alimentos, menu(7, { 0: [['guaca', 100], ['arroz', 80]], 4: [['guaca', 100]] }, [4]))
  expect(r.map(e => e.alimentoId)).toEqual(['guaca'])
  expect(r[0].usos).toBe(1)
})

test('alimento por unidades: 3 yogures por semana de un pack de 4 que dura 30 días no tira nada', () => {
  const e = analizarEnvases(alimentos, menu(7, { 0: [['yogur', 1]], 2: [['yogur', 1]], 4: [['yogur', 1]] }))[0]
  expect(e.sobran).toBeCloseTo(0)
  expect(e.envases).toBeCloseTo(0.75)
})

test('alimento por unidades: sugerencias en unidades', () => {
  const al = { ...alimentos, yogur: { ...alimentos.yogur, envase: { g: 500, diasAbierto: 7 } } }
  const e = analizarEnvases(al, menu(7, { 0: [['yogur', 1]] }))[0]
  expect(e.sobran).toBeCloseTo(375)
  expect(e.sugerencias).toEqual([{ cantidad: 4, usos: 1 }, { cantidad: 2, usos: 2 }])
})

test('lista de la compra', () => {
  const l = listaCompra(alimentos, menu(7, { 0: [['guaca', 60], ['arroz', 80]], 2: [['arroz', 100], ['yogur', 2]] }))
  expect(l).toEqual([
    { alimentoId: 'arroz', gramos: 180, cantidad: 180 },
    { alimentoId: 'guaca', gramos: 60, cantidad: 60, envases: 1, sobran: expect.closeTo(140) },
    { alimentoId: 'yogur', gramos: 250, cantidad: 2, envases: 1, sobran: 0 },
  ])
})
