import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { assertEmoji, assertInt, assertPositive, assertSession, cleanText } from "./lib";
import { unitValidator } from "./schema";

const itemValidator = v.object({
  ingredientId: v.id("ingredients"),
  qtyPerPerson: v.number(),
  unit: unitValidator,
});

/** All non-archived recipes with who liked them. */
export const list = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await assertSession(ctx, token);
    const [recipes, likes] = await Promise.all([
      ctx.db.query("recipes").collect(),
      ctx.db.query("likes").collect(),
    ]);
    const visible = recipes.filter((r) => !r.archived).sort((a, b) => a.name.localeCompare(b.name, "fr"));
    return Promise.all(
      visible.map(async (r) => ({
        ...r,
        imageUrl: r.imageId ? await ctx.storage.getUrl(r.imageId) : null,
        likedBy: likes.filter((l) => l.recipeId === r._id).map((l) => l.memberId),
      })),
    );
  },
});

export const get = query({
  args: { token: v.string(), id: v.id("recipes") },
  handler: async (ctx, { token, id }) => {
    await assertSession(ctx, token);
    const recipe = await ctx.db.get(id);
    if (!recipe) return null;
    const likes = await ctx.db
      .query("likes")
      .withIndex("by_recipe", (q) => q.eq("recipeId", id))
      .collect();
    const imageUrl = recipe.imageId ? await ctx.storage.getUrl(recipe.imageId) : null;
    return { ...recipe, imageUrl, likedBy: likes.map((l) => l.memberId) };
  },
});

function validate(data: {
  name: string;
  emoji: string;
  description?: string;
  tags: string[];
  prepMinutes: number;
  fridgeDays: number;
  defaultPersons?: number;
  items: { qtyPerPerson: number }[];
  steps: string[];
}) {
  if (!cleanText(data.name, 100, "Nom de la recette")) throw new ConvexError("Le nom de la recette est obligatoire.");
  assertEmoji(data.emoji);
  if (data.description) cleanText(data.description, 500, "Description");
  if (data.tags.length > 20 || data.tags.some((t) => t.length > 40)) throw new ConvexError("Trop de tags ou tag trop long.");
  assertInt(data.prepMinutes, 0, 1440, "Temps de préparation");
  assertInt(data.fridgeDays, 0, 30, "Conservation au frigo");
  if (data.defaultPersons !== undefined) assertInt(data.defaultPersons, 1, 30, "Nombre de personnes");
  if (data.items.length > 60) throw new ConvexError("60 ingrédients au maximum.");
  for (const i of data.items) assertPositive(i.qtyPerPerson, 100000, "Quantité");
  if (data.steps.length > 50) throw new ConvexError("50 étapes au maximum.");
  for (const step of data.steps) cleanText(step, 2000, "Étape");
}

const recipeFields = {
  name: v.string(),
  emoji: v.string(),
  description: v.optional(v.string()),
  tags: v.array(v.string()),
  prepMinutes: v.number(),
  fridgeDays: v.number(),
  items: v.array(itemValidator),
  steps: v.array(v.string()),
  imageId: v.optional(v.id("_storage")),
  defaultPersons: v.optional(v.number()),
};

export const create = mutation({
  args: {
    token: v.string(),
    memberId: v.optional(v.id("members")),
    ...recipeFields,
  },
  handler: async (ctx, { token, memberId, ...data }) => {
    await assertSession(ctx, token);
    validate(data);
    return ctx.db.insert("recipes", {
      ...data,
      name: data.name.trim(),
      steps: data.steps.map((s) => s.trim()).filter(Boolean),
      saved: true, // a recipe we write ourselves is ours
      archived: false,
      createdBy: memberId,
    });
  },
});

export const update = mutation({
  args: { token: v.string(), id: v.id("recipes"), ...recipeFields },
  handler: async (ctx, { token, id, ...data }) => {
    await assertSession(ctx, token);
    validate(data);
    await ctx.db.patch(id, {
      ...data,
      name: data.name.trim(),
      steps: data.steps.map((s) => s.trim()).filter(Boolean),
      // Explicit: a photo removed in the editor is unset (undefined is dropped on the wire)
      imageId: data.imageId,
      defaultPersons: data.defaultPersons,
    });
  },
});

/** Archive instead of delete: past meals keep pointing to the recipe. */
export const archive = mutation({
  args: { token: v.string(), id: v.id("recipes") },
  handler: async (ctx, { token, id }) => {
    await assertSession(ctx, token);
    await ctx.db.patch(id, { archived: true });
  },
});

export const setSaved = mutation({
  args: { token: v.string(), id: v.id("recipes"), saved: v.boolean() },
  handler: async (ctx, { token, id, saved }) => {
    await assertSession(ctx, token);
    await ctx.db.patch(id, { saved });
  },
});

/** Heart toggle. Liking a recipe also keeps it in "Nos recettes". */
export const toggleLike = mutation({
  args: {
    token: v.string(),
    recipeId: v.id("recipes"),
    memberId: v.id("members"),
  },
  handler: async (ctx, { token, recipeId, memberId }) => {
    await assertSession(ctx, token);
    const likes = await ctx.db
      .query("likes")
      .withIndex("by_recipe", (q) => q.eq("recipeId", recipeId))
      .collect();
    const mine = likes.find((l) => l.memberId === memberId);
    if (mine) {
      await ctx.db.delete(mine._id);
      return false;
    }
    await ctx.db.insert("likes", { recipeId, memberId });
    await ctx.db.patch(recipeId, { saved: true });
    return true;
  },
});

/** Short-lived URL the phone uploads a recipe photo to (resized beforehand). */
export const generateUploadUrl = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await assertSession(ctx, token);
    return ctx.storage.generateUploadUrl();
  },
});

/** Copy of a recipe, kept in "Nos recettes", to adapt it without touching the original. */
export const duplicate = mutation({
  args: { token: v.string(), id: v.id("recipes"), memberId: v.optional(v.id("members")) },
  handler: async (ctx, { token, id, memberId }) => {
    await assertSession(ctx, token);
    const source = await ctx.db.get(id);
    if (!source) throw new ConvexError("Recette introuvable.");
    const { _id, _creationTime, ...fields } = source;
    void _id;
    void _creationTime;
    return ctx.db.insert("recipes", {
      ...fields,
      name: `${source.name} (copie)`.slice(0, 100),
      saved: true,
      archived: false,
      createdBy: memberId,
    });
  },
});
