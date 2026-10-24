import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
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

/**
 * Moves a usual item to another aisle (null = « Divers »). Its entries on the lists
 * from `start` onwards follow, so this week's list reorders right away.
 */
export const setAisle = mutation({
  args: { token: v.string(), id: v.id("staples"), aisleId: v.union(v.id("aisles"), v.null()), start: v.string() },
  handler: async (ctx, { token, id, aisleId, start }) => {
    await assertSession(ctx, token);
    assertDate(start);
    const staple = await ctx.db.get(id);
    if (!staple) throw new ConvexError("Article introuvable.");
    await ctx.db.patch(id, { aisleId: aisleId ?? undefined });
    const extras = await ctx.db
      .query("shoppingExtras")
      .withIndex("by_period", (q) => q.gte("periodStart", start))
      .collect();
    for (const e of extras) {
      if (e.stapleId === id) await ctx.db.patch(e._id, { aisleId: aisleId ?? undefined });
    }
  },
});
