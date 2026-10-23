// Fridge status of a cooked dish.
import { addDays, daysBetween } from "./dates";

export type LeftoverState = "bon" | "aujourd'hui" | "périmé";

export function leftoverStatus(
  cookedOn: string,
  fridgeDays: number,
  today: string,
): { until: string; daysLeft: number; state: LeftoverState } {
  const until = addDays(cookedOn, fridgeDays);
  const daysLeft = daysBetween(today, until);
  const state: LeftoverState =
    daysLeft > 0 ? "bon" : daysLeft === 0 ? "aujourd'hui" : "périmé";
  return { until, daysLeft, state };
}
