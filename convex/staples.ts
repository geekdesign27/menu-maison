import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { assertDate, assertSession } from "./lib";

/** The usual items, most bought first, with the extra id when already on this week's list. */
export const list = query({
  args: { token: v.string(), start: v.string() },
  handler: async (ctx, { token, start }) => {
    await assertSession(ctx, token);
    assertDate(start);
    const [staples, extras] = await Promise.all([
      ctx.db.query("staples").collect(),
      ctx.db
        .query("shoppingExtras")
        .withIndex("by_period", (q) => q.eq("periodStart", start))
        .collect(),
    ]);
    const added = new Map(
      extras.filter((e) => e.stapleId).map((e) => [e.stapleId, e._id]),
    );
    return staples
      .map((s) => ({ ...s, extraId: added.get(s._id) ?? null }))
      .sort(
        (a, b) => b.useCount - a.useCount || a.name.localeCompare(b.name, "fr"),
      );
  },
});

/** Removes an item from the usual items (this week's list keeps it). */
export const remove = mutation({
  args: { token: v.string(), id: v.id("staples") },
  handler: async (ctx, { token, id }) => {
    await assertSession(ctx, token);
    await ctx.db.delete(id);
  },
});
