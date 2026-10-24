import { mutation, query, type QueryCtx } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { assertDate, assertSession, cleanText } from "./lib";
import { addDays, daysBetween } from "./domain/dates";

export const list = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await assertSession(ctx, token);
    const templates = await ctx.db.query("templates").collect();
    const out = [];
    for (const t of templates) {
      const entries = [];
      for (const e of t.entries) {
        const recipe = await ctx.db.get(e.recipeId);
        entries.push({
          ...e,
          recipeName: recipe?.name ?? "Recette supprimée",
          recipeEmoji: recipe?.emoji ?? "🍽️",
        });
      }
      out.push({ ...t, entries });
    }
    return out.sort((a, b) => a.name.localeCompare(b.name, "fr"));
  },
});

async function entriesFromWeek(
  ctx: QueryCtx,
  start: string,
) {
  const meals = await ctx.db
    .query("meals")
    .withIndex("by_date", (q) =>
      q.gte("date", start).lte("date", addDays(start, 6)),
    )
    .collect();
  return meals
    .filter((m) => m.recipeId && !m.fromLeftoverOf)
    .map((m) => ({
      dayOffset: daysBetween(start, m.date),
      slot: m.slot,
      recipeId: m.recipeId!,
      persons: m.persons,
      extraPortions: m.extraPortions,
      cookedDayOffset: daysBetween(start, m.cookedOn),
    }));
}

/** Saves the current planning week as a usual week. */
export const saveWeek = mutation({
  args: {
    token: v.string(),
    name: v.string(),
    start: v.string(),
    replaceId: v.optional(v.id("templates")),
  },
  handler: async (ctx, { token, name, start, replaceId }) => {
    await assertSession(ctx, token);
    assertDate(start);
    name = cleanText(name, 60, "Nom du menu type");
    if (!name.trim()) throw new ConvexError("Donne un nom à ce menu type.");
    const entries = await entriesFromWeek(ctx, start);
    if (entries.length === 0)
      throw new ConvexError("La semaine ne contient aucun plat avec recette.");
    if (replaceId) {
      await ctx.db.patch(replaceId, { name: name.trim(), entries });
      return replaceId;
    }
    return ctx.db.insert("templates", { name: name.trim(), entries });
  },
});

/** Adds a usual week onto a planning week. With `replace`, planned meals are cleared first. */
export const apply = mutation({
  args: {
    token: v.string(),
    id: v.id("templates"),
    start: v.string(),
    replace: v.boolean(),
  },
  handler: async (ctx, { token, id, start, replace }) => {
    await assertSession(ctx, token);
    assertDate(start);
    const template = await ctx.db.get(id);
    if (!template) throw new ConvexError("Menu type introuvable.");
    if (replace) {
      const existing = await ctx.db
        .query("meals")
        .withIndex("by_date", (q) =>
          q.gte("date", start).lte("date", addDays(start, 6)),
        )
        .collect();
      for (const m of existing)
        if (m.status === "prévu" && !m.fromLeftoverOf)
          await ctx.db.delete(m._id);
    }
    let added = 0;
    for (const e of template.entries) {
      const recipe = await ctx.db.get(e.recipeId);
      if (!recipe || recipe.archived) continue;
      added++;
      await ctx.db.insert("meals", {
        date: addDays(start, e.dayOffset),
        slot: e.slot,
        recipeId: e.recipeId,
        persons: e.persons,
        extraPortions: e.extraPortions,
        cookedOn: addDays(start, e.cookedDayOffset),
        status: "prévu",
        leftoverPortions: e.extraPortions ?? 0,
      });
    }
    // Archived recipes are skipped: tell the UI what was really added
    return { added, skipped: template.entries.length - added };
  },
});

export const remove = mutation({
  args: { token: v.string(), id: v.id("templates") },
  handler: async (ctx, { token, id }) => {
    await assertSession(ctx, token);
    await ctx.db.delete(id);
  },
});
