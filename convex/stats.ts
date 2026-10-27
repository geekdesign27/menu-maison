import { query } from "./_generated/server";
import { v } from "convex/values";
import { assertDate, requireMember } from "./lib";
import { addDays } from "./domain/dates";
import { recipeStats } from "./domain/stats";

/**
 * History used by the stats screen and by the "already eaten recently" warning:
 * light meal rows from 180 days back to 60 days ahead, plus per-recipe counts.
 */
export const overview = query({
  args: { token: v.string(), today: v.string() },
  handler: async (ctx, { token, today }) => {
    const { db } = await requireMember(ctx, token);
    assertDate(today);
    const meals = await db.index("meals", "by_family_date", (q) =>
        q.gte("date", addDays(today, -180)).lte("date", addDays(today, 60)),
      )
      .collect();
    const lite = meals.map((m) => ({
      recipeId: m.recipeId,
      date: m.date,
      cookedOn: m.cookedOn,
      status: m.status,
      fromLeftoverOf: m.fromLeftoverOf,
    }));
    return { meals: lite, stats: recipeStats(lite, today) };
  },
});
