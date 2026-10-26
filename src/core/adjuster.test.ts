import { expect, test } from 'vitest'
import { adjust, apply } from './adjuster'
import { MEAL_TOLERANCE, itemsTotal } from './macros'
import type { FoodMap, Item } from './types'

const foods: FoodMap = {
  rice: { id: 'rice', name: 'Rice', per100: { kcal: 350, protein: 7, carbs: 78, fat: 1 } },
  chicken: { id: 'chicken', name: 'Chicken', per100: { kcal: 110, protein: 23, carbs: 0, fat: 1.5 } },
  oil: { id: 'oil', name: 'Olive oil', maxGrams: 20, per100: { kcal: 884, protein: 0, carbs: 0, fat: 100 } },
  egg: { id: 'egg', name: 'Egg', gramsPerUnit: 60, per100: { kcal: 150, protein: 12.5, carbs: 1, fat: 10 } },
  tuna: { id: 'tuna', name: 'Tuna', per100: { kcal: 110, protein: 25, carbs: 0, fat: 1 } },
}
const meal: Item[] = [
  { foodId: 'rice', amount: 80 },
  { foodId: 'chicken', amount: 150 },
  { foodId: 'oil', amount: 10 },
]

const amounts = (o: { changes: { foodId: string; to: number }[] }) =>
  Object.fromEntries(o.changes.map(c => [c.foodId, c.to]))

test('one macro: the best option is a single change within tolerance', () => {
  const [best, ...rest] = adjust(foods, meal, { target: { protein: 20 } })
  expect(best.within).toBe(true)
  expect(best.changes).toHaveLength(1)
  expect(Math.abs(best.delta.protein - 20)).toBeLessThanOrEqual(MEAL_TOLERANCE.protein)
  expect(rest.length).toBe(4)
})

test('several macros: +15 g protein without raising kcal', () => {
  const options = adjust(foods, meal, { target: { protein: 15, kcal: 0 }, tolerance: { kcal: 20, protein: 3, carbs: 2, fat: 2 } })
  const best = options[0]
  expect(best.within).toBe(true)
  expect(Math.abs(best.delta.kcal)).toBeLessThanOrEqual(20)
  // the delta matches applying the option
  const before = itemsTotal(foods, meal), after = itemsTotal(foods, apply(meal, best))
  expect(after.protein - before.protein).toBeCloseTo(best.delta.protein)
})

test('amounts: 5 g steps, whole units, limits', () => {
  const options = adjust(foods, meal, { target: { protein: 12, fat: 10 }, limit: 50 })
  for (const o of options) for (const c of o.changes) {
    const f = foods[c.foodId]
    expect(c.to % (f.gramsPerUnit ? 1 : 5)).toBe(0)
    if (f.maxGrams) expect(c.to).toBeLessThanOrEqual(f.maxGrams)
  }
})

test('remove: -88.4 kcal = drop the oil', () => {
  const [best] = adjust(foods, meal, { target: { kcal: -88.4 } })
  expect(best.changes).toEqual([{ foodId: 'oil', from: 10, to: 0 }])
})

test('exclusions: per request and never-suggest', () => {
  const options = adjust(foods, meal, { target: { protein: 20 }, exclude: ['chicken'], limit: 100 })
  expect(options.length).toBeGreaterThan(0)
  expect(options.every(o => o.changes.every(c => c.foodId !== 'chicken'))).toBe(true)

  const noTuna = { ...foods, tuna: { ...foods.tuna, neverSuggest: true } }
  const options2 = adjust(noTuna, meal, { target: { protein: 20 }, limit: 100 })
  expect(options2.every(o => o.changes.every(c => c.foodId !== 'tuna'))).toBe(true)
  // never-suggest doesn't prevent adjusting it when it's already in the meal
  const withTuna = [...meal, { foodId: 'tuna', amount: 50 }]
  expect(adjust(noTuna, withTuna, { target: { protein: 20 }, limit: 100 }).some(o => amounts(o).tuna)).toBe(true)
})

test('swap: remove one food and add another', () => {
  const fm: FoodMap = {
    x: { id: 'x', name: 'X', per100: { kcal: 100, protein: 10, carbs: 0, fat: 0 } },
    y: { id: 'y', name: 'Y', per100: { kcal: 100, protein: 0, carbs: 10, fat: 0 } },
  }
  const options = adjust(fm, [{ foodId: 'y', amount: 100 }], { target: { protein: 10, carbs: -10 } })
  expect(options[0].within).toBe(true)
  const swap = options.find(o => amounts(o).x === 100 && amounts(o).y === 0)!
  expect(swap).toBeDefined()
  expect(apply([{ foodId: 'y', amount: 100 }], swap)).toEqual([{ foodId: 'x', amount: 100 }])
})

test('among options within tolerance, the smallest edit wins over a huge one', () => {
  const fm: FoodMap = {
    ...foods,
    milk: { id: 'milk', name: 'Milk', per100: { kcal: 46, protein: 3.2, carbs: 4.7, fat: 1.6 } },
    turkey: { id: 'turkey', name: 'Turkey', per100: { kcal: 105, protein: 22, carbs: 1, fat: 1.5 } },
  }
  const lunch: Item[] = [{ foodId: 'rice', amount: 145 }, { foodId: 'chicken', amount: 170 }, { foodId: 'oil', amount: 15 }]
  const options = adjust(fm, lunch, { target: { kcal: 0, protein: 20 } })
  const moved = (o: (typeof options)[number]) => o.changes.reduce((s, c) => s + Math.abs(c.to - c.from), 0)
  expect(options[0].within).toBe(true)
  expect(moved(options[0])).toBeLessThan(300) // never "+875 g milk"
  for (let i = 1; i < options.length; i++)
    if (options[i].within && options[i].changes.length === options[0].changes.length) expect(moved(options[i])).toBeGreaterThanOrEqual(moved(options[0]))
})

test('no fixed macros, no options', () => {
  expect(adjust(foods, meal, { target: {} })).toEqual([])
})
