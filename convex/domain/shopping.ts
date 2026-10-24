// Shopping list built live from the week's meals, sorted by the chosen store's aisles.
import type { BaseUnit, Unit } from "./quantities";
import { formatQty, sameFamily, toBase } from "./quantities";

export interface ShoppingInput {
  meals: {
    _id: string;
    recipeId?: string;
    persons: number;
    fromLeftoverOf?: string;
    cookedOn?: string;
  }[];
  /** Shopping period: a dish is bought for the week it is cooked in, not eaten in. */
  period?: { start: string; end: string };
  recipes: Record<
    string,
    {
      name: string;
      items: { ingredientId: string; qtyPerPerson: number; unit: Unit }[];
    }
  >;
  ingredients: Record<
    string,
    {
      name: string;
      aisleId: string;
      unit: Unit;
      priceChf?: number;
      priceQty?: number;
      pantry?: boolean; // usually in stock at home
    }
  >;
  aisles: { _id: string; name: string; emoji: string; order: number }[];
  store?: {
    aisleOrder: string[];
    overrides: { ingredientId: string; aisleId: string }[];
    priceFactor: number;
  } | null;
  extras: {
    _id: string;
    label: string;
    qty?: number;
    unit?: Unit;
    aisleId?: string;
  }[];
  checks: Record<string, boolean>; // itemKey → checked
  /** Item keys the family already has at home this week: kept out of the list. */
  skipped?: string[];
}

export interface ShoppingItem {
  key: string; // "ing:<ingredientId>:<baseUnit>" or "extra:<extraId>"
  label: string;
  qty?: number;
  unit?: Unit;
  display: string; // formatQty, or "" without quantity
  recipes: string[]; // source recipe names, unique and sorted
  costChf?: number;
  checked: boolean;
  extra: boolean;
  ingredientId?: string;
  pantry: boolean;
}

export interface ShoppingSection {
  aisleId: string | null;
  name: string;
  emoji: string;
  items: ShoppingItem[];
}

export interface ShoppingList {
  sections: ShoppingSection[];
  total: number;
  remaining: number;
  costChf: number;
  /** Already at home: not counted, shown apart so they can be put back. */
  skipped: ShoppingItem[];
}

/** Label and emoji of the catch-all section (extras without a known aisle). */
export const MISC_SECTION = { name: "Divers", emoji: "🛒" } as const;

/** Rounds an amount to the nearest 0.05 CHF (Swiss rounding). */
export function roundChf(amount: number): number {
  return Number((Math.round(amount * 20) / 20).toFixed(2));
}

/** Item key used to store check states. */
export function ingredientItemKey(
  ingredientId: string,
  unit: BaseUnit,
): string {
  return `ing:${ingredientId}:${unit}`;
}

export function extraItemKey(extraId: string): string {
  return `extra:${extraId}`;
}

/**
 * Estimated cost of `qty` `unit` of an ingredient. `priceChf` is the price of
 * `priceQty` expressed in the ingredient's own unit. Undefined when there is
 * no price or the units cannot be compared.
 */
export function ingredientCost(
  ing: { unit: Unit; priceChf?: number; priceQty?: number },
  qty: number,
  unit: Unit,
  priceFactor = 1,
): number | undefined {
  if (
    ing.priceChf === undefined ||
    ing.priceQty === undefined ||
    ing.priceQty <= 0
  ) {
    return undefined;
  }
  if (!sameFamily(unit, ing.unit)) return undefined;
  const wanted = toBase(qty, unit).qty;
  const priced = toBase(ing.priceQty, ing.unit).qty;
  return roundChf((ing.priceChf * wanted * priceFactor) / priced);
}

/** Estimated cost of a recipe; `complete` is false when an ingredient has no usable price. */
export function recipeCost(
  recipe: {
    items: { ingredientId: string; qtyPerPerson: number; unit: Unit }[];
  },
  persons: number,
  ingredients: ShoppingInput["ingredients"],
  priceFactor = 1,
): { total: number; complete: boolean } {
  let total = 0;
  let complete = true;
  for (const item of recipe.items) {
    const ing = ingredients[item.ingredientId];
    const cost = ing
      ? ingredientCost(ing, item.qtyPerPerson * persons, item.unit, priceFactor)
      : undefined;
    if (cost === undefined) complete = false;
    else total += cost;
  }
  return { total: roundChf(total), complete };
}

/** Aisles in walking order: the store's order first, then the others by default `order`. */
export function orderAisles(
  aisles: ShoppingInput["aisles"],
  store?: ShoppingInput["store"],
): ShoppingInput["aisles"] {
  const byId = new Map(aisles.map((a) => [a._id, a]));
  const ordered: ShoppingInput["aisles"] = [];
  const seen = new Set<string>();
  for (const id of store?.aisleOrder ?? []) {
    const aisle = byId.get(id);
    if (aisle && !seen.has(id)) {
      ordered.push(aisle);
      seen.add(id);
    }
  }
  const rest = aisles
    .filter((a) => !seen.has(a._id))
    .sort((a, b) => a.order - b.order);
  return [...ordered, ...rest];
}

