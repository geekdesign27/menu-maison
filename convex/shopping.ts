import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { assertDate, assertPositive, requireMember, requireMemberWriter, cleanText, loadChainPrices } from "./lib";
import { unitValidator } from "./schema";
import { addDays } from "./domain/dates";
import { buildShoppingList, MEAL_NOT_COOKED, type HomeStockNote } from "./domain/shopping";
import { formatQty } from "./domain/quantities";

/** Shopping list of the planning week starting at `start`, ordered for the chosen store. */
export const list = query({
  args: {
    token: v.string(),
    start: v.string(),
    storeId: v.optional(v.id("stores")),
  },
  handler: async (ctx, { token, start, storeId }) => {
    const { db } = await requireMember(ctx, token);
    assertDate(start);
    const end = addDays(start, 6);
    const [eaten, ingredients, aisles, extras, checks, skips, stock] = await Promise.all([
      // One extra day: next week's first lunch may be cooked on this week's last evening
      db.index("meals", "by_family_date", (q) => q.gte("date", start).lte("date", addDays(start, 7)))
        .collect(),
      db.query("ingredients").collect(),
      db.query("aisles").collect(),
      db.index("shoppingExtras", "by_family_period", (q) => q.eq("periodStart", start))
        .collect(),
      db.index("shoppingChecks", "by_family_period", (q) => q.eq("periodStart", start))
        .collect(),
      db.index("stockSkips", "by_family_period", (q) => q.eq("periodStart", start))
        .collect(),
      db.query("homeStock").collect(),
    ]);
    // Bought for a dish that was not cooked: flagged on the list, never removed from it
    const homeStock: Record<string, HomeStockNote[]> = {};
    for (const s of stock)
      (homeStock[s.ingredientId] ??= []).push({ display: formatQty(s.qty, s.unit), since: s.since, from: s.fromName });
    const meals = eaten.filter((m) => m.cookedOn >= start && m.cookedOn <= end);
    const chainPrices = await loadChainPrices(db);
    const store = storeId ? await db.get(storeId) : null;

    const recipes: Parameters<typeof buildShoppingList>[0]["recipes"] = {};
    for (const id of new Set(
      meals.map((m) => m.recipeId).filter((x) => x !== undefined),
    )) {
      const r = await db.get(id);
      if (r) recipes[r._id] = { name: r.name, items: r.items };
    }

    const list = buildShoppingList({
      meals: meals.map((m) => ({
        _id: m._id,
        recipeId: m.recipeId,
        persons: m.persons,
        extraPortions: m.extraPortions,
        fromLeftoverOf: m.fromLeftoverOf,
        cookedOn: m.cookedOn,
        status: m.status,
      })),
      period: { start, end },
      recipes,
      ingredients: Object.fromEntries(
        await Promise.all(
          ingredients.map(
            async (i) =>
              [
                i._id,
                {
                  ...i,
                  imageUrl: i.imageId ? await ctx.storage.getUrl(i.imageId) : null,
                  chainPrices: chainPrices.ingredients.get(i._id),
                },
              ] as const,
          ),
        ),
      ),
      aisles,
      store: store && {
        chain: store.chain,
        aisleOrder: store.aisleOrder,
        overrides: store.overrides,
        priceFactor: store.priceFactor,
      },
      // Usual items bring their current price and chains (edits apply right away)
      extras: await Promise.all(
        extras.map(async (e) => {
          const staple = e.stapleId ? await db.get(e.stapleId) : null;
          return staple
            ? {
                ...e,
                label: staple.name,
                aisleId: staple.aisleId ?? e.aisleId,
                priceChf: staple.priceChf,
                onlyChains: staple.onlyChains,
                imageUrl: staple.imageId ? await ctx.storage.getUrl(staple.imageId) : null,
                chainPrices: chainPrices.staples.get(staple._id),
              }
            : e;
        }),
      ),
      checks: Object.fromEntries(checks.map((c) => [c.itemKey, c.checked])),
      skipped: skips.map((s) => s.itemKey),
      homeStock,
    });
    const checkedBy = Object.fromEntries(
      checks.filter((c) => c.checked).map((c) => [c.itemKey, c.checkedBy]),
    );
    return {
      ...list,
      checkedBy,
      mealCount: meals.filter((m) => m.recipeId && !m.fromLeftoverOf && m.status !== MEAL_NOT_COOKED).length,
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
    const { db } = await requireMemberWriter(ctx, token);
    if (memberId) await db.own(memberId, "Profil introuvable.");
    assertDate(start);
    if (itemKey.length > 120) throw new ConvexError("Article invalide.");
    const existing = (
      await db.index("shoppingChecks", "by_family_period", (q) => q.eq("periodStart", start))
        .collect()
    ).find((c) => c.itemKey === itemKey);
    const data = {
      checked,
      checkedBy: checked ? memberId : undefined,
      checkedAt: checked ? Date.now() : undefined,
    };
    if (existing) await db.patch(existing._id, data);
    else
      await db.insert("shoppingChecks", {
        periodStart: start,
        itemKey,
        ...data,
      });
  },
});

export const resetChecks = mutation({
  args: { token: v.string(), start: v.string() },
  handler: async (ctx, { token, start }) => {
    const { db } = await requireMemberWriter(ctx, token);
    assertDate(start);
    const checks = await db.index("shoppingChecks", "by_family_period", (q) => q.eq("periodStart", start))
      .collect();
    for (const c of checks) await db.delete(c._id);
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
    const { db } = await requireMemberWriter(ctx, token);
    if (memberId) await db.own(memberId, "Profil introuvable.");
    if (rest.aisleId) await db.own(rest.aisleId, "Rayon introuvable.");
    assertDate(start);
    label = cleanText(label, 80, "Article");
    if (rest.qty !== undefined) assertPositive(rest.qty, 100000, "Quantité");

    let staple = stapleId ? await db.get(stapleId) : null;
    if (!staple) {
      if (!label) throw new ConvexError("Écris ce qu'il faut acheter.");
      // Same name typed again: reuse the usual item instead of creating a twin
      const all = await db.query("staples").collect();
      const key = label.toLocaleLowerCase("fr");
      staple = all.find((s) => s.name.toLocaleLowerCase("fr") === key) ?? null;
      if (!staple) {
        const id = await db.insert("staples", { name: label, aisleId: rest.aisleId, useCount: 0 });
        staple = await db.get(id);
      }
    }
    if (!staple) throw new ConvexError("Article introuvable.");

    // Already on this week's list: tapping it twice must not add a duplicate
    const existing = (
      await db.index("shoppingExtras", "by_family_period", (q) => q.eq("periodStart", start))
        .collect()
    ).find((e) => e.stapleId === staple._id);
    if (existing) return existing._id;

    await db.patch(staple._id, {
      useCount: staple.useCount + 1,
      lastUsedAt: Date.now(),
      // A chosen aisle teaches the usual item where it belongs
      ...(rest.aisleId && !staple.aisleId ? { aisleId: rest.aisleId } : {}),
    });
    return db.insert("shoppingExtras", {
      periodStart: start,
      label: staple.name,
      addedBy: memberId,
      stapleId: staple._id,
      ...rest,
      qty: rest.qty ?? staple.qty,
      unit: rest.qty !== undefined ? rest.unit : staple.unit,
      aisleId: rest.aisleId ?? staple.aisleId,
    });
  },
});

export const removeExtra = mutation({
  args: { token: v.string(), id: v.id("shoppingExtras") },
  handler: async (ctx, { token, id }) => {
    const { db } = await requireMemberWriter(ctx, token);
    await db.delete(id);
  },
});

/** "Valider le menu de la semaine": the full set of items already at home this week. */
export const setAtHome = mutation({
  args: { token: v.string(), start: v.string(), itemKeys: v.array(v.string()) },
  handler: async (ctx, { token, start, itemKeys }) => {
    const { db } = await requireMemberWriter(ctx, token);
    assertDate(start);
    if (itemKeys.length > 500 || itemKeys.some((k) => k.length > 120)) throw new ConvexError("Liste invalide.");
    const existing = await db.index("stockSkips", "by_family_period", (q) => q.eq("periodStart", start))
      .collect();
    for (const s of existing) await db.delete(s._id);
    for (const itemKey of new Set(itemKeys)) await db.insert("stockSkips", { periodStart: start, itemKey });
  },
});

/** One item back to (or out of) the list, from the shopping screen. */
export const setOneAtHome = mutation({
  args: { token: v.string(), start: v.string(), itemKey: v.string(), atHome: v.boolean() },
  handler: async (ctx, { token, start, itemKey, atHome }) => {
    const { db } = await requireMemberWriter(ctx, token);
    assertDate(start);
    if (itemKey.length > 120) throw new ConvexError("Article invalide.");
    const existing = (
      await db.index("stockSkips", "by_family_period", (q) => q.eq("periodStart", start))
        .collect()
    ).filter((s) => s.itemKey === itemKey);
    for (const s of existing) await db.delete(s._id);
    if (atHome) await db.insert("stockSkips", { periodStart: start, itemKey });
  },
});

/** Quantity of a free item (null clears it). A usual item remembers it for next time. */
export const setExtraQty = mutation({
  args: { token: v.string(), id: v.id("shoppingExtras"), qty: v.union(v.number(), v.null()), unit: v.optional(unitValidator) },
  handler: async (ctx, { token, id, qty, unit }) => {
    const { db } = await requireMemberWriter(ctx, token);
    if (qty !== null) assertPositive(qty, 100000, "Quantité");
    const extra = await db.get(id);
    if (!extra) throw new ConvexError("Article introuvable.");
    const patch = { qty: qty ?? undefined, unit: qty === null ? undefined : (unit ?? "pc") };
    await db.patch(id, patch);
    if (extra.stapleId && (await db.get(extra.stapleId))) await db.patch(extra.stapleId, patch);
  },
});
