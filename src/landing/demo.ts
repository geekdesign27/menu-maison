// The example week of the landing page: the app's own shopping logic run on
// the starting catalog every family receives. Local data only: nothing here
// reads or writes a family's data.
import { AISLES, INGREDIENTS, RECIPES, STORES } from "../../convex/seedData";
import {
  buildShoppingList,
  recipeCost,
  type ShoppingInput,
  type ShoppingList,
} from "../../convex/domain/shopping";
import { addDays } from "../../convex/domain/dates";
import { localName, type Lang } from "../../convex/domain/lang";
import { NAMES_DE } from "../../convex/seedNamesDe";

/** A starter catalogue name in the page language (German from seedNamesDe.ts). */
const named = (name: string, lang: Lang) => localName({ name, nameDe: NAMES_DE[name] }, lang);

// Ingredients stay keyed by their French name (stable id), only the shown name follows the language
function catalog(lang: Lang): ShoppingInput["ingredients"] {
  return Object.fromEntries(
    INGREDIENTS.map((i) => [
      i.name,
      { name: named(i.name, lang), aisleId: i.aisle, unit: i.unit, priceChf: i.priceChf, priceQty: i.priceQty },
    ]),
  );
}

const ingredients = catalog("fr");

function aislesIn(lang: Lang): ShoppingInput["aisles"] {
  return AISLES.map((a, order) => ({ _id: a.key, name: named(a.name, lang), emoji: a.emoji, order }));
}

function recipe(name: string) {
  const r = RECIPES.find((x) => x.name === name);
  if (!r) throw new Error(`Missing starting recipe ${name}`);
  return {
    name: r.name,
    emoji: r.emoji,
    fridgeDays: r.fridgeDays,
    items: r.items.map((i) => ({ ingredientId: i.ingredient, qtyPerPerson: i.qtyPerPerson, unit: i.unit })),
  };
}

export const LASAGNES = recipe("Lasagnes bolognaise");
export const ROAST_CHICKEN = recipe("Poulet rôti et légumes du four");

function store(name: string) {
  const s = STORES.find((x) => x.name === name);
  if (!s) throw new Error(`Missing starting store ${name}`);
  return { name: s.name, chain: s.chain, aisleOrder: s.aisleOrder, overrides: [], priceFactor: s.priceFactor };
}

export const DEMO_STORES = [store("Aldi Marly"), store("Coop Fribourg Centre"), store("Migros Avry")];
export type DemoStore = (typeof DEMO_STORES)[number];

/** Wednesday 28 October 2026: the lasagnes of the story. */
export const LASAGNES_DAY = "2026-10-28";

export interface Portions {
  tonight: number;
  tomorrowLunch: number;
  extra: number;
}

/** 6 portions of lasagnes: 3 tonight, 2 for Thursday lunch, 1 more for the fridge. */
export const STORY_PORTIONS: Portions = { tonight: 3, tomorrowLunch: 2, extra: 1 };

/** Sunday's roast chicken, the other dish with carrots this week. */
export const CHICKEN_PORTIONS = 3;

/** The example week's list, as the app builds it for one store, in the page language. */
export function demoList(
  target: DemoStore = DEMO_STORES[0],
  portions: Portions = STORY_PORTIONS,
  lang: Lang = "fr",
): ShoppingList {
  // Tomorrow's lunch is its own meal, cooked the same evening: the app adds the quantities up
  const meals: ShoppingInput["meals"] = [
    { _id: "mer-soir", recipeId: LASAGNES.name, persons: portions.tonight, extraPortions: portions.extra, cookedOn: LASAGNES_DAY },
    { _id: "dim-soir", recipeId: ROAST_CHICKEN.name, persons: CHICKEN_PORTIONS },
  ];
  if (portions.tomorrowLunch > 0)
    meals.push({ _id: "jeu-midi", recipeId: LASAGNES.name, persons: portions.tomorrowLunch, cookedOn: LASAGNES_DAY });
  return buildShoppingList({
    meals,
    recipes: { [LASAGNES.name]: LASAGNES, [ROAST_CHICKEN.name]: ROAST_CHICKEN },
    ingredients: lang === "fr" ? ingredients : catalog(lang),
    aisles: aislesIn(lang),
    store: target,
    extras: [
      { _id: "tresse", label: named("Tresse au beurre", lang), aisleId: "boulangerie" },
      { _id: "cafe", label: named("Café en grains", lang), aisleId: "petit-dej" },
    ],
    checks: {},
    lang,
  });
}

/** One ingredient line of the list, found by the ingredient's French name (its id), whatever the language. */
export function demoItem(list: ShoppingList, ingredient: string) {
  return list.sections.flatMap((s) => s.items).find((i) => i.ingredientId === ingredient);
}

/** What each dish alone needs of one ingredient, in the recipe's unit. */
export function needFor(r: typeof LASAGNES, portions: number, ingredient: string) {
  const item = r.items.find((i) => i.ingredientId === ingredient);
  return item ? item.qtyPerPerson * portions : 0;
}

/** Estimated cost of a dish at a store, as on the recipe page. */
export function demoRecipeCost(r: typeof LASAGNES, portions: number, target: DemoStore) {
  return recipeCost(r, portions, ingredients, target.priceFactor, target.chain).total;
}

/** Last day the fridge portions are shown as good, from the recipe's keeping time. */
export function goodUntil(r: typeof LASAGNES, cookedOn = LASAGNES_DAY) {
  return addDays(cookedOn, r.fridgeDays);
}
