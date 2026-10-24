import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { assertDate, assertPositive, assertSession, cleanText } from "./lib";
import { unitValidator } from "./schema";
import { addDays } from "./domain/dates";
import { buildShoppingList } from "./domain/shopping";

/** Shopping list of the planning week starting at `start`, ordered for the chosen store. */
export const list = query({
  args: {
    token: v.string(),
    start: v.string(),
    storeId: v.optional(v.id("stores")),
  },
  handler: async (ctx, { token, start, storeId }) => {
    await assertSession(ctx, token);
    assertDate(start);
    const end = addDays(start, 6);
    const [eaten, ingredients, aisles, extras, checks, skips] = await Promise.all([
      // One extra day: next week's first lunch may be cooked on this week's last evening
      ctx.db
        .query("meals")
        .withIndex("by_date", (q) => q.gte("date", start).lte("date", addDays(start, 7)))
        .collect(),
      ctx.db.query("ingredients").collect(),
      ctx.db.query("aisles").collect(),
      ctx.db
        .query("shoppingExtras")
        .withIndex("by_period", (q) => q.eq("periodStart", start))
        .collect(),
      ctx.db
        .query("shoppingChecks")
        .withIndex("by_period", (q) => q.eq("periodStart", start))
        .collect(),
      ctx.db
        .query("stockSkips")
        .withIndex("by_period", (q) => q.eq("periodStart", start))
        .collect(),
    ]);
    const meals = eaten.filter((m) => m.cookedOn >= start && m.cookedOn <= end);
    const store = storeId ? await ctx.db.get(storeId) : null;

    const recipes: Parameters<typeof buildShoppingList>[0]["recipes"] = {};
    for (const id of new Set(
      meals.map((m) => m.recipeId).filter((x) => x !== undefined),
    )) {
      const r = await ctx.db.get(id);
      if (r) recipes[r._id] = { name: r.name, items: r.items };
    }

    const list = buildShoppingList({
      meals: meals.map((m) => ({
        _id: m._id,
        recipeId: m.recipeId,
        persons: m.persons,
        fromLeftoverOf: m.fromLeftoverOf,
        cookedOn: m.cookedOn,
      })),
      period: { start, end },
      recipes,
      ingredients: Object.fromEntries(ingredients.map((i) => [i._id, i])),
      aisles,
      store: store && {
        aisleOrder: store.aisleOrder,
        overrides: store.overrides,
        priceFactor: store.priceFactor,
      },
      extras,
      checks: Object.fromEntries(checks.map((c) => [c.itemKey, c.checked])),
      skipped: skips.map((s) => s.itemKey),
    });
    const checkedBy = Object.fromEntries(
      checks.filter((c) => c.checked).map((c) => [c.itemKey, c.checkedBy]),
    );
    return {
      ...list,
      checkedBy,
      mealCount: meals.filter((m) => m.recipeId && !m.fromLeftoverOf).length,
    };
  },
});

export const toggle = mutation({
  args: {
    token: v.string(),
    start: v.string(),
    itemKey: v.string(),
    checked: v.boolean(),
    memberId: v.optional(v.id("members")),
  },
  handler: async (ctx, { token, start, itemKey, checked, memberId }) => {
    await assertSession(ctx, token);
    assertDate(start);
    if (itemKey.length > 120) throw new ConvexError("Article invalide.");
    const existing = (
      await ctx.db
        .query("shoppingChecks")
        .withIndex("by_period", (q) => q.eq("periodStart", start))
        .collect()
    ).find((c) => c.itemKey === itemKey);
    const data = {
      checked,
      checkedBy: checked ? memberId : undefined,
      checkedAt: checked ? Date.now() : undefined,
    };
    if (existing) await ctx.db.patch(existing._id, data);
    else
      await ctx.db.insert("shoppingChecks", {
        periodStart: start,
        itemKey,
        ...data,
      });
  },
});

export const resetChecks = mutation({
  args: { token: v.string(), start: v.string() },
  handler: async (ctx, { token, start }) => {
    await assertSession(ctx, token);
    assertDate(start);
    const checks = await ctx.db
      .query("shoppingChecks")
      .withIndex("by_period", (q) => q.eq("periodStart", start))
      .collect();
    for (const c of checks) await ctx.db.delete(c._id);
  },
});

