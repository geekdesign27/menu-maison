import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import {
  assertColor,
  assertEmoji,
  assertInt,
  assertPositive,
  assertSession,
  cleanText,
  getSettings,
} from "./lib";

function memberName(name: string) {
  const n = cleanText(name, 40, "Prénom");
  if (!n) throw new ConvexError("Le prénom est obligatoire.");
  return n;
}
import { chainValidator, unitValidator } from "./schema";

/** Everything small the UI needs on every screen, in one subscription. */
export const base = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await assertSession(ctx, token);
    const [members, aisles, ingredients, stores, settings] = await Promise.all([
      ctx.db.query("members").collect(),
      ctx.db.query("aisles").collect(),
      ctx.db.query("ingredients").collect(),
      ctx.db.query("stores").collect(),
      getSettings(ctx),
    ]);
    return {
      members: members.sort((a, b) => a.order - b.order),
      aisles: aisles.sort((a, b) => a.order - b.order),
      ingredients: ingredients.sort((a, b) =>
        a.name.localeCompare(b.name, "fr"),
      ),
      stores: stores
        .filter((s) => !s.archived)
        .sort((a, b) => a.name.localeCompare(b.name, "fr")),
      settings,
    };
  },
});

export const updateSettings = mutation({
  args: {
    token: v.string(),
    shoppingDay: v.optional(v.number()),
    defaultPersons: v.optional(v.number()),
    defaultStoreId: v.optional(v.id("stores")),
  },
  handler: async (ctx, { token, ...patch }) => {
    await assertSession(ctx, token);
    if (patch.shoppingDay !== undefined)
      assertInt(patch.shoppingDay, 0, 6, "Jour des courses");
    if (patch.defaultPersons !== undefined)
      assertInt(patch.defaultPersons, 1, 30, "Nombre de personnes");
    const row = await ctx.db.query("settings").first();
    if (row) await ctx.db.patch(row._id, patch);
    else
      await ctx.db.insert("settings", {
        shoppingDay: 6,
        defaultPersons: 3,
        ...patch,
      });
  },
});

export const updateMember = mutation({
  args: {
    token: v.string(),
    id: v.id("members"),
    name: v.string(),
    emoji: v.string(),
    color: v.string(),
  },
  handler: async (ctx, { token, id, ...patch }) => {
    await assertSession(ctx, token);
    assertColor(patch.color);
    assertEmoji(patch.emoji);
    await ctx.db.patch(id, { ...patch, name: memberName(patch.name) });
  },
});

export const addMember = mutation({
  args: {
    token: v.string(),
    name: v.string(),
    emoji: v.string(),
    color: v.string(),
  },
  handler: async (ctx, { token, ...m }) => {
    await assertSession(ctx, token);
    assertColor(m.color);
    assertEmoji(m.emoji);
    const count = (await ctx.db.query("members").collect()).length;
    if (count >= 12) throw new ConvexError("12 profils au maximum.");
    return ctx.db.insert("members", {
      ...m,
      name: memberName(m.name),
      order: count,
    });
  },
});

export const upsertIngredient = mutation({
  args: {
    token: v.string(),
    id: v.optional(v.id("ingredients")),
    name: v.string(),
    aisleId: v.id("aisles"),
    unit: unitValidator,
    priceChf: v.optional(v.number()),
    priceQty: v.optional(v.number()),
  },
  handler: async (ctx, { token, id, ...data }) => {
    await assertSession(ctx, token);
    const name = cleanText(data.name, 80, "Nom de l'ingrédient");
    if (!name) throw new ConvexError("Le nom de l'ingrédient est obligatoire.");
    if (data.priceChf !== undefined)
      assertPositive(data.priceChf, 10000, "Prix");
    if (data.priceQty !== undefined)
      assertPositive(data.priceQty, 100000, "Quantité de référence du prix");
    const duplicate = await ctx.db
      .query("ingredients")
      .withIndex("by_name", (q) => q.eq("name", name))
      .first();
    if (duplicate && duplicate._id !== id)
      throw new ConvexError(`« ${name} » existe déjà.`);
    if (id) {
      // Explicit undefined so that clearing a price removes it
      await ctx.db.patch(id, { ...data, name, priceChf: data.priceChf, priceQty: data.priceQty });
      return id;
    }
    return ctx.db.insert("ingredients", { ...data, name });
  },
});

// ---------- Aisles ----------

