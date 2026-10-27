import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import {
  assertAdmin,
  assertColor,
  assertEmoji,
  assertInt,
  assertPositive,
  requireMember, requireMemberWriter,
  cleanText,
  getSettings,
  loadChainPrices,
} from "./lib";

function memberName(name: string) {
  const n = cleanText(name, 40, "Prénom");
  if (!n) throw new ConvexError("Le prénom est obligatoire.");
  return n;
}
import { chainValidator, unitValidator } from "./schema";
import { deletionBlocker } from "./domain/products";
import { removeReceiptData } from "./lib";

/** Everything small the UI needs on every screen, in one subscription. */
export const base = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const { db } = await requireMember(ctx, token);
    const chainPrices = await loadChainPrices(db);
    const [members, aisles, ingredients, stores, settings] = await Promise.all([
      db.query("members").collect(),
      db.query("aisles").collect(),
      db.query("ingredients").collect(),
      db.query("stores").collect(),
      getSettings(db),
    ]);
    return {
      members: await Promise.all(
        members
          .sort((a, b) => a.order - b.order)
          // The password hash never leaves the server
          .map(async ({ passwordHash, ...m }) => ({
            ...m,
            hasPassword: !!passwordHash,
            imageUrl: m.imageId ? await ctx.storage.getUrl(m.imageId) : null,
          })),
      ),
      aisles: aisles.sort((a, b) => a.order - b.order),
      ingredients: await Promise.all(
        ingredients
          .sort((a, b) => a.name.localeCompare(b.name, "fr"))
          .map(async (i) => ({
            ...i,
            imageUrl: i.imageId ? await ctx.storage.getUrl(i.imageId) : null,
            chainPrices: chainPrices.ingredients.get(i._id),
          })),
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
    const { db } = await requireMemberWriter(ctx, token);
    if (patch.shoppingDay !== undefined)
      assertInt(patch.shoppingDay, 0, 6, "Jour des courses");
    if (patch.defaultPersons !== undefined)
      assertInt(patch.defaultPersons, 1, 30, "Nombre de personnes");
    if (patch.defaultStoreId) await db.own(patch.defaultStoreId, "Magasin introuvable.");
    const row = await db.query("settings").first();
    if (row) await db.patch(row._id, patch);
    else
      await db.insert("settings", {
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
    const me = await requireMemberWriter(ctx, token);
    const { db } = me;
    // Each one edits their own profile; the family admins edit all of them
    if (me.member._id !== id) assertAdmin(me);
    assertColor(patch.color);
    assertEmoji(patch.emoji);
    await db.patch(id, { ...patch, name: memberName(patch.name) });
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
    const me = await requireMemberWriter(ctx, token);
    const { db } = me;
    assertAdmin(me);
    assertColor(m.color);
    assertEmoji(m.emoji);
    const count = (await db.query("members").collect()).length;
    if (count >= 12) throw new ConvexError("12 profils au maximum.");
    return db.insert("members", {
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
    pantry: v.optional(v.boolean()),
    packSize: v.optional(v.number()),
    onlyChains: v.optional(v.array(chainValidator)),
    imageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, { token, id, ...data }) => {
    const { db } = await requireMemberWriter(ctx, token);
    const name = cleanText(data.name, 80, "Nom de l'ingrédient");
    if (!name) throw new ConvexError("Le nom de l'ingrédient est obligatoire.");
    if (data.priceChf !== undefined)
      assertPositive(data.priceChf, 10000, "Prix");
    if (data.priceQty !== undefined)
      assertPositive(data.priceQty, 100000, "Quantité de référence du prix");
    if (data.packSize !== undefined) assertPositive(data.packSize, 100000, "Contenu d'un paquet");
    await db.own(data.aisleId, "Rayon introuvable.");
    const duplicate = await db.index("ingredients", "by_family_name", (q) => q.eq("name", name))
      .first();
    if (duplicate && duplicate._id !== id)
      throw new ConvexError(`« ${name} » existe déjà.`);
    if (id) {
      // Explicit undefined so that clearing a price removes it
      await db.patch(id, { ...data, name, priceChf: data.priceChf, priceQty: data.priceQty, packSize: data.packSize, onlyChains: data.onlyChains?.length ? data.onlyChains : undefined, imageId: data.imageId });
      return id;
    }
    return db.insert("ingredients", { ...data, name });
  },
});

/** Deletes an ingredient no recipe uses, archived recipes included. */
export const removeIngredient = mutation({
  args: { token: v.string(), id: v.id("ingredients") },
  handler: async (ctx, { token, id }) => {
    const { db } = await requireMemberWriter(ctx, token);
    if (!(await db.get(id))) throw new ConvexError("Ingrédient introuvable.");
    const recipes = await db.query("recipes").collect();
    const users = recipes.filter((r) => r.items.some((it) => it.ingredientId === id));
    const blocker = deletionBlocker(users);
    if (blocker) throw new ConvexError(blocker);
    await removeReceiptData(db, { ingredientId: id });
    await db.delete(id);
  },
});

// ---------- Aisles ----------

export const addAisle = mutation({
  args: { token: v.string(), name: v.string(), emoji: v.string() },
  handler: async (ctx, { token, name, emoji }) => {
    const { db } = await requireMemberWriter(ctx, token);
    const clean = cleanText(name, 60, "Nom du rayon");
    if (!clean) throw new ConvexError("Le nom du rayon est obligatoire.");
    if (emoji) assertEmoji(emoji);
    const order = (await db.query("aisles").collect()).length;
    const id = await db.insert("aisles", {
      name: clean,
      emoji: emoji || "🛒",
      order,
    });
    // New aisle goes at the end of every store walk
    for (const store of await db.query("stores").collect()) {
      await db.patch(store._id, { aisleOrder: [...store.aisleOrder, id] });
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
    const { db } = await requireMemberWriter(ctx, token);
    const clean = cleanText(name, 60, "Nom du rayon");
    if (!clean) throw new ConvexError("Le nom du rayon est obligatoire.");
    assertEmoji(emoji);
    await db.patch(id, { name: clean, emoji });
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
    const { db } = await requireMemberWriter(ctx, token);
    const clean = cleanText(name, 60, "Nom du magasin");
    if (!clean) throw new ConvexError("Le nom du magasin est obligatoire.");
    const source = copyFrom ? await db.get(copyFrom) : null;
    const aisles = (await db.query("aisles").collect()).sort(
      (a, b) => a.order - b.order,
    );
    return db.insert("stores", {
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
    const { db } = await requireMemberWriter(ctx, token);
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
    if (patch.aisleOrder) await db.ownAll(patch.aisleOrder, "Rayon introuvable.");
    await db.patch(id, patch);
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
    const { db } = await requireMemberWriter(ctx, token);
    const store = await db.get(storeId);
    if (!store) throw new ConvexError("Magasin introuvable.");
    await db.own(ingredientId, "Ingrédient introuvable.");
    if (aisleId) await db.own(aisleId, "Rayon introuvable.");
    const overrides = store.overrides.filter(
      (o) => o.ingredientId !== ingredientId,
    );
    if (aisleId) overrides.push({ ingredientId, aisleId });
    await db.patch(storeId, { overrides });
  },
});

/** Profile photo (null removes it and brings the emoji back). */
export const setMemberPhoto = mutation({
  args: { token: v.string(), id: v.id("members"), imageId: v.union(v.id("_storage"), v.null()) },
  handler: async (ctx, { token, id, imageId }) => {
    const me = await requireMemberWriter(ctx, token);
    const { db } = me;
    if (me.member._id !== id) assertAdmin(me);
    if (!(await db.get(id))) throw new ConvexError("Profil introuvable.");
    await db.patch(id, { imageId: imageId ?? undefined });
  },
});
