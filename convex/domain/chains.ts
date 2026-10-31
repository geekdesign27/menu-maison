// Store chains: Swiss retail brands plus three kinds of shop that are not a
// brand (specialty shop, market, other). One list for the schema, receipts,
// the shopping list and the screens.
import type { Lang } from "./lang";

/**
 * Stored values. Brands keep their own name; the other kinds use ASCII keys
 * because a chain also serves as an object key (prices per chain), and Convex
 * field names only accept ASCII.
 */
export const CHAINS = [
  // Supermarkets
  "Migros",
  "Coop",
  "Denner",
  "Aldi",
  "Lidl",
  "Volg",
  "Spar",
  "Manor",
  "Globus",
  "Landi",
  "Aligro",
  "Otto's",
  // Convenience stores
  "Migrolino",
  "Coop Pronto",
  "avec",
  // Not a brand
  "Specialise",
  "Marche",
  "Autre",
] as const;
export type Chain = (typeof CHAINS)[number];

export type ChainKind = "supermarket" | "convenience" | "shop";

const CONVENIENCE: readonly Chain[] = ["Migrolino", "Coop Pronto", "avec"];
const NOT_BRANDS: readonly Chain[] = ["Specialise", "Marche", "Autre"];

export function chainKind(chain: Chain): ChainKind {
  if (NOT_BRANDS.includes(chain)) return "shop";
  return CONVENIENCE.includes(chain) ? "convenience" : "supermarket";
}

/** Brands only: what « Disponible seulement chez » can restrict a product to. */
export const BRANDS: Chain[] = CHAINS.filter((c) => !NOT_BRANDS.includes(c));

export function isChain(value: unknown): value is Chain {
  return CHAINS.includes(value as Chain);
}

/** Markets and small shops keep their own hours; chains are open all day. */
export function hasOpeningHours(chain: Chain): boolean {
  return chainKind(chain) === "shop";
}

const SHOP_NAMES: Record<
  "Specialise" | "Marche" | "Autre",
  Record<Lang, string>
> = {
  Specialise: { fr: "Magasin spécialisé", de: "Fachgeschäft" },
  Marche: { fr: "Marché", de: "Markt" },
  Autre: { fr: "Autre", de: "Andere" },
};

/** Name as shown: brands as they are, the other kinds in the member's language. */
export function chainName(chain: Chain, lang: Lang = "fr"): string {
  return chain === "Specialise" || chain === "Marche" || chain === "Autre"
    ? SHOP_NAMES[chain][lang]
    : chain;
}

/** Store name proposed when the chain is picked: « Coop … », « Marché de … ». */
export function namePrefill(chain: Chain, lang: Lang = "fr"): string {
  if (chain === "Marche") return lang === "de" ? "Markt " : "Marché de ";
  return chainKind(chain) === "shop" ? "" : chain + " ";
}

/** Price level of a new store, against the average (1). Kept within the editor's 0.8 to 1.2. */
export const DEFAULT_PRICE_FACTOR: Record<Chain, number> = {
  Migros: 1,
  Coop: 1.05,
  Denner: 0.88,
  Aldi: 0.82,
  Lidl: 0.82,
  Volg: 1.1,
  Spar: 1.05,
  Manor: 1.1,
  Globus: 1.2,
  Landi: 0.95,
  Aligro: 0.9,
  "Otto's": 0.9,
  Migrolino: 1.1,
  "Coop Pronto": 1.15,
  avec: 1.15,
  Specialise: 1.15,
  Marche: 1.1,
  Autre: 1,
};
