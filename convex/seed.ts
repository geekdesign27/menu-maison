import { internalMutation, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { AISLES, INGREDIENTS, MEMBERS, RECIPES, STORES } from "./seedData";
import { DEFAULT_SETTINGS } from "./lib";

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
  return true;
}

/** `npx convex run seed:run` on a fresh deployment. */
export const run = internalMutation({
  args: {},
  handler: async (ctx) => ({ seeded: await seedIfEmpty(ctx) }),
});
