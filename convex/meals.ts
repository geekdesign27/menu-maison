import { mutation, query, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { ConvexError, v } from "convex/values";
import { assertDate, assertInt, assertSession, cleanText } from "./lib";
import { slotValidator } from "./schema";
import { addDays, daysBetween } from "./domain/dates";
import { leftoverStatus } from "./domain/leftovers";

function assertPersons(n: number) {
  assertInt(n, 1, 30, "Nombre de personnes");
}

async function mealsBetween(ctx: QueryCtx, from: string, to: string) {
  return ctx.db
    .query("meals")
    .withIndex("by_date", (q) => q.gte("date", from).lte("date", to))
    .collect();
}

async function withRecipe(ctx: QueryCtx, meals: Doc<"meals">[]) {
  const cache = new Map<Id<"recipes">, Doc<"recipes"> | null>();
  const out = [];
  for (const m of meals) {
    let recipe: Doc<"recipes"> | null = null;
    if (m.recipeId) {
      if (!cache.has(m.recipeId))
        cache.set(m.recipeId, await ctx.db.get(m.recipeId));
      recipe = cache.get(m.recipeId) ?? null;
    }
    out.push({
      ...m,
      recipe: recipe
        ? {
            _id: recipe._id,
            name: recipe.name,
            emoji: recipe.emoji,
            prepMinutes: recipe.prepMinutes,
            fridgeDays: recipe.fridgeDays,
            tags: recipe.tags,
          }
        : null,
    });
  }
  return out;
}

/** Meals of the 7-day planning week starting at `start`. */
export const week = query({
  args: { token: v.string(), start: v.string() },
  handler: async (ctx, { token, start }) => {
    await assertSession(ctx, token);
    assertDate(start);
    return withRecipe(ctx, await mealsBetween(ctx, start, addDays(start, 6)));
  },
});

export const add = mutation({
  args: {
    token: v.string(),
    date: v.string(),
    slot: slotValidator,
    recipeId: v.optional(v.id("recipes")),
    title: v.optional(v.string()),
    persons: v.number(),
    // Cooked tonight, also eaten tomorrow at lunch by this many people
    tomorrowLunchPersons: v.optional(v.number()),
    // Lunch prepared the evening before
    cookedTheEveningBefore: v.optional(v.boolean()),
    // Portions cooked on top, kept in the fridge for later in the week
    extraPortions: v.optional(v.number()),
  },
  handler: async (
    ctx,
    { token, tomorrowLunchPersons, cookedTheEveningBefore, extraPortions, ...m },
  ) => {
    await assertSession(ctx, token);
    assertDate(m.date);
    assertPersons(m.persons);
    if (!m.recipeId && !m.title?.trim())
      throw new ConvexError("Choisis une recette ou écris un titre.");
    const cookedOn =
      m.slot !== "soir" && cookedTheEveningBefore
        ? addDays(m.date, -1)
        : m.date;
    if (extraPortions !== undefined) assertInt(extraPortions, 0, 30, "Portions en plus");
    const extra = m.recipeId && extraPortions ? extraPortions : undefined;
    const id = await ctx.db.insert("meals", {
      ...m,
      title: m.title ? cleanText(m.title, 80, "Titre") || undefined : undefined,
      cookedOn,
      status: "prévu",
      extraPortions: extra,
      // The extra portions go to the fridge once cooked (the fridge shows them from cookedOn)
      leftoverPortions: extra ?? 0,
    });
    if (tomorrowLunchPersons && m.slot === "soir") {
      assertPersons(tomorrowLunchPersons);
      await ctx.db.insert("meals", {
        date: addDays(m.date, 1),
        slot: "midi",
        recipeId: m.recipeId,
        title: m.title ? cleanText(m.title, 80, "Titre") || undefined : undefined,
        persons: tomorrowLunchPersons,
        cookedOn: m.date,
        status: "prévu",
        leftoverPortions: 0,
      });
    }
    return id;
  },
});

export const update = mutation({
  args: {
    token: v.string(),
    id: v.id("meals"),
    persons: v.optional(v.number()),
    recipeId: v.optional(v.id("recipes")),
    title: v.optional(v.string()),
    date: v.optional(v.string()),
    slot: v.optional(slotValidator),
    extraPortions: v.optional(v.number()),
  },
  handler: async (ctx, { token, id, extraPortions, ...patch }) => {
    await assertSession(ctx, token);
    const meal = await ctx.db.get(id);
    if (!meal) throw new ConvexError("Repas introuvable.");
    if (extraPortions !== undefined) {
      assertInt(extraPortions, 0, 30, "Portions en plus");
      // Still planned: the fridge will get exactly the new extra portions
      await ctx.db.patch(id, {
        extraPortions: extraPortions || undefined,
        ...(meal.status === "prévu" ? { leftoverPortions: extraPortions } : {}),
      });
    }
    if (patch.persons !== undefined) assertPersons(patch.persons);
    if (patch.date !== undefined) assertDate(patch.date);
    if (patch.title !== undefined) patch.title = cleanText(patch.title, 80, "Titre") || undefined;
    const next: Partial<Doc<"meals">> = { ...patch };
    // A standalone dish moves with its cooking day. Leftovers and portions cooked
    // together with another meal (tonight + tomorrow's lunch) keep their cooking day.
    if (patch.date && patch.date !== meal.date && !meal.fromLeftoverOf) {
      const sameDay = await ctx.db
        .query("meals")
        .withIndex("by_date", (q) => q.gte("date", addDays(meal.cookedOn, -1)).lte("date", addDays(meal.cookedOn, 2)))
        .collect();
      const cookedWithOther = sameDay.some((m) => m._id !== meal._id && m.recipeId === meal.recipeId && m.cookedOn === meal.cookedOn);
      if (!cookedWithOther) next.cookedOn = addDays(meal.cookedOn, daysBetween(meal.date, patch.date));
    }
    await ctx.db.patch(id, next);
  },
});

export const setStatus = mutation({
  args: {
    token: v.string(),
    id: v.id("meals"),
    status: v.union(
      v.literal("prévu"),
      v.literal("mangé"),
      v.literal("pas mangé"),
    ),
    leftoverPortions: v.optional(v.number()),
  },
  handler: async (ctx, { token, id, status, leftoverPortions }) => {
    await assertSession(ctx, token);
    const meal = await ctx.db.get(id);
    if (!meal) throw new ConvexError("Repas introuvable.");
    if (leftoverPortions !== undefined) assertInt(leftoverPortions, 0, 60, "Portions restantes");
    // A dish not eaten goes to the fridge whole, with the extra portions cooked for later
    const extra = meal.extraPortions ?? 0;
    const portions =
      status === "pas mangé"
        ? (leftoverPortions ?? meal.persons + extra)
        : (leftoverPortions ?? (status === "prévu" ? extra : meal.leftoverPortions));
    await ctx.db.patch(id, { status, leftoverPortions: portions });
  },
});

export const remove = mutation({
  args: { token: v.string(), id: v.id("meals") },
  handler: async (ctx, { token, id }) => {
    await assertSession(ctx, token);
    const meal = await ctx.db.get(id);
    if (!meal) return;
    // Give back the portions a planned leftover had taken, if not eaten yet
    if (meal.fromLeftoverOf && meal.status === "prévu") {
      const source = await ctx.db.get(meal.fromLeftoverOf);
      if (source)
        await ctx.db.patch(source._id, {
          leftoverPortions: source.leftoverPortions + meal.persons,
        });
    }
    await ctx.db.delete(id);
  },
});

/** Leftovers in the fridge, with how long they keep. */
export const fridge = query({
  args: { token: v.string(), today: v.string() },
  handler: async (ctx, { token, today }) => {
    await assertSession(ctx, token);
    assertDate(today);
    // Nothing keeps more than a couple of weeks: only look back 21 days
    const recent = await mealsBetween(ctx, addDays(today, -21), today);
    // Planned extra portions appear once the dish has been cooked
    const withLeftovers = recent.filter((m) => m.leftoverPortions > 0 && m.cookedOn <= today);
    const rows = await withRecipe(ctx, withLeftovers);
    return rows
      .map((m) => ({
        ...m,
        keep: leftoverStatus(m.cookedOn, m.recipe?.fridgeDays ?? 2, today),
      }))
      .sort((a, b) => a.keep.until.localeCompare(b.keep.until));
  },
});

/** Plans leftovers on a slot: no shopping, portions taken from the source. */
export const planLeftover = mutation({
  args: {
    token: v.string(),
    sourceId: v.id("meals"),
    date: v.string(),
    slot: slotValidator,
    persons: v.number(),
  },
  handler: async (ctx, { token, sourceId, date, slot, persons }) => {
    await assertSession(ctx, token);
    assertDate(date);
    assertPersons(persons);
    const source = await ctx.db.get(sourceId);
    if (!source) throw new ConvexError("Restes introuvables.");
    if (source.leftoverPortions < 1)
      throw new ConvexError("Il n'y a plus de portions de ce plat.");
    const taken = Math.min(persons, source.leftoverPortions);
    await ctx.db.patch(sourceId, {
      leftoverPortions: source.leftoverPortions - taken,
    });
    return ctx.db.insert("meals", {
      date,
      slot,
      recipeId: source.recipeId,
      title: source.title,
      persons: taken,
      cookedOn: source.cookedOn,
      fromLeftoverOf: sourceId,
      status: "prévu",
      leftoverPortions: 0,
    });
  },
});

export const discardLeftover = mutation({
  args: { token: v.string(), id: v.id("meals") },
  handler: async (ctx, { token, id }) => {
    await assertSession(ctx, token);
    await ctx.db.patch(id, { leftoverPortions: 0 });
  },
});
