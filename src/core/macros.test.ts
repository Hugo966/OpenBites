import { expect, test } from 'vitest'
import { DAY_TOLERANCE, dayTotal, isFreeDay, menuTotal, withinTolerance } from './macros'
import type { Day, FoodMap } from './types'

const foods: FoodMap = {
  rice: { id: 'rice', name: 'Rice', per100: { kcal: 350, protein: 7, carbs: 78, fat: 1 } },
  egg: { id: 'egg', name: 'Egg', gramsPerUnit: 60, per100: { kcal: 150, protein: 12.5, carbs: 1, fat: 10 } },
}

const monday: Day = {
  name: 'Monday',
  meals: [
    { items: [{ foodId: 'egg', amount: 2 }] }, // 120 g
    { items: [{ foodId: 'rice', amount: 100 }] },
  ],
}
const friday: Day = {
  name: 'Friday',
  meals: [
    { items: [{ foodId: 'rice', amount: 50 }] },
    { free: true, items: [{ foodId: 'rice', amount: 500 }] },
  ],
}

test('totals with units and free meals', () => {
  expect(dayTotal(foods, monday)).toEqual({ kcal: 530, protein: 22, carbs: 79.2, fat: 13 })
  expect(dayTotal(foods, friday).kcal).toBe(175)
  expect(menuTotal(foods, { id: 'm', name: 'm', mealNames: ['A', 'B'], days: [monday, friday] }).kcal).toBe(705)
  expect(isFreeDay(friday)).toBe(true)
  expect(isFreeDay(monday)).toBe(false)
})

test('daily tolerance ±20 kcal / ±5 g', () => {
  const goal = { kcal: 2000, protein: 150, carbs: 200, fat: 60 }
  expect(withinTolerance({ kcal: 2020, protein: 145, carbs: 205, fat: 60 }, goal, DAY_TOLERANCE)).toBe(true)
  expect(withinTolerance({ kcal: 2021, protein: 150, carbs: 200, fat: 60 }, goal, DAY_TOLERANCE)).toBe(false)
  expect(withinTolerance({ kcal: 2000, protein: 150, carbs: 200, fat: 54 }, goal, DAY_TOLERANCE)).toBe(false)
})

test('a deleted food counts as zero', () => {
  expect(dayTotal(foods, { name: 'x', meals: [{ items: [{ foodId: 'nope', amount: 1 }] }] })).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0 })
})
