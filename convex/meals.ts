import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { ConvexError, v } from "convex/values";
import { assertDate, assertInt, requireMember, requireMemberWriter, cleanText, type FamilyDb } from "./lib";
import { mealStatusValidator, slotValidator } from "./schema";
import { addDays, dayOfWeek, daysBetween } from "./domain/dates";
import { leftoverStatus } from "./domain/leftovers";
import { MEAL_NOT_COOKED, mealNeeds } from "./domain/shopping";
import type { FamilyWriter } from "./lib";
import { getSettings } from "./lib";
import { unitValidator } from "./schema";
import { weekStart } from "./domain/dates";
import { localName } from "./domain/lang";

function assertPersons(n: number) {
  assertInt(n, 1, 30, "Nombre de personnes");
}

async function mealsBetween(db: FamilyDb, from: string, to: string) {
  return db.index("meals", "by_family_date", (q) => q.gte("date", from).lte("date", to))
    .collect();
}

/** Portions of this dish already put on other meals (planned leftovers). */
async function placedFrom(db: FamilyDb, meal: Doc<"meals">) {
  const later = await mealsBetween(db, meal.cookedOn, addDays(meal.cookedOn, 30));
  return later.filter((m) => m.fromLeftoverOf === meal._id).reduce((sum, m) => sum + m.persons, 0);
}

