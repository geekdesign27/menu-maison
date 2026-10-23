// Recipe frequency statistics, repetition alerts and forgotten dishes.
import { addDays, daysBetween } from "./dates";

export interface MealLite {
  recipeId?: string;
  date: string;
  cookedOn: string;
  status: "prévu" | "mangé" | "pas mangé";
  fromLeftoverOf?: string;
}

export interface RecipeStat {
  recipeId: string;
  count4w: number;
  count12w: number;
  countAll: number;
  lastDate: string;
}

// Meals that count as a real serving of a dish.
function isServed(meal: MealLite): meal is MealLite & { recipeId: string } {
  return !!meal.recipeId && meal.status !== "pas mangé" && !meal.fromLeftoverOf;
}

/**
 * One count per cooking: meals sharing (recipeId, cookedOn) are a single dish
 * (tonight + tomorrow lunch). A cooking is dated by `cookedOn`.
 */
export function recipeStats(meals: MealLite[], today: string): RecipeStat[] {
  const cookings = new Map<string, Set<string>>(); // recipeId → cookedOn dates
  for (const meal of meals) {
    if (!isServed(meal) || meal.date > today) continue;
    const dates = cookings.get(meal.recipeId) ?? new Set<string>();
    dates.add(meal.cookedOn);
    cookings.set(meal.recipeId, dates);
  }

  const stats: RecipeStat[] = [];
  for (const [recipeId, dates] of cookings) {
    let count4w = 0;
    let count12w = 0;
    let lastDate = "";
    for (const date of dates) {
      const age = daysBetween(date, today);
      if (age >= 0 && age < 28) count4w++;
      if (age >= 0 && age < 84) count12w++;
      if (date > lastDate) lastDate = date;
    }
    stats.push({ recipeId, count4w, count12w, countAll: dates.size, lastDate });
  }

  return stats.sort(
    (a, b) =>
      b.countAll - a.countAll ||
      b.lastDate.localeCompare(a.lastDate) ||
      a.recipeId.localeCompare(b.recipeId),
  );
}

/**
 * Most recent date (eaten or planned) of `recipeId` within `windowDays` around
 * `date`, the date itself excluded. Used to warn before planning a repeat.
 */
export function lastEatenBefore(
  meals: MealLite[],
  recipeId: string,
  date: string,
  windowDays = 7,
): string | null {
  const from = addDays(date, -windowDays);
  const to = addDays(date, windowDays);
  let latest: string | null = null;
  for (const meal of meals) {
    if (!isServed(meal) || meal.recipeId !== recipeId) continue;
    if (meal.date === date || meal.date < from || meal.date > to) continue;
    if (latest === null || meal.date > latest) latest = meal.date;
  }
  return latest;
}

/** Recipes never eaten or not eaten for `days` days: never eaten first, then oldest first. */
export function forgottenRecipes(
  recipeIds: string[],
  stats: RecipeStat[],
  today: string,
  days = 30,
): string[] {
  const lastById = new Map(stats.map((s) => [s.recipeId, s.lastDate]));
  const limit = addDays(today, -days);
  const never = recipeIds.filter((id) => !lastById.has(id));
  const old = recipeIds
    .filter((id) => {
      const last = lastById.get(id);
      return last !== undefined && last < limit;
    })
    .sort((a, b) =>
      (lastById.get(a) ?? "").localeCompare(lastById.get(b) ?? ""),
    );
  return [...never, ...old];
}
