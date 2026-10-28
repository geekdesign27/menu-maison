import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { AISLES, INGREDIENTS, RECIPES, STAPLES, STORES } from "./seedData";
import { NAMES_DE } from "./seedNamesDe";
import { DEFAULT_SETTINGS, familyWriter } from "./lib";

/** Aisles whose products usually stay in stock at home (bought in bulk, not every week). */
const PANTRY_AISLES = new Set(["pates-riz", "conserves", "epices", "huiles", "petit-dej"]);

/**
 * Gives a new family its starting catalog: aisles, ingredients, recipes to
 * discover, Swiss stores, settings and usual items. Members are created apart.
 */
export async function seedFamily(ctx: MutationCtx, familyId: Id<"families">) {
  const db = familyWriter(ctx.db, familyId);
  if (await db.query("aisles").first()) return false;

  const aisleIds = new Map<string, Id<"aisles">>();
  for (const [order, a] of AISLES.entries()) {
    aisleIds.set(a.key, await db.insert("aisles", { name: a.name, nameDe: NAMES_DE[a.name], emoji: a.emoji, order }));
  }

  const ingredientIds = new Map<string, Id<"ingredients">>();
  for (const ing of INGREDIENTS) {
    const aisleId = aisleIds.get(ing.aisle);
    if (!aisleId) throw new Error(`Unknown aisle ${ing.aisle} for ${ing.name}`);
    ingredientIds.set(
      ing.name,
      await db.insert("ingredients", {
        name: ing.name,
        nameDe: NAMES_DE[ing.name],
        aisleId,
        unit: ing.unit,
        priceChf: ing.priceChf,
        priceQty: ing.priceQty,
        pantry: PANTRY_AISLES.has(ing.aisle),
      }),
    );
  }

  for (const r of RECIPES) {
    await db.insert("recipes", {
      name: r.name,
      emoji: r.emoji,
      description: r.description,
      tags: r.tags,
      prepMinutes: r.prepMinutes,
      fridgeDays: r.fridgeDays,
      defaultPersons: r.defaultPersons,
      steps: r.steps,
      items: r.items.map((it) => {
        const ingredientId = ingredientIds.get(it.ingredient);
        if (!ingredientId) throw new Error(`Unknown ingredient ${it.ingredient} in ${r.name}`);
        return { ingredientId, qtyPerPerson: it.qtyPerPerson, unit: it.unit };
      }),
      saved: false,
      archived: false,
    });
  }

  let firstStore: Id<"stores"> | undefined;
  for (const s of STORES) {
    const id = await db.insert("stores", {
      chain: s.chain,
      name: s.name,
      aisleOrder: s.aisleOrder.map((key) => aisleIds.get(key)!).filter(Boolean),
      overrides: [],
      priceFactor: s.priceFactor,
      archived: false,
    });
    firstStore ??= id;
  }

  // New families get the guide for new members, an admin can switch it off
  await db.insert("settings", { ...DEFAULT_SETTINGS, defaultStoreId: firstStore, onboarding: true });
  for (const st of STAPLES) {
    await db.insert("staples", { name: st.name, nameDe: NAMES_DE[st.name], aisleId: aisleIds.get(st.aisle), useCount: 0 });
  }
  return true;
}
