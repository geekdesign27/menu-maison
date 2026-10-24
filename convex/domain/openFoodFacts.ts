// Open Food Facts: reading products, proposing a generic ingredient, recipe
// allergens and nutrition. The family ingredient stays generic (« Spaghetti »):
// the product only lends its photo, allergens and nutrition values.
import { toBase, type Unit } from "./quantities";
import { searchKey } from "./text";

export type Nutriscore = "a" | "b" | "c" | "d" | "e";

/** Nutrition per 100 g (or 100 ml for drinks). */
export interface Nutrition {
  kcal?: number;
  fat?: number;
  saturatedFat?: number;
  carbs?: number;
  sugars?: number;
  fiber?: number;
  proteins?: number;
  salt?: number;
}

/** What an ingredient keeps from its Open Food Facts product. */
export interface OffData {
  code: string;
  productName: string;
  allergens: string[];
  nutriscore?: Nutriscore;
  per100?: Nutrition;
}

/** One product of a search, as shown in the result list. */
export interface OffHit extends OffData {
  brands: string[];
  imageUrl?: string;
  thumbUrl?: string;
  categories: string[];
  liquid: boolean;
}

/** The 14 allergens food labels must declare in Switzerland and the EU. */
export const ALLERGENS: Record<string, string> = {
  "en:gluten": "Gluten",
  "en:crustaceans": "Crustacés",
  "en:eggs": "Œufs",
  "en:fish": "Poisson",
  "en:peanuts": "Arachides",
  "en:soybeans": "Soja",
  "en:milk": "Lait",
  "en:nuts": "Fruits à coque",
  "en:celery": "Céleri",
  "en:mustard": "Moutarde",
  "en:sesame-seeds": "Sésame",
  "en:sulphur-dioxide-and-sulphites": "Sulfites",
  "en:lupin": "Lupin",
  "en:molluscs": "Mollusques",
};

const NUTRIENTS: [keyof Nutrition, string][] = [
  ["kcal", "energy-kcal_100g"],
  ["fat", "fat_100g"],
  ["saturatedFat", "saturated-fat_100g"],
  ["carbs", "carbohydrates_100g"],
  ["sugars", "sugars_100g"],
  ["fiber", "fiber_100g"],
  ["proteins", "proteins_100g"],
  ["salt", "salt_100g"],
];

const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const finite = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : undefined;
const strings = (v: unknown) =>
  Array.isArray(v) ? v.map(text).filter(Boolean) : [];

/** Reads one product of the Open Food Facts API; null when unusable (no code or name). */
export function parseOffProduct(raw: unknown): OffHit | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  const code = text(p.code);
  const productName = text(p.product_name_fr) || text(p.product_name);
  if (!/^\d{4,14}$/.test(code) || !productName) return null;

  const n = (
    p.nutriments && typeof p.nutriments === "object" ? p.nutriments : {}
  ) as Record<string, unknown>;
  const per100: Nutrition = {};
  for (const [key, field] of NUTRIENTS) {
    const value = finite(n[field]);
    if (value !== undefined) per100[key] = value;
  }
  // Some products only give the energy in kJ
  const kj = finite(n["energy-kj_100g"]);
  if (per100.kcal === undefined && kj !== undefined)
    per100.kcal = Math.round(kj / 4.184);

  const grade = text(p.nutriscore_grade).toLowerCase();
  const brands = (
    Array.isArray(p.brands)
      ? strings(p.brands)
      : text(p.brands)
          .split(",")
          .map((b) => b.trim())
  ).filter(Boolean);
  const quantity = text(p.quantity).toLowerCase();
  return {
    code,
    productName: productName.slice(0, 120),
    brands: [...new Set(brands)],
    allergens: strings(p.allergens_tags).filter((t) => t in ALLERGENS),
    nutriscore: (["a", "b", "c", "d", "e"] as const).find((g) => g === grade),
    per100: Object.keys(per100).length ? per100 : undefined,
    imageUrl: text(p.image_front_url) || undefined,
    thumbUrl:
      text(p.image_front_small_url) || text(p.image_front_url) || undefined,
    categories: strings(p.categories_tags),
    liquid:
      text(p.nutrition_data_per) === "100ml" ||
      /\d\s*(ml|cl|dl|l)\b/.test(quantity),
  };
}

/**
 * Generic name proposed for the family ingredient: brands, sizes and pack
 * numbers removed (« Barilla Spaghetti n°5 500 g » → « Spaghetti »).
 */
export function shortName(productName: string, brands: string[], query = ""): string {
  // A brand named like the searched food (« Edamame ») is part of the name here
  const searched = searchKey(query);
  let name = ` ${productName} `;
  const removable = brands.filter((b) => !searched || !searched.includes(searchKey(b)));
  for (const brand of [...removable].sort((a, b) => b.length - a.length)) {
    const escaped = brand.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (escaped)
      name = name.replace(
        new RegExp(`(^|[\\s,-])${escaped}(?=[\\s,-]|$)`, "gi"),
        " ",
      );
  }
  name = name
    .replace(/\b\d+([.,]\d+)?\s?(g|kg|ml|cl|dl|l)\b/gi, " ")
    .replace(/\bn\s?[°ºo]\s?\d+\b/gi, " ")
    .replace(/[\s,-]+/g, " ")
    .trim();
  if (!name) return productName.trim();
  return name.charAt(0).toUpperCase() + name.slice(1);
}

