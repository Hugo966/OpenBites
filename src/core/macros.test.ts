import { expect, test } from 'vitest'
import { dentroMargen, diaLibre, MARGEN_DIA, totalDia, totalMenu } from './macros'
import type { Alimentos, Dia } from './types'

const alimentos: Alimentos = {
  arroz: { id: 'arroz', nombre: 'Arroz', por100: { kcal: 350, p: 7, hc: 78, g: 1 } },
  huevo: { id: 'huevo', nombre: 'Huevo', gUnidad: 60, por100: { kcal: 150, p: 12.5, hc: 1, g: 10 } },
}

const lunes: Dia = {
  nombre: 'Lunes',
  comidas: [
    { nombre: 'Desayuno', items: [{ alimentoId: 'huevo', cantidad: 2 }] }, // 120 g
    { nombre: 'Comida', items: [{ alimentoId: 'arroz', cantidad: 100 }] },
  ],
}
const viernes: Dia = {
  nombre: 'Viernes',
  comidas: [
    { nombre: 'Comida', items: [{ alimentoId: 'arroz', cantidad: 50 }] },
    { nombre: 'Cena', libre: true, items: [{ alimentoId: 'arroz', cantidad: 500 }] },
  ],
}

test('totales con unidades y comidas libres', () => {
  expect(totalDia(alimentos, lunes)).toEqual({ kcal: 530, p: 22, hc: 79.2, g: 13 })
  expect(totalDia(alimentos, viernes).kcal).toBe(175)
  expect(totalMenu(alimentos, { id: 'm', nombre: 'm', dias: [lunes, viernes] }).kcal).toBe(705)
  expect(diaLibre(viernes)).toBe(true)
  expect(diaLibre(lunes)).toBe(false)
})

test('margen diario ±20 kcal / ±5 g', () => {
  const obj = { kcal: 2000, p: 150, hc: 200, g: 60 }
  expect(dentroMargen({ kcal: 2020, p: 145, hc: 205, g: 60 }, obj, MARGEN_DIA)).toBe(true)
  expect(dentroMargen({ kcal: 2021, p: 150, hc: 200, g: 60 }, obj, MARGEN_DIA)).toBe(false)
  expect(dentroMargen({ kcal: 2000, p: 150, hc: 200, g: 54 }, obj, MARGEN_DIA)).toBe(false)
})

test('alimento desconocido lanza error', () => {
  expect(() => totalDia(alimentos, { nombre: 'x', comidas: [{ nombre: 'c', items: [{ alimentoId: 'nope', cantidad: 1 }] }] })).toThrow()
})
