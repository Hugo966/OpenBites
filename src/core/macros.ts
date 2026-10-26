import type { Day, Food, FoodMap, Item, Macros, Meal, Menu } from './types'

export const ZERO: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 }
export const MACROS = ['kcal', 'protein', 'carbs', 'fat'] as const
export const MEAL_TOLERANCE: Macros = { kcal: 5, protein: 2, carbs: 2, fat: 2 }
export const DAY_TOLERANCE: Macros = { kcal: 20, protein: 5, carbs: 5, fat: 5 }

const combine = (a: Macros, b: Macros, f: (x: number, y: number) => number): Macros =>
  ({ kcal: f(a.kcal, b.kcal), protein: f(a.protein, b.protein), carbs: f(a.carbs, b.carbs), fat: f(a.fat, b.fat) })

export const add = (a: Macros, b: Macros) => combine(a, b, (x, y) => x + y)
export const subtract = (a: Macros, b: Macros) => combine(a, b, (x, y) => x - y)

export const grams = (f: Food, amount: number) => (f.gramsPerUnit ? amount * f.gramsPerUnit : amount)

export function macrosOf(f: Food, amount: number): Macros {
  const k = grams(f, amount) / 100
  return { kcal: f.per100.kcal * k, protein: f.per100.protein * k, carbs: f.per100.carbs * k, fat: f.per100.fat * k }
}

export function itemMacros(foods: FoodMap, item: Item): Macros {
  const f = foods[item.foodId]
  return f ? macrosOf(f, item.amount) : ZERO // deleted food: counts as nothing
}

export const itemsTotal = (foods: FoodMap, items: Item[]) =>
  items.reduce((t, i) => add(t, itemMacros(foods, i)), ZERO)

export const mealTotal = (foods: FoodMap, m: Meal) => (m.free ? ZERO : itemsTotal(foods, m.items))

export const dayTotal = (foods: FoodMap, d: Day) =>
  d.meals.reduce((t, m) => add(t, mealTotal(foods, m)), ZERO)

export const menuTotal = (foods: FoodMap, m: Menu) =>
  m.days.reduce((t, d) => add(t, dayTotal(foods, d)), ZERO)

// A day with a free meal is not compared against its goal
export const isFreeDay = (d: Day) => d.meals.some(m => m.free)

export const withinTolerance = (actual: Macros, goal: Macros, tolerance: Macros) =>
  MACROS.every(k => Math.abs(actual[k] - goal[k]) <= tolerance[k])