export const addAisle = mutation({
  args: { token: v.string(), name: v.string(), emoji: v.string() },
  handler: async (ctx, { token, name, emoji }) => {
    await assertSession(ctx, token);
    const clean = cleanText(name, 60, "Nom du rayon");
    if (!clean) throw new ConvexError("Le nom du rayon est obligatoire.");
    if (emoji) assertEmoji(emoji);
    const order = (await ctx.db.query("aisles").collect()).length;
    const id = await ctx.db.insert("aisles", {
      name: clean,
      emoji: emoji || "🛒",
      order,
    });
    // New aisle goes at the end of every store walk
    for (const store of await ctx.db.query("stores").collect()) {
      await ctx.db.patch(store._id, { aisleOrder: [...store.aisleOrder, id] });
    }
    return id;
  },
});

export const renameAisle = mutation({
  args: {
    token: v.string(),
    id: v.id("aisles"),
    name: v.string(),
    emoji: v.string(),
  },
  handler: async (ctx, { token, id, name, emoji }) => {
    await assertSession(ctx, token);
    const clean = cleanText(name, 60, "Nom du rayon");
    if (!clean) throw new ConvexError("Le nom du rayon est obligatoire.");
    assertEmoji(emoji);
    await ctx.db.patch(id, { name: clean, emoji });
  },
});

// ---------- Stores ----------

const DEFAULT_FACTORS: Record<string, number> = {
  Aldi: 0.82,
  Lidl: 0.82,
  Denner: 0.88,
  Migros: 1,
  Coop: 1.05,
  Autre: 1,
};

export const createStore = mutation({
  args: {
    token: v.string(),
    chain: chainValidator,
    name: v.string(),
    copyFrom: v.optional(v.id("stores")),
  },
  handler: async (ctx, { token, chain, name, copyFrom }) => {
    await assertSession(ctx, token);
    const clean = cleanText(name, 60, "Nom du magasin");
    if (!clean) throw new ConvexError("Le nom du magasin est obligatoire.");
    const source = copyFrom ? await ctx.db.get(copyFrom) : null;
    const aisles = (await ctx.db.query("aisles").collect()).sort(
      (a, b) => a.order - b.order,
    );
    return ctx.db.insert("stores", {
      chain,
      name: clean,
      aisleOrder: source?.aisleOrder ?? aisles.map((a) => a._id),
      overrides: source?.overrides ?? [],
      priceFactor: source?.priceFactor ?? DEFAULT_FACTORS[chain] ?? 1,
      archived: false,
    });
  },
});

export const updateStore = mutation({
  args: {
    token: v.string(),
    id: v.id("stores"),
    name: v.optional(v.string()),
    chain: v.optional(chainValidator),
    aisleOrder: v.optional(v.array(v.id("aisles"))),
    priceFactor: v.optional(v.number()),
    archived: v.optional(v.boolean()),
  },
  handler: async (ctx, { token, id, ...patch }) => {
    await assertSession(ctx, token);
    if (patch.name !== undefined) {
      patch.name = cleanText(patch.name, 60, "Nom du magasin");
      if (!patch.name)
        throw new ConvexError("Le nom du magasin est obligatoire.");
    }
    if (
      patch.priceFactor !== undefined &&
      !(
        Number.isFinite(patch.priceFactor) &&
        patch.priceFactor >= 0.5 &&
        patch.priceFactor <= 2
      )
    ) {
      throw new ConvexError("Niveau de prix invalide.");
    }
    if (patch.aisleOrder && patch.aisleOrder.length > 100)
      throw new ConvexError("Trop de rayons.");
    await ctx.db.patch(id, patch);
  },
});

/** Sets (or clears, when aisleId is null) the aisle of an ingredient in one store. */
export const setOverride = mutation({
  args: {
    token: v.string(),
    storeId: v.id("stores"),
    ingredientId: v.id("ingredients"),
    aisleId: v.union(v.id("aisles"), v.null()),
  },
  handler: async (ctx, { token, storeId, ingredientId, aisleId }) => {
    await assertSession(ctx, token);
    const store = await ctx.db.get(storeId);
    if (!store) throw new ConvexError("Magasin introuvable.");
    const overrides = store.overrides.filter(
      (o) => o.ingredientId !== ingredientId,
    );
    if (aisleId) overrides.push({ ingredientId, aisleId });
    await ctx.db.patch(storeId, { overrides });
  },
});
