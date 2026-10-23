import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { assertSession, getSettings } from "./lib";
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
    if (
      patch.shoppingDay !== undefined &&
      (patch.shoppingDay < 0 || patch.shoppingDay > 6)
    ) {
      throw new ConvexError("Jour des courses invalide.");
    }
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
    if (!patch.name.trim()) throw new ConvexError("Le prénom est obligatoire.");
    await ctx.db.patch(id, { ...patch, name: patch.name.trim() });
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
    if (!m.name.trim()) throw new ConvexError("Le prénom est obligatoire.");
    const count = (await ctx.db.query("members").collect()).length;
    return ctx.db.insert("members", {
      ...m,
      name: m.name.trim(),
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
    const name = data.name.trim();
    if (!name) throw new ConvexError("Le nom de l'ingrédient est obligatoire.");
    const duplicate = await ctx.db
      .query("ingredients")
      .withIndex("by_name", (q) => q.eq("name", name))
      .first();
    if (duplicate && duplicate._id !== id)
      throw new ConvexError(`« ${name} » existe déjà.`);
    if (id) {
      await ctx.db.patch(id, { ...data, name });
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
    if (!name.trim()) throw new ConvexError("Le nom du rayon est obligatoire.");
    const order = (await ctx.db.query("aisles").collect()).length;
    const id = await ctx.db.insert("aisles", {
      name: name.trim(),
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
    if (!name.trim()) throw new ConvexError("Le nom du rayon est obligatoire.");
    await ctx.db.patch(id, { name: name.trim(), emoji });
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
    if (!name.trim())
      throw new ConvexError("Le nom du magasin est obligatoire.");
    const source = copyFrom ? await ctx.db.get(copyFrom) : null;
    const aisles = (await ctx.db.query("aisles").collect()).sort(
      (a, b) => a.order - b.order,
    );
    return ctx.db.insert("stores", {
      chain,
      name: name.trim(),
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
    if (patch.name !== undefined && !patch.name.trim())
      throw new ConvexError("Le nom du magasin est obligatoire.");
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
