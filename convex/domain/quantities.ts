import type { Lang } from "./lang";
// Units, normalisation and French display of quantities.

export type Unit =
  | "g"
  | "kg"
  | "ml"
  | "l"
  | "pc"
  | "cs"
  | "cc"
  | "botte"
  | "boîte"
  | "paquet"
  | "pincée"
  | "tranche";

/** Units in the order they are offered. */
export const UNITS: Unit[] = [
  "g",
  "kg",
  "ml",
  "l",
  "pc",
  "cs",
  "cc",
  "botte",
  "boîte",
  "paquet",
  "pincée",
  "tranche",
];

export type BaseUnit = Exclude<Unit, "kg" | "l">;

/** Non-breaking space placed between a number and its unit. */
export const NBSP = " ";

// Tolerance used to absorb floating point noise before rounding up
// (e.g. 0.1 * 3 * 10 = 3.0000000000000004 must not become 4).
const EPSILON = 1e-9;

/** Converts kg to g and l to ml; other units are returned unchanged. */
export function toBase(
  qty: number,
  unit: Unit,
): { qty: number; unit: BaseUnit } {
  if (unit === "kg") return { qty: qty * 1000, unit: "g" };
  if (unit === "l") return { qty: qty * 1000, unit: "ml" };
  return { qty, unit };
}

/** True when both units can be added together (g/kg, ml/l, or the same unit). */
export function sameFamily(a: Unit, b: Unit): boolean {
  return toBase(1, a).unit === toBase(1, b).unit;
}

/** Rounds up while ignoring floating point noise. */
export function ceilSafe(value: number): number {
  return Math.ceil(value - EPSILON);
}

/**
 * Formats a number, at most `maxDecimals`, no useless zeros: French decimal
 * comma, decimal point in Swiss German (« 1,25 », « 1.25 »).
 */
export function formatNumber(
  value: number,
  maxDecimals = 2,
  lang: Lang = "fr",
): string {
  const fixed = value.toFixed(maxDecimals);
  const trimmed = maxDecimals > 0 ? fixed.replace(/\.?0+$/, "") : fixed;
  return lang === "de" ? trimmed : trimmed.replace(".", ",");
}

// Unit words in each language: [one, many]
const UNIT_WORDS: Record<
  Lang,
  Record<
    "pc" | "cs" | "cc" | "botte" | "boîte" | "paquet" | "pincée" | "tranche",
    [string, string]
  >
> = {
  fr: {
    pc: ["pièce", "pièces"],
    cs: ["c. à s.", "c. à s."],
    cc: ["c. à c.", "c. à c."],
    botte: ["botte", "bottes"],
    boîte: ["boîte", "boîtes"],
    paquet: ["paquet", "paquets"],
    pincée: ["pincée", "pincées"],
    tranche: ["tranche", "tranches"],
  },
  de: {
    pc: ["Stück", "Stück"],
    cs: ["EL", "EL"],
    cc: ["TL", "TL"],
    botte: ["Bund", "Bund"],
    boîte: ["Dose", "Dosen"],
    paquet: ["Packung", "Packungen"],
    pincée: ["Prise", "Prisen"],
    tranche: ["Scheibe", "Scheiben"],
  },
};

/** Word of a counted unit (pièce, EL, Dose…) agreed with `n`, in `lang`. */
export function unitWord(
  unit: keyof (typeof UNIT_WORDS)["fr"],
  n: number,
  lang: Lang = "fr",
): string {
  const [one, many] = UNIT_WORDS[lang][unit];
  return n > 1 ? many : one;
}

// Mass or volume: small unit below 1000, large unit (2 decimals max) above.
function formatMetric(
  qty: number,
  small: string,
  large: string,
  lang: Lang,
): string {
  let rounded = qty < 100 ? Math.round(qty) : Math.round(qty / 10) * 10;
  if (qty > 0 && rounded < 1) rounded = 1;
  if (rounded >= 1000)
    return `${formatNumber(rounded / 1000, 2, lang)}${NBSP}${large}`;
  return `${formatNumber(rounded, 0, lang)}${NBSP}${small}`;
}

// Spoons: rounded up to the next half spoon.
function formatSpoon(qty: number, unit: "cs" | "cc", lang: Lang): string {
  const rounded = qty > 0 ? Math.max(0.5, ceilSafe(qty * 2) / 2) : 0;
  return `${formatNumber(rounded, 1, lang)}${NBSP}${unitWord(unit, rounded, lang)}`;
}

// Countable packaging units: whole number, plural with "s".
function formatCount(
  qty: number,
  unit: "pc" | "botte" | "boîte" | "paquet" | "pincée" | "tranche",
  lang: Lang,
): string {
  const rounded = qty > 0 ? Math.max(1, ceilSafe(qty)) : 0;
  return `${rounded}${NBSP}${unitWord(unit, rounded, lang)}`;
}

/** Human-friendly French display of a quantity (e.g. « 1,25 kg », « 2 c. à s. »). */
export function formatQty(qty: number, unit: Unit, lang: Lang = "fr"): string {
  const base = toBase(qty, unit);
  switch (base.unit) {
    case "g":
      return formatMetric(base.qty, "g", "kg", lang);
    case "ml":
      return formatMetric(base.qty, "ml", "l", lang);
    case "cs":
    case "cc":
      return formatSpoon(base.qty, base.unit, lang);
    case "pc":
    case "botte":
    case "boîte":
    case "paquet":
    case "pincée":
    case "tranche":
      return formatCount(base.qty, base.unit, lang);
  }
}
