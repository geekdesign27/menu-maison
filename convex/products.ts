import { query } from "./_generated/server";
import { v } from "convex/values";
import { assertSession } from "./lib";

/**
 * Raw material of the « Produits » list: every ingredient and usual item with its
 * photo, and the recipes (archived ones too) so the UI can count uses.
 */
export const list = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await assertSession(ctx, token);
    const [ingredients, staples, recipes] = await Promise.all([
      ctx.db.query("ingredients").collect(),
      ctx.db.query("staples").collect(),
      ctx.db.query("recipes").collect(),
    ]);
    const withUrl = async <T extends { imageId?: string }>(doc: T) => ({
      ...doc,
      imageUrl: doc.imageId ? await ctx.storage.getUrl(doc.imageId) : null,
    });
    return {
      ingredients: await Promise.all(ingredients.map(withUrl)),
      staples: await Promise.all(staples.map(withUrl)),
      recipes: recipes.map((r) => ({
        _id: r._id,
        name: r.name,
        archived: r.archived,
        items: r.items.map((it) => ({ ingredientId: it.ingredientId })),
      })),
    };
  },
});
