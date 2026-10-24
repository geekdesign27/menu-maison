import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { daysBetween, formatDayShort } from "../../../convex/domain/dates";
import { lastEatenBefore, type MealLite } from "../../../convex/domain/stats";
import { useSession } from "../../lib/session";

export type Slot = "matin" | "midi" | "soir";

export const SLOT_LABEL: Record<Slot, string> = { matin: "Matin", midi: "Midi", soir: "Soir" };
/** Order of the day: breakfast, lunch, dinner. */
export const SLOTS: Slot[] = ["matin", "midi", "soir"];

/** What a planned meal is made of: a recipe or a free title. */
export type MealChoice =
  | { recipeId: Id<"recipes"> }
  | { title: string }
  // Spare portions of a dish already cooked (or cooked before that day)
  | { leftoverOf: Id<"meals">; available: number; name: string; emoji: string; until: string };

export function useWeekMeals(start: string) {
  const { token } = useSession();
  return useQuery(api.meals.week, token ? { token, start } : "skip");
}

export type WeekMeal = NonNullable<ReturnType<typeof useWeekMeals>>[number];

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

/** « Samedi 24 octobre » from « samedi 24 octobre ». */
export function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