async function withRecipe(db: FamilyDb, meals: Doc<"meals">[]) {
  const cache = new Map<Id<"recipes">, Doc<"recipes"> | null>();
  const out = [];
  for (const m of meals) {
    let recipe: Doc<"recipes"> | null = null;
    if (m.recipeId) {
      if (!cache.has(m.recipeId))
        cache.set(m.recipeId, await db.get(m.recipeId));
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
    const { db } = await requireMember(ctx, token);
    assertDate(start);
    return withRecipe(db, await mealsBetween(db, start, addDays(start, 6)));
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
    const { db, member } = await requireMemberWriter(ctx, token);
    assertDate(m.date);
    assertPersons(m.persons);
    if (!m.recipeId && !m.title?.trim())
      throw new ConvexError("Choisis une recette ou écris un titre.");
    if (m.recipeId) await db.own(m.recipeId, "Recette introuvable.");
    const cookedOn =
      m.slot !== "soir" && cookedTheEveningBefore
        ? addDays(m.date, -1)
        : m.date;
    if (extraPortions !== undefined) assertInt(extraPortions, 0, 30, "Portions en plus");
    const extra = m.recipeId && extraPortions ? extraPortions : undefined;
    const id = await db.insert("meals", {
      ...m,
      title: m.title ? cleanText(m.title, 80, "Titre") || undefined : undefined,
      cookedOn,
      status: "prévu",
      extraPortions: extra,
      // The extra portions go to the fridge once cooked (the fridge shows them from cookedOn)
      leftoverPortions: extra ?? 0,
      addedBy: member._id,
    });
    if (tomorrowLunchPersons && m.slot === "soir") {
      assertPersons(tomorrowLunchPersons);
      await db.insert("meals", {
        date: addDays(m.date, 1),
        slot: "midi",
        recipeId: m.recipeId,
        title: m.title ? cleanText(m.title, 80, "Titre") || undefined : undefined,
        persons: tomorrowLunchPersons,
        cookedOn: m.date,
        status: "prévu",
        leftoverPortions: 0,
        addedBy: member._id,
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
    const { db } = await requireMemberWriter(ctx, token);
    const meal = await db.get(id);
    if (!meal) throw new ConvexError("Repas introuvable.");
    if (patch.recipeId) await db.own(patch.recipeId, "Recette introuvable.");
    if (extraPortions !== undefined) {
      assertInt(extraPortions, 0, 30, "Portions en plus");
      // Still planned: the fridge gets the new extra portions, minus those already placed
      const placed = meal.status === "prévu" ? await placedFrom(db, meal) : 0;
      await db.patch(id, {
        extraPortions: extraPortions || undefined,
        ...(meal.status === "prévu" ? { leftoverPortions: Math.max(0, extraPortions - placed) } : {}),
      });
    }
    if (patch.persons !== undefined) assertPersons(patch.persons);
    if (patch.date !== undefined) assertDate(patch.date);
    if (patch.title !== undefined) patch.title = cleanText(patch.title, 80, "Titre") || undefined;
    const next: Partial<Doc<"meals">> = { ...patch };
    // A standalone dish moves with its cooking day. Leftovers and portions cooked
    // together with another meal (tonight + tomorrow's lunch) keep their cooking day.
    if (patch.date && patch.date !== meal.date && !meal.fromLeftoverOf) {
      const sameDay = await db.index("meals", "by_family_date", (q) => q.gte("date", addDays(meal.cookedOn, -1)).lte("date", addDays(meal.cookedOn, 2)))
        .collect();
      const cookedWithOther = sameDay.some((m) => m._id !== meal._id && m.recipeId === meal.recipeId && m.cookedOn === meal.cookedOn);
      if (!cookedWithOther) next.cookedOn = addDays(meal.cookedOn, daysBetween(meal.date, patch.date));
    }
    await db.patch(id, next);
  },
});

export const setStatus = mutation({
  args: {
    token: v.string(),
    id: v.id("meals"),
    status: mealStatusValidator,
    leftoverPortions: v.optional(v.number()),
  },
  handler: async (ctx, { token, id, status, leftoverPortions }) => {
    const { db, member } = await requireMemberWriter(ctx, token);
    const meal = await db.get(id);
    if (!meal) throw new ConvexError("Repas introuvable.");
    if (status === MEAL_NOT_COOKED)
      throw new ConvexError("Pour un plat pas cuisiné, passe par « Pas cuisiné » sur le plat.");
    // Back from « pas cuisiné »: the whole cooking is planned again, and what it
    // had left at home is used again by the dish
    if (meal.status === MEAL_NOT_COOKED)
      for (const m of await cookedTogether(db, meal)) {
        await dropHomeStockOf(db, m._id);
        if (m._id !== id && m.status === MEAL_NOT_COOKED) await db.patch(m._id, { status: "prévu" });
      }
    if (leftoverPortions !== undefined) assertInt(leftoverPortions, 0, 60, "Portions restantes");
    // A dish not eaten goes to the fridge whole, with the extra portions cooked for later
    const extra = meal.extraPortions ?? 0;
    const placed = leftoverPortions === undefined && status !== "mangé" ? await placedFrom(db, meal) : 0;
    const portions =
      status === "pas mangé"
        ? (leftoverPortions ?? Math.max(0, meal.persons + extra - placed))
        : (leftoverPortions ?? (status === "prévu" ? Math.max(0, extra - placed) : meal.leftoverPortions));
    await db.patch(id, { status, leftoverPortions: portions, statusBy: member._id });
  },
});

export const remove = mutation({
  args: { token: v.string(), id: v.id("meals") },
  handler: async (ctx, { token, id }) => {
    const { db } = await requireMemberWriter(ctx, token);
    const meal = await db.get(id);
    if (!meal) return;
    // Give back the portions a planned leftover had taken, if not eaten yet
    if (meal.fromLeftoverOf && meal.status === "prévu") {
      const source = await db.get(meal.fromLeftoverOf);
      if (source)
        await db.patch(source._id, {
          leftoverPortions: source.leftoverPortions + meal.persons,
        });
    }
    await db.delete(id);
  },
});

/**
 * Meals made from one cooking: tonight's dinner and tomorrow's lunch cooked with
 * it (same dish, same cooking day, one of them eaten another day). Leftovers
 * planned from a dish are not part of it. The meal itself comes first.
 */
async function cookedTogether(db: FamilyDb, meal: Doc<"meals">) {
  if (meal.fromLeftoverOf) return [meal];
  const near = await mealsBetween(db, meal.cookedOn, addDays(meal.cookedOn, 1));
  const sameDish = (m: Doc<"meals">) =>
    meal.recipeId ? m.recipeId === meal.recipeId : !m.recipeId && m.title === meal.title;
  const others = near.filter(
    (m) =>
      m._id !== meal._id &&
      !m.fromLeftoverOf &&
      m.cookedOn === meal.cookedOn &&
      sameDish(m) &&
      // Two separate dishes the same day are not one cooking
      (m.date !== m.cookedOn || meal.date !== meal.cookedOn),
  );
  return [meal, ...others];
}

async function dropHomeStockOf(db: FamilyWriter, mealId: Id<"meals">) {
  for (const s of await db.query("homeStock").collect())
    if (s.fromMealId === mealId) await db.delete(s._id);
}

/** Checks of the shopping week a dish was cooked in: what was already bought for it. */
async function checksFor(db: FamilyDb, meal: Doc<"meals">) {
  const { shoppingDay } = await getSettings(db);
  const start = weekStart(meal.cookedOn, shoppingDay);
  const checks = await db.index("shoppingChecks", "by_family_period", (q) => q.eq("periodStart", start)).collect();
  return Object.fromEntries(checks.map((c) => [c.itemKey, c.checked]));
}

/**
 * Before cancelling a dish: its ingredients, with those already bought (checked
 * on the list) proposed as staying at home.
 */
export const notCookedPreview = query({
  args: { token: v.string(), id: v.id("meals") },
  handler: async (ctx, { token, id }) => {
    const { db, member } = await requireMember(ctx, token);
    const lang = member.lang ?? "fr";
    const meal = await db.own(id, "Repas introuvable.");
    const recipe = meal.recipeId ? await db.get(meal.recipeId) : null;
    if (!recipe || meal.fromLeftoverOf) return { items: [], leftoversPlanned: 0, together: [] };
    const group = await cookedTogether(db, meal);
    // Everything was bought for the whole cooking, not for this meal only
    const portions = group.reduce((sum, m) => sum + m.persons + (m.extraPortions ?? 0), 0);
    const needs = mealNeeds({ persons: portions }, recipe.items, await checksFor(db, meal));
    const items = [];
    for (const n of needs) {
      const ing = await db.get(n.ingredientId as Id<"ingredients">);
      if (ing) items.push({ ...n, ingredientId: ing._id, name: localName(ing, lang), pantry: ing.pantry ?? false });
    }
    const later = await mealsBetween(db, meal.cookedOn, addDays(meal.cookedOn, 30));
    return {
      items: items.sort((a, b) => Number(b.bought) - Number(a.bought) || a.name.localeCompare(b.name, lang)),
      leftoversPlanned: later.filter((m) => group.some((g) => g._id === m.fromLeftoverOf) && m.status === "prévu").length,
      // The other meals of this cooking, cancelled with it
      together: group.slice(1).map((m) => ({ date: m.date, slot: m.slot })),
    };
  },
});

/**
 * The dish was not cooked: it leaves the shopping list, the ingredients
 * already bought stay at home (« À utiliser »), and the leftovers planned from
 * it are withdrawn since they will never exist.
 */
export const markNotCooked = mutation({
  args: {
    token: v.string(),
    id: v.id("meals"),
    keep: v.array(v.object({ ingredientId: v.id("ingredients"), qty: v.number(), unit: unitValidator })),
  },
  handler: async (ctx, { token, id, keep }) => {
    const { db, member } = await requireMemberWriter(ctx, token);
    const meal = await db.own(id, "Repas introuvable.");
    if (meal.fromLeftoverOf) throw new ConvexError("Des restes ne se cuisinent pas : retire-les du menu.");
    if (keep.length > 60) throw new ConvexError("Trop d'ingrédients.");
    await db.ownAll(keep.map((k) => k.ingredientId), "Ingrédient introuvable.");
    for (const k of keep) assertPositiveQty(k.qty);
    const group = await cookedTogether(db, meal);
    if (group.slice(1).some((m) => m.status === "mangé" || m.status === "pas mangé"))
      throw new ConvexError("Ce plat a déjà été cuisiné pour un autre repas : marque plutôt celui-ci « Pas mangé ».");
    const recipe = meal.recipeId ? await db.get(meal.recipeId) : null;
    // One stock for the whole cooking, even if a meal of it was cancelled before
    for (const m of group) await dropHomeStockOf(db, m._id);
    for (const k of keep)
      await db.insert("homeStock", {
        ingredientId: k.ingredientId,
        qty: k.qty,
        unit: k.unit,
        since: meal.cookedOn,
        fromMealId: meal._id,
        fromName: recipe?.name ?? meal.title,
      });
    const later = await mealsBetween(db, meal.cookedOn, addDays(meal.cookedOn, 30));
    for (const m of later)
      if (group.some((g) => g._id === m.fromLeftoverOf) && m.status === "prévu") await db.delete(m._id);
    for (const m of group)
      await db.patch(m._id, { status: MEAL_NOT_COOKED, leftoverPortions: 0, statusBy: member._id });
  },
});

function assertPositiveQty(qty: number) {
  if (!Number.isFinite(qty) || qty <= 0 || qty > 100_000) throw new ConvexError("Quantité invalide.");
}

/** Leftovers in the fridge, with how long they keep. */
export const fridge = query({
  args: { token: v.string(), today: v.string() },
  handler: async (ctx, { token, today }) => {
    const { db } = await requireMember(ctx, token);
    assertDate(today);
    // Nothing keeps more than a couple of weeks: only look back 21 days
    const recent = await mealsBetween(db, addDays(today, -21), today);
    // Planned extra portions appear once the dish has been cooked
    const withLeftovers = recent.filter((m) => m.leftoverPortions > 0 && m.cookedOn <= today);
    const rows = await withRecipe(db, withLeftovers);
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
    const { db, member } = await requireMemberWriter(ctx, token);
    assertDate(date);
    assertPersons(persons);
    const source = await db.get(sourceId);
    if (!source) throw new ConvexError("Restes introuvables.");
    if (source.leftoverPortions < 1)
      throw new ConvexError("Il n'y a plus de portions de ce plat.");
    if (date < source.cookedOn) throw new ConvexError("Les restes ne peuvent pas être mangés avant d'être cuisinés.");
    const taken = Math.min(persons, source.leftoverPortions);
    await db.patch(sourceId, {
      leftoverPortions: source.leftoverPortions - taken,
    });
    return db.insert("meals", {
      date,
      slot,
      recipeId: source.recipeId,
      title: source.title,
      persons: taken,
      cookedOn: source.cookedOn,
      fromLeftoverOf: sourceId,
      status: "prévu",
      leftoverPortions: 0,
      addedBy: member._id,
    });
  },
});

export const discardLeftover = mutation({
  args: { token: v.string(), id: v.id("meals") },
  handler: async (ctx, { token, id }) => {
    const { db } = await requireMemberWriter(ctx, token);
    await db.patch(id, { leftoverPortions: 0 });
  },
});

/**
 * Recurring dish (birchermüesli every weekday morning…): one meal on each chosen
 * weekday, from `date` on, for `weeks` weeks. Days already holding this dish at
 * this slot are skipped.
 */
export const addRecurring = mutation({
  args: {
    token: v.string(),
    date: v.string(),
    slot: slotValidator,
    recipeId: v.optional(v.id("recipes")),
    title: v.optional(v.string()),
    persons: v.number(),
    weekdays: v.array(v.number()), // 0 = Sunday … 6 = Saturday
    weeks: v.number(),
  },
  handler: async (ctx, { token, date, slot, recipeId, title, persons, weekdays, weeks }) => {
    const { db, member } = await requireMemberWriter(ctx, token);
    assertDate(date);
    assertPersons(persons);
    assertInt(weeks, 1, 12, "Nombre de semaines");
    if (weekdays.length === 0 || weekdays.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) {
      throw new ConvexError("Choisis au moins un jour.");
    }
    if (!recipeId && !title?.trim()) throw new ConvexError("Choisis une recette ou écris un titre.");
    if (recipeId) await db.own(recipeId, "Recette introuvable.");
    const cleanTitle = title ? cleanText(title, 80, "Titre") || undefined : undefined;
    const end = addDays(date, weeks * 7 - 1);
    const existing = await mealsBetween(db, date, end);
    let added = 0;
    for (let day = date; day <= end; day = addDays(day, 1)) {
      if (!weekdays.includes(dayOfWeek(day))) continue;
      const twin = existing.some(
        (m) => m.date === day && m.slot === slot && (recipeId ? m.recipeId === recipeId : m.title === cleanTitle),
      );
      if (twin) continue;
      await db.insert("meals", {
        date: day,
        slot,
        recipeId,
        title: cleanTitle,
        persons,
        cookedOn: day,
        status: "prévu",
        leftoverPortions: 0,
        addedBy: member._id,
      });
      added++;
    }
    return { added };
  },
});

/**
 * Leftovers that can be eaten on `date`: dishes with spare portions, cooked on or
 * before that day and still good then (cookedOn + fridgeDays ≥ date).
 */
export const leftoversFor = query({
  args: { token: v.string(), date: v.string() },
  handler: async (ctx, { token, date }) => {
    const { db } = await requireMember(ctx, token);
    assertDate(date);
    const recent = await mealsBetween(db, addDays(date, -21), date);
    const rows = await withRecipe(
      db,
      recent.filter((m) => m.leftoverPortions > 0 && !m.fromLeftoverOf && m.cookedOn <= date),
    );
    return rows
      .map((m) => ({ ...m, until: addDays(m.cookedOn, m.recipe?.fridgeDays ?? 2) }))
      .filter((m) => m.until >= date)
      .sort((a, b) => a.until.localeCompare(b.until));
  },
});
