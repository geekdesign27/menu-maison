import { NBSP } from "./quantities";
import { searchKey } from "./text";

/**
 * One line of the « Produits » list: an ingredient used in recipes or a usual
 * item bought outside recipes (staple). Both tables stay separate in the database.
 */
export type ProductKind = "ingredient" | "staple";

export interface ProductSource {
  _id: string;
  name: string;
  aisleId?: string;
  priceChf?: number;
  onlyChains?: string[];
  imageId?: string;
}

export interface RecipeUse {
  _id: string;
  name: string;
  archived: boolean;
  items: { ingredientId: string }[];
}

export interface Product<I extends ProductSource, S extends ProductSource> {
  kind: ProductKind;
  key: string; // unique across both kinds
  name: string;
  aisleId?: string;
  priced: boolean;
  hasPhoto: boolean;
  /** Recipes using this ingredient, archived ones last; always empty for a staple. */
  recipes: { _id: string; name: string; archived: boolean }[];
  ingredient?: I;
  staple?: S;
}

export function buildProducts<I extends ProductSource & { priceQty?: number }, S extends ProductSource>(
  ingredients: I[],
  staples: S[],
  recipes: RecipeUse[],
): Product<I, S>[] {
  const uses = new Map<string, { _id: string; name: string; archived: boolean }[]>();
  for (const r of recipes) {
    // A recipe listing the same ingredient twice still counts once
    for (const id of new Set(r.items.map((it) => it.ingredientId))) {
      const list = uses.get(id) ?? [];
      list.push({ _id: r._id, name: r.name, archived: r.archived });
      uses.set(id, list);
    }
  }
  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "fr");
  const rows: Product<I, S>[] = [
    ...ingredients.map((i) => ({
      kind: "ingredient" as const,
      key: `ing:${i._id}`,
      name: i.name,
      aisleId: i.aisleId,
      priced: i.priceChf !== undefined && i.priceQty !== undefined,
      hasPhoto: !!i.imageId,
      recipes: (uses.get(i._id) ?? []).sort((a, b) => Number(a.archived) - Number(b.archived) || byName(a, b)),
      ingredient: i,
    })),
    ...staples.map((s) => ({
      kind: "staple" as const,
      key: `staple:${s._id}`,
      name: s.name,
      aisleId: s.aisleId,
      priced: s.priceChf !== undefined,
      hasPhoto: !!s.imageId,
      recipes: [],
      staple: s,
    })),
  ];
  return rows.sort(byName);
}

export interface ProductFilter {
  search?: string;
  kind?: ProductKind;
  /** Aisle id, or null for products without aisle (« Divers »). */
  aisleId?: string | null;
  /** Products buyable at this chain: those restricted to it and those sold everywhere. */
  chain?: string;
  /** Only products missing their price, or their photo. */
  missing?: "price" | "photo";
}

export function filterProducts<P extends Product<ProductSource, ProductSource>>(
  rows: P[],
  filter: ProductFilter,
): P[] {
  const needle = searchKey(filter.search ?? "");
  return rows.filter((p) => {
    if (needle && !searchKey(p.name).includes(needle)) return false;
    if (filter.kind && p.kind !== filter.kind) return false;
    if (filter.aisleId !== undefined && (p.aisleId ?? null) !== filter.aisleId) return false;
    if (filter.chain) {
      const chains = (p.ingredient ?? p.staple)?.onlyChains;
      if (chains?.length && !chains.includes(filter.chain)) return false;
    }
    if (filter.missing === "price" && p.priced) return false;
    if (filter.missing === "photo" && p.hasPhoto) return false;
    return true;
  });
}

/** Why an ingredient cannot be deleted, or null when nothing uses it. */
export function deletionBlocker(recipes: { name: string; archived: boolean }[]): string | null {
  if (recipes.length === 0) return null;
  // Non-breaking spaces keep the guillemets on the same line as the name
  const names = recipes.map((r) => `«${NBSP}${r.name}${NBSP}»${r.archived ? " (archivée)" : ""}`);
  const shown = names.slice(0, 3).join(", ");
  const more = names.length > 3 ? ` et ${names.length - 3} autre${names.length - 3 > 1 ? "s" : ""}` : "";
  return `Utilisé dans ${recipes.length > 1 ? "les recettes" : "la recette"} ${shown}${more}. Retire-le d'abord de ${recipes.length > 1 ? "ces recettes" : "cette recette"}.`;
}
