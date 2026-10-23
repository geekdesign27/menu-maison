import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { assertSession } from "./lib";

export const list = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await assertSession(ctx, token);
    const wishes = await ctx.db.query("wishes").collect();
    const out = [];
    for (const w of wishes) {
      const recipe = w.recipeId ? await ctx.db.get(w.recipeId) : null;
      out.push({
        ...w,
        recipe: recipe && {
          _id: recipe._id,
          name: recipe.name,
          emoji: recipe.emoji,
        },
      });
    }
    // Open wishes first, newest first
    return out.sort(
      (a, b) => Number(a.done) - Number(b.done) || b.createdAt - a.createdAt,
    );
  },
});

export const add = mutation({
  args: {
    token: v.string(),
    memberId: v.id("members"),
    recipeId: v.optional(v.id("recipes")),
    text: v.optional(v.string()),
  },
  handler: async (ctx, { token, memberId, recipeId, text }) => {
    await assertSession(ctx, token);
    if (!recipeId && !text?.trim())
      throw new ConvexError("Écris ton envie ou choisis une recette.");
    return ctx.db.insert("wishes", {
      memberId,
      recipeId,
      text: text?.trim() || undefined,
      done: false,
      createdAt: Date.now(),
    });
  },
});

export const setDone = mutation({
  args: { token: v.string(), id: v.id("wishes"), done: v.boolean() },
  handler: async (ctx, { token, id, done }) => {
    await assertSession(ctx, token);
    await ctx.db.patch(id, { done });
  },
});

export const remove = mutation({
  args: { token: v.string(), id: v.id("wishes") },
  handler: async (ctx, { token, id }) => {
    await assertSession(ctx, token);
    await ctx.db.delete(id);
  },
});
