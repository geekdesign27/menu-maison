import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { daysBetween, formatDayShort } from "../../../convex/domain/dates";
import { recipeCost } from "../../../convex/domain/shopping";
import { lastEatenBefore, type MealLite } from "../../../convex/domain/stats";
import { useBase, useSession } from "../../lib/session";
import { useStoreChoice, useWeek } from "../../lib/week";

export type Slot = "midi" | "soir";

export const SLOT_LABEL: Record<Slot, string> = { midi: "Midi", soir: "Soir" };

/** What a planned meal is made of: a recipe or a free title. */
export type MealChoice = { recipeId: Id<"recipes"> } | { title: string };

export function useRecipes() {
  const { token } = useSession();
  return useQuery(api.recipes.list, token ? { token } : "skip");
}

export type RecipeRow = NonNullable<ReturnType<typeof useRecipes>>[number];

export function useOverview() {
  const { token } = useSession();
  const { today } = useWeek();
  return useQuery(api.stats.overview, token ? { token, today } : "skip");
}

export function useWeekMeals(start: string) {
  const { token } = useSession();
  return useQuery(api.meals.week, token ? { token, start } : "skip");
}

export type WeekMeal = NonNullable<ReturnType<typeof useWeekMeals>>[number];

/** Cost helpers bound to the ingredient catalog and the store chosen on this phone. */
export function usePricing() {
  const base = useBase();
  const { store } = useStoreChoice();
  const ingredients = useMemo(
    () => Object.fromEntries((base?.ingredients ?? []).map((i) => [i._id, i])),
    [base],
  );
  const priceFactor = store?.priceFactor ?? 1;
  return useMemo(
    () => ({
      ready: !!base,
      cost: (recipe: Pick<RecipeRow, "items">, persons: number) =>
        recipeCost(recipe, persons, ingredients, priceFactor),
    }),
    [base, ingredients, priceFactor],
  );
}

/**
 * Warning shown before planning a dish again, or null:
 * « mangé il y a 3 jours », « prévu le sam. 31 ».
 */
export function repeatWarning(
  meals: MealLite[] | undefined,
  recipeId: string,
  date: string,
  today: string,
): string | null {
  if (!meals) return null;
  const last = lastEatenBefore(meals, recipeId, date);
  if (!last) return null;
  if (last < today) {
    const n = daysBetween(last, today);
    return n === 1 ? "mangé hier" : `mangé il y a ${n} jours`;
  }
  if (last === today) return "prévu aujourd'hui";
  return `prévu le ${formatDayShort(last)}`;
}

/** Lowercase without accents, for forgiving search. */
export function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/** « Samedi 24 octobre » from « samedi 24 octobre ». */
export function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
