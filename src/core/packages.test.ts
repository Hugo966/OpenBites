import { expect, test } from 'vitest'
import { analyzePackages, shoppingList } from './packages'
import type { FoodMap, Menu } from './types'

const foods: FoodMap = {
  guac: { id: 'guac', name: 'Guacamole', package: { grams: 200, daysOpen: 7 }, per100: { kcal: 190, protein: 2, carbs: 5, fat: 17 } },
  yogurt: { id: 'yogurt', name: 'Yogurt', gramsPerUnit: 125, package: { grams: 500, daysOpen: 30 }, per100: { kcal: 60, protein: 10, carbs: 4, fat: 0 } },
  rice: { id: 'rice', name: 'Rice', per100: { kcal: 350, protein: 7, carbs: 78, fat: 1 } },
}

// Menu of n days with a single meal; uses: day → items
function menu(n: number, uses: Record<number, [string, number][]>, freeDays: number[] = []): Menu {
  return {
    id: 'm', name: 'm', mealNames: ['Lunch'],
    days: Array.from({ length: n }, (_, d) => ({
      name: `D${d}`,
      meals: [{ free: freeDays.includes(d) || undefined, items: (uses[d] ?? []).map(([foodId, amount]) => ({ foodId, amount })) }],
    })),
  }
}
const guac = (m: Menu) => analyzePackages(foods, m).find(p => p.foodId === 'guac')!

test('guacamole 60 g once a week: 140 g wasted, suggests 200 g or 100 g ×2', () => {
  const p = guac(menu(7, { 0: [['guac', 60]] }))
  expect(p.packages).toBeCloseTo(1)
  expect(p.wasted).toBeCloseTo(140)
  expect(p.usesPerPackage).toBe(1)
  expect(p.suggestions).toEqual([{ amount: 200, uses: 1 }, { amount: 100, uses: 2 }])
})

test('100 g on Monday and Thursday: fits', () => {
  const p = guac(menu(7, { 0: [['guac', 100]], 3: [['guac', 100]] }))
  expect(p.wasted).toBeCloseTo(0)
  expect(p.packages).toBeCloseTo(1)
  expect(p.usesPerPackage).toBe(2)
})

test('expires before the second use: two packages, half of each wasted', () => {
  const fm = { ...foods, guac: { ...foods.guac, package: { grams: 200, daysOpen: 3 } } }
  const p = analyzePackages(fm, menu(7, { 0: [['guac', 100]], 4: [['guac', 100]] }))[0]
  expect(p.packages).toBeCloseTo(2)
  expect(p.wasted).toBeCloseTo(200)
})

test('shelf life spans menu cycles', () => {
  const p = guac(menu(7, { 0: [['guac', 50]] }))
  expect(p.wasted).toBeCloseTo(150) // with 7 days of shelf life the rest is thrown away every week
  const fm = { ...foods, guac: { ...foods.guac, package: { grams: 200, daysOpen: 30 } } }
  const p2 = analyzePackages(fm, menu(7, { 0: [['guac', 50]] }))[0]
  expect(p2.wasted).toBeCloseTo(0)
  expect(p2.packages).toBeCloseTo(0.25)
  expect(p2.usesPerPackage).toBe(5) // Mondays 0,7,14,21,28 fall within 30 days
})

test('free meals do not count and foods without a package are not listed', () => {
  const r = analyzePackages(foods, menu(7, { 0: [['guac', 100], ['rice', 80]], 4: [['guac', 100]] }, [4]))
  expect(r.map(p => p.foodId)).toEqual(['guac'])
  expect(r[0].uses).toBe(1)
})

test('unit-based food: 3 yogurts a week from a 4-pack lasting 30 days wastes nothing', () => {
  const p = analyzePackages(foods, menu(7, { 0: [['yogurt', 1]], 2: [['yogurt', 1]], 4: [['yogurt', 1]] }))[0]
  expect(p.wasted).toBeCloseTo(0)
  expect(p.packages).toBeCloseTo(0.75)
})

test('unit-based food: suggestions in units', () => {
  const fm = { ...foods, yogurt: { ...foods.yogurt, package: { grams: 500, daysOpen: 7 } } }
  const p = analyzePackages(fm, menu(7, { 0: [['yogurt', 1]] }))[0]
  expect(p.wasted).toBeCloseTo(375)
  expect(p.suggestions).toEqual([{ amount: 4, uses: 1 }, { amount: 2, uses: 2 }])
})

test('shopping list', () => {
  const l = shoppingList(foods, menu(7, { 0: [['guac', 60], ['rice', 80]], 2: [['rice', 100], ['yogurt', 2]] }))
  expect(l).toEqual([
    { foodId: 'guac', grams: 60, amount: 60, packages: 1, wasted: expect.closeTo(140) },
    { foodId: 'rice', grams: 180, amount: 180 },
    { foodId: 'yogurt', grams: 250, amount: 2, packages: 1, wasted: 0 },
  ])
})