/**
 * Adds a free item to the week. Usual items are remembered: picking one reuses its
 * aisle, and a new label becomes a usual item for next time.
 */
export const addExtra = mutation({
  args: {
    token: v.string(),
    start: v.string(),
    label: v.string(),
    qty: v.optional(v.number()),
    unit: v.optional(unitValidator),
    aisleId: v.optional(v.id("aisles")),
    memberId: v.optional(v.id("members")),
    stapleId: v.optional(v.id("staples")),
  },
  handler: async (ctx, { token, start, label, memberId, stapleId, ...rest }) => {
    await assertSession(ctx, token);
    assertDate(start);
    label = cleanText(label, 80, "Article");
    if (rest.qty !== undefined) assertPositive(rest.qty, 100000, "Quantité");

    let staple = stapleId ? await ctx.db.get(stapleId) : null;
    if (!staple) {
      if (!label) throw new ConvexError("Écris ce qu'il faut acheter.");
      // Same name typed again: reuse the usual item instead of creating a twin
      const all = await ctx.db.query("staples").collect();
      const key = label.toLocaleLowerCase("fr");
      staple = all.find((s) => s.name.toLocaleLowerCase("fr") === key) ?? null;
      if (!staple) {
        const id = await ctx.db.insert("staples", { name: label, aisleId: rest.aisleId, useCount: 0 });
        staple = await ctx.db.get(id);
      }
    }
    if (!staple) throw new ConvexError("Article introuvable.");

    // Already on this week's list: tapping it twice must not add a duplicate
    const existing = (
      await ctx.db
        .query("shoppingExtras")
        .withIndex("by_period", (q) => q.eq("periodStart", start))
        .collect()
    ).find((e) => e.stapleId === staple._id);
    if (existing) return existing._id;

    await ctx.db.patch(staple._id, {
      useCount: staple.useCount + 1,
      lastUsedAt: Date.now(),
      // A chosen aisle teaches the usual item where it belongs
      ...(rest.aisleId && !staple.aisleId ? { aisleId: rest.aisleId } : {}),
    });
    return ctx.db.insert("shoppingExtras", {
      periodStart: start,
      label: staple.name,
      addedBy: memberId,
      stapleId: staple._id,
      ...rest,
      aisleId: rest.aisleId ?? staple.aisleId,
    });
  },
});

export const removeExtra = mutation({
  args: { token: v.string(), id: v.id("shoppingExtras") },
  handler: async (ctx, { token, id }) => {
    await assertSession(ctx, token);
    await ctx.db.delete(id);
  },
});

/** "Valider le menu de la semaine": the full set of items already at home this week. */
export const setAtHome = mutation({
  args: { token: v.string(), start: v.string(), itemKeys: v.array(v.string()) },
  handler: async (ctx, { token, start, itemKeys }) => {
    await assertSession(ctx, token);
    assertDate(start);
    if (itemKeys.length > 500 || itemKeys.some((k) => k.length > 120)) throw new ConvexError("Liste invalide.");
    const existing = await ctx.db
      .query("stockSkips")
      .withIndex("by_period", (q) => q.eq("periodStart", start))
      .collect();
    for (const s of existing) await ctx.db.delete(s._id);
    for (const itemKey of new Set(itemKeys)) await ctx.db.insert("stockSkips", { periodStart: start, itemKey });
  },
});

/** One item back to (or out of) the list, from the shopping screen. */
export const setOneAtHome = mutation({
  args: { token: v.string(), start: v.string(), itemKey: v.string(), atHome: v.boolean() },
  handler: async (ctx, { token, start, itemKey, atHome }) => {
    await assertSession(ctx, token);
    assertDate(start);
    if (itemKey.length > 120) throw new ConvexError("Article invalide.");
    const existing = (
      await ctx.db
        .query("stockSkips")
        .withIndex("by_period", (q) => q.eq("periodStart", start))
        .collect()
    ).filter((s) => s.itemKey === itemKey);
    for (const s of existing) await ctx.db.delete(s._id);
    if (atHome) await ctx.db.insert("stockSkips", { periodStart: start, itemKey });
  },
});
