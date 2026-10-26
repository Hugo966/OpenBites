export type Macros = { kcal: number; protein: number; carbs: number; fat: number }

export type Food = {
  id: string
  name: string
  per100: Macros
  gramsPerUnit?: number // when set, amounts of this food are in units instead of grams
  package?: { grams: number; daysOpen: number }
  neverSuggest?: boolean
  minGrams?: number
  maxGrams?: number
}

// amount: units if the food has gramsPerUnit, grams otherwise
export type Item = { foodId: string; amount: number }

// Adding a dish to a meal copies its items (they can be edited afterwards)
export type Dish = { id: string; name: string; items: Item[] }

export type DayType = { id: string; name: string; goal: Macros }

// Grid: menu.mealNames are the rows (Breakfast, Lunch…); every day has one meal per row, same index.
// An empty meal = that day doesn't have that meal.
export type Meal = { free?: boolean; items: Item[] }
export type Day = { name: string; dayTypeId?: string; meals: Meal[] }
export type Menu = { id: string; name: string; mealNames: string[]; days: Day[] }

export type FoodMap = Record<string, Food>
