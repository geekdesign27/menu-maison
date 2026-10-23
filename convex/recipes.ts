import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { assertSession } from "./lib";
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
    return recipes
      .filter((r) => !r.archived)
      .sort((a, b) => a.name.localeCompare(b.name, "fr"))
      .map((r) => ({
        ...r,
        likedBy: likes
          .filter((l) => l.recipeId === r._id)
          .map((l) => l.memberId),
      }));
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
    return { ...recipe, likedBy: likes.map((l) => l.memberId) };
  },
});

function validate(data: {
  name: string;
  prepMinutes: number;
  fridgeDays: number;
  items: { qtyPerPerson: number }[];
}) {
  if (!data.name.trim())
    throw new ConvexError("Le nom de la recette est obligatoire.");
  if (data.prepMinutes < 0 || data.fridgeDays < 0)
    throw new ConvexError("Les durées ne peuvent pas être négatives.");
  if (data.items.some((i) => !(i.qtyPerPerson > 0)))
    throw new ConvexError(
      "Chaque ingrédient doit avoir une quantité positive.",
    );
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
