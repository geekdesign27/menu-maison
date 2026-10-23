import { query } from "./_generated/server";
import { v } from "convex/values";
import { assertDate, assertSession } from "./lib";
import { addDays } from "./domain/dates";
import { recipeStats } from "./domain/stats";

/**
 * History used by the stats screen and by the "already eaten recently" warning:
 * light meal rows from 180 days back to 60 days ahead, plus per-recipe counts.
 */
export const overview = query({
  args: { token: v.string(), today: v.string() },
  handler: async (ctx, { token, today }) => {
    await assertSession(ctx, token);
    assertDate(today);
    const meals = await ctx.db
      .query("meals")
      .withIndex("by_date", (q) =>
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
