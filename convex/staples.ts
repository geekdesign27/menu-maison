import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { assertDate, assertPositive, assertSession, cleanText } from "./lib";
import { chainValidator } from "./schema";

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
    const added = new Map(extras.filter((e) => e.stapleId).map((e) => [e.stapleId, e]));
    return staples
      .map((s) => {
        const extra = added.get(s._id);
        return { ...s, extraId: extra?._id ?? null, extraQty: extra?.qty ?? null };
      })
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

/** Edits a usual item: name, aisle, price of one item, chains selling it, usual quantity. */
export const update = mutation({
  args: {
    token: v.string(),
    id: v.id("staples"),
    name: v.string(),
    aisleId: v.union(v.id("aisles"), v.null()),
    priceChf: v.union(v.number(), v.null()),
    onlyChains: v.array(chainValidator),
    qty: v.union(v.number(), v.null()),
  },
  handler: async (ctx, { token, id, name, aisleId, priceChf, onlyChains, qty }) => {
    await assertSession(ctx, token);
    const clean = cleanText(name, 80, "Article");
    if (!clean) throw new ConvexError("Le nom de l'article est obligatoire.");
    if (priceChf !== null) assertPositive(priceChf, 10000, "Prix");
    if (qty !== null) assertPositive(qty, 1000, "Quantité");
    if (!(await ctx.db.get(id))) throw new ConvexError("Article introuvable.");
    await ctx.db.patch(id, {
      name: clean,
      aisleId: aisleId ?? undefined,
      priceChf: priceChf ?? undefined,
      onlyChains: onlyChains.length ? onlyChains : undefined,
      qty: qty ?? undefined,
      unit: qty !== null ? "pc" : undefined,
    });
  },
});