// Open Food Facts category → default aisle name of the app (first match wins)
const AISLE_RULES: [string[], string][] = [
  [["en:frozen-foods"], "Surgelés"],
  [["en:cheeses"], "Fromages"],
  [
    ["en:hams", "en:sausages", "en:salamis", "en:prepared-meats"],
    "Charcuterie",
  ],
  [["en:fishes", "en:seafood"], "Poissonnerie"],
  [["en:meats", "en:poultries"], "Boucherie et volaille"],
  [
    [
      "en:milks",
      "en:yogurts",
      "en:creams",
      "en:butters",
      "en:eggs",
      "en:dairies",
    ],
    "Produits laitiers et œufs",
  ],
  [["en:breads"], "Boulangerie"],
  [
    ["en:pastas", "en:rices", "en:cereal-grains", "en:couscous", "en:quinoa"],
    "Pâtes, riz et céréales",
  ],
  [["en:vegetable-oils", "en:vinegars"], "Huiles et vinaigres"],
  [
    ["en:spices", "en:condiments", "en:salts", "en:herbs"],
    "Épices et condiments",
  ],
  [
    ["en:canned-foods", "en:sauces", "en:tomato-sauces", "en:broths"],
    "Conserves et sauces",
  ],
  [
    [
      "en:breakfast-cereals",
      "en:flours",
      "en:sugars",
      "en:spreads",
      "en:jams",
      "en:baking-decorations",
    ],
    "Petit-déjeuner et pâtisserie",
  ],
  [["en:beverages"], "Boissons"],
  [
    ["en:fruits", "en:vegetables", "en:fresh-vegetables", "en:fresh-fruits"],
    "Fruits et légumes",
  ],
];

/** Name of the aisle that usually holds this product, or null when unsure. */
export function suggestAisleName(categories: string[]): string | null {
  const set = new Set(categories);
  return (
    AISLE_RULES.find(([tags]) => tags.some((t) => set.has(t)))?.[1] ?? null
  );
}

/**
 * Ingredient already in the catalog for this product: the same barcode first,
 * then the same name (accents and case ignored), else null.
 */
export function findExisting<
  T extends { _id: string; name: string; off?: { code: string } },
>(
  ingredients: T[],
  code: string,
  name: string,
): { by: "code" | "name"; ingredient: T } | null {
  const byCode = ingredients.find((i) => i.off?.code === code);
  if (byCode) return { by: "code", ingredient: byCode };
  const key = searchKey(name);
  const byName = ingredients.find((i) => searchKey(i.name) === key);
  return byName ? { by: "name", ingredient: byName } : null;
}

export function allergenLabels(tags: string[]): string[] {
  return [...new Set(tags.map((t) => ALLERGENS[t]).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b, "fr"),
  );
}

interface RecipeItem {
  ingredientId: string;
  qtyPerPerson: number;
  unit: Unit;
}
interface IngredientInfo {
  off?: { allergens: string[]; per100?: Nutrition };
}

/** Allergens of a recipe, and how many of its ingredients are documented. */
export function recipeAllergens(
  items: RecipeItem[],
  ingredients: Record<string, IngredientInfo | undefined>,
) {
  const ids = [...new Set(items.map((i) => i.ingredientId))];
  const documented = ids.filter((id) => ingredients[id]?.off);
  return {
    labels: allergenLabels(
      documented.flatMap((id) => ingredients[id]!.off!.allergens),
    ),
    known: documented.length,
    total: ids.length,
  };
}

// Approximate weight of a spoon, a pinch; ml count as g (density close to 1)
const GRAMS: Partial<Record<Unit, number>> = { cs: 15, cc: 5, pincée: 0.5 };

/** Grams (or ml) of one recipe item, null for units without a weight (pièce, botte…). */
export function itemGrams(qty: number, unit: Unit): number | null {
  const base = toBase(qty, unit);
  if (base.unit === "g" || base.unit === "ml") return base.qty;
  const perUnit = GRAMS[unit];
  return perUnit === undefined ? null : qty * perUnit;
}

export interface PortionNutrition {
  kcal: number;
  proteins: number;
  carbs: number;
  sugars: number;
  fat: number;
  salt: number;
  /** Ingredients counted / ingredients in the recipe: below total, the figures are partial. */
  covered: number;
  total: number;
}

/** Nutrition of one portion, from the ingredients with values and a weighable quantity. */
export function recipeNutrition(
  items: RecipeItem[],
  ingredients: Record<string, IngredientInfo | undefined>,
): PortionNutrition {
  const sum = { kcal: 0, proteins: 0, carbs: 0, sugars: 0, fat: 0, salt: 0 };
  const counted = new Set<string>();
  for (const item of items) {
    const per100 = ingredients[item.ingredientId]?.off?.per100;
    const grams = itemGrams(item.qtyPerPerson, item.unit);
    if (!per100 || per100.kcal === undefined || grams === null) continue;
    counted.add(item.ingredientId);
    for (const key of Object.keys(sum) as (keyof typeof sum)[])
      sum[key] += ((per100[key] ?? 0) * grams) / 100;
  }
  const round1 = (n: number) => Math.round(n * 10) / 10;
  return {
    kcal: Math.round(sum.kcal),
    proteins: round1(sum.proteins),
    carbs: round1(sum.carbs),
    sugars: round1(sum.sugars),
    fat: round1(sum.fat),
    salt: round1(sum.salt),
    covered: counted.size,
    total: new Set(items.map((i) => i.ingredientId)).size,
  };
}