// Unchecked first, then alphabetical in French.
/** Unchecked first, then by label: also used by the optimistic UI. */
export function compareItems(a: ShoppingItem, b: ShoppingItem): number {
  if (a.checked !== b.checked) return a.checked ? 1 : -1;
  return a.label.localeCompare(b.label, "fr");
}

export function buildShoppingList(input: ShoppingInput): ShoppingList {
  const priceFactor = input.store?.priceFactor ?? 1;
  const overrides = new Map(
    (input.store?.overrides ?? []).map((o) => [o.ingredientId, o.aisleId]),
  );

  // 1. Sum quantities per (ingredient, base unit).
  const totals = new Map<
    string,
    { ingredientId: string; unit: BaseUnit; qty: number; recipes: Set<string> }
  >();
  for (const meal of input.meals) {
    if (!meal.recipeId || meal.fromLeftoverOf) continue;
    if (input.period && meal.cookedOn && (meal.cookedOn < input.period.start || meal.cookedOn > input.period.end)) continue;
    const recipe = input.recipes[meal.recipeId];
    if (!recipe) continue;
    for (const item of recipe.items) {
      if (!input.ingredients[item.ingredientId]) continue;
      const base = toBase(item.qtyPerPerson * meal.persons, item.unit);
      const key = ingredientItemKey(item.ingredientId, base.unit);
      const entry = totals.get(key) ?? {
        ingredientId: item.ingredientId,
        unit: base.unit,
        qty: 0,
        recipes: new Set<string>(),
      };
      entry.qty += base.qty;
      entry.recipes.add(recipe.name);
      totals.set(key, entry);
    }
  }

  // 2. Dispatch items into aisles (null = « Divers »).
  const knownAisles = new Set(input.aisles.map((a) => a._id));
  const byAisle = new Map<string | null, ShoppingItem[]>();
  const push = (aisleId: string | undefined, item: ShoppingItem) => {
    const target =
      aisleId !== undefined && knownAisles.has(aisleId) ? aisleId : null;
    const list = byAisle.get(target) ?? [];
    list.push(item);
    byAisle.set(target, list);
  };

  const skippedKeys = new Set(input.skipped ?? []);
  const skipped: ShoppingItem[] = [];
  for (const [key, entry] of totals) {
    const ing = input.ingredients[entry.ingredientId];
    const item: ShoppingItem = {
      key,
      label: ing.name,
      qty: entry.qty,
      unit: entry.unit,
      display: formatQty(entry.qty, entry.unit),
      recipes: [...entry.recipes].sort((a, b) => a.localeCompare(b, "fr")),
      costChf: ingredientCost(ing, entry.qty, entry.unit, priceFactor),
      checked: input.checks[key] ?? false,
      extra: false,
      ingredientId: entry.ingredientId,
      pantry: ing.pantry ?? false,
    };
    if (skippedKeys.has(key)) skipped.push(item);
    else push(overrides.get(entry.ingredientId) ?? ing.aisleId, item);
  }

  for (const extra of input.extras) {
    const key = extraItemKey(extra._id);
    // A quantity without unit is a number of pieces.
    const unit = extra.qty !== undefined ? (extra.unit ?? "pc") : extra.unit;
    push(extra.aisleId, {
      key,
      label: extra.label,
      qty: extra.qty,
      unit,
      display:
        extra.qty !== undefined && unit ? formatQty(extra.qty, unit) : "",
      recipes: [],
      checked: input.checks[key] ?? false,
      extra: true,
      pantry: false,
    });
  }

  // 3. Ordered, non-empty sections.
  const sections: ShoppingSection[] = [];
  for (const aisle of orderAisles(input.aisles, input.store)) {
    const items = byAisle.get(aisle._id);
    if (items?.length) {
      sections.push({
        aisleId: aisle._id,
        name: aisle.name,
        emoji: aisle.emoji,
        items: items.sort(compareItems),
      });
    }
  }
  const misc = byAisle.get(null);
  if (misc?.length) {
    sections.push({
      aisleId: null,
      ...MISC_SECTION,
      items: misc.sort(compareItems),
    });
  }

  const all = sections.flatMap((s) => s.items);
  return {
    sections,
    total: all.length,
    remaining: all.filter((i) => !i.checked).length,
    costChf: roundChf(all.reduce((sum, i) => sum + (i.costChf ?? 0), 0)),
    skipped: skipped.sort((a, b) => a.label.localeCompare(b.label, "fr")),
  };
}
