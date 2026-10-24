import { internalMutation, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { AISLES, INGREDIENTS, MEMBERS, RECIPES, STAPLES, STORES } from "./seedData";
import { DEFAULT_SETTINGS } from "./lib";

/** Aisles whose products usually stay in stock at home (bought in bulk, not every week). */
const PANTRY_AISLES = new Set(["pates-riz", "conserves", "epices", "huiles", "petit-dej"]);
const PANTRY_AISLE_NAMES = new Set(AISLES.filter((a) => PANTRY_AISLES.has(a.key)).map((a) => a.name));

/** Fills an empty deployment with members, aisles, ingredients, recipes and stores. */
export async function seedIfEmpty(ctx: MutationCtx) {
  if (await ctx.db.query("members").first()) return false;

  for (const [order, m] of MEMBERS.entries()) {
    await ctx.db.insert("members", { ...m, order });
  }

  const aisleIds = new Map<string, Id<"aisles">>();
  for (const [order, a] of AISLES.entries()) {
    aisleIds.set(
      a.key,
      await ctx.db.insert("aisles", { name: a.name, emoji: a.emoji, order }),
    );
  }

  const ingredientIds = new Map<string, Id<"ingredients">>();
  for (const ing of INGREDIENTS) {
    const aisleId = aisleIds.get(ing.aisle);
    if (!aisleId) throw new Error(`Unknown aisle ${ing.aisle} for ${ing.name}`);
    ingredientIds.set(
      ing.name,
      await ctx.db.insert("ingredients", {
        name: ing.name,
        aisleId,
        unit: ing.unit,
        priceChf: ing.priceChf,
        priceQty: ing.priceQty,
        pantry: PANTRY_AISLES.has(ing.aisle),
      }),
    );
  }

  for (const r of RECIPES) {
    await ctx.db.insert("recipes", {
      name: r.name,
      emoji: r.emoji,
      description: r.description,
      tags: r.tags,
      prepMinutes: r.prepMinutes,
      fridgeDays: r.fridgeDays,
      steps: r.steps,
      items: r.items.map((it) => {
        const ingredientId = ingredientIds.get(it.ingredient);
        if (!ingredientId)
          throw new Error(`Unknown ingredient ${it.ingredient} in ${r.name}`);
        return { ingredientId, qtyPerPerson: it.qtyPerPerson, unit: it.unit };
      }),
      saved: false,
      archived: false,
    });
  }

  let firstStore: Id<"stores"> | undefined;
  for (const s of STORES) {
    const id = await ctx.db.insert("stores", {
      chain: s.chain,
      name: s.name,
      aisleOrder: s.aisleOrder.map((key) => aisleIds.get(key)!).filter(Boolean),
      overrides: [],
      priceFactor: s.priceFactor,
      archived: false,
    });
    firstStore ??= id;
  }

  await ctx.db.insert("settings", {
    ...DEFAULT_SETTINGS,
    defaultStoreId: firstStore,
  });
  await seedStaples(ctx);
  return true;
}

/** `npx convex run seed:run` on a fresh deployment. */
export const run = internalMutation({
  args: {},
  handler: async (ctx) => ({ seeded: await seedIfEmpty(ctx) }),
});

/**
 * One-off migration (2026-10-24): marks pantry ingredients on deployments seeded
 * before the "souvent en stock" flag existed. Leaves already-set flags alone.
 * `npx convex run seed:setPantryDefaults`
 */
export const setPantryDefaults = internalMutation({
  args: {},
  handler: async (ctx) => {
    const aisles = await ctx.db.query("aisles").collect();
    const pantryAisles = new Set(aisles.filter((a) => PANTRY_AISLE_NAMES.has(a.name)).map((a) => a._id));
    let updated = 0;
    for (const ing of await ctx.db.query("ingredients").collect()) {
      if (ing.pantry !== undefined) continue;
      await ctx.db.patch(ing._id, { pantry: pantryAisles.has(ing.aisleId) });
      updated++;
    }
    return { updated };
  },
});

/** Usual household items, matched to aisles by name (works on older deployments too). */
async function seedStaples(ctx: MutationCtx) {
  if (await ctx.db.query("staples").first()) return 0;
  const aisles = await ctx.db.query("aisles").collect();
  const byKey = new Map(AISLES.map((a) => [a.key, aisles.find((x) => x.name === a.name)?._id]));
  for (const s of STAPLES) {
    await ctx.db.insert("staples", { name: s.name, aisleId: byKey.get(s.aisle), useCount: 0 });
  }
  return STAPLES.length;
}

/** One-off migration (2026-10-24): `npx convex run seed:addStaples` on deployments seeded before staples existed. */
export const addStaples = internalMutation({
  args: {},
  handler: async (ctx) => ({ added: await seedStaples(ctx) }),
});

const RENAMED_RECIPES: Record<string, string> = { "Birchermüesli du soir": "Birchermüesli" };

/**
 * Adds seed recipes missing from an existing deployment (matched by name), when all
 * their ingredients exist. `npx convex run seed:addMissingRecipes`
 */
export const addMissingRecipes = internalMutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("recipes").collect();
    // Seed recipes renamed since: update the old one in place instead of adding a twin
    for (const [oldName, newName] of Object.entries(RENAMED_RECIPES)) {
      const before = all.find((r) => r.name === oldName);
      const seed = RECIPES.find((r) => r.name === newName);
      if (before && seed && !all.some((r) => r.name === newName)) {
        await ctx.db.patch(before._id, { name: seed.name, description: seed.description, tags: seed.tags });
        before.name = newName;
      }
    }
    const existing = new Set(all.map((r) => r.name));
    const ingredients = new Map((await ctx.db.query("ingredients").collect()).map((i) => [i.name, i._id]));
    const added: string[] = [];
    for (const r of RECIPES) {
      if (existing.has(r.name)) continue;
      const items = r.items.map((it) => ({ ingredientId: ingredients.get(it.ingredient), qtyPerPerson: it.qtyPerPerson, unit: it.unit }));
      if (items.some((i) => !i.ingredientId)) continue;
      await ctx.db.insert("recipes", {
        name: r.name,
        emoji: r.emoji,
        description: r.description,
        tags: r.tags,
        prepMinutes: r.prepMinutes,
        fridgeDays: r.fridgeDays,
        steps: r.steps,
        items: items.map((i) => ({ ...i, ingredientId: i.ingredientId! })),
        saved: false,
        archived: false,
      });
      added.push(r.name);
    }
    return { added };
  },
});
