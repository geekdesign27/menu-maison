import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { requireMember, requireMemberWriter, cleanText } from "./lib";

export const list = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const { db } = await requireMember(ctx, token);
    const wishes = await db.query("wishes").collect();
    const out = [];
    for (const w of wishes) {
      const recipe = w.recipeId ? await db.get(w.recipeId) : null;
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
    const { db } = await requireMemberWriter(ctx, token);
    if (text) text = cleanText(text, 200, "Envie");
    if (!recipeId && !text?.trim())
      throw new ConvexError("Écris ton envie ou choisis une recette.");
    await db.own(memberId, "Profil introuvable.");
    if (recipeId) await db.own(recipeId, "Recette introuvable.");
    return db.insert("wishes", {
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
    const { db } = await requireMemberWriter(ctx, token);
    await db.patch(id, { done });
  },
});

export const remove = mutation({
  args: { token: v.string(), id: v.id("wishes") },
  handler: async (ctx, { token, id }) => {
    const { db } = await requireMemberWriter(ctx, token);
    await db.delete(id);
  },
});
