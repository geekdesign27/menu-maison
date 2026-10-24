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
export const UNITS: Unit[] = ["g", "kg", "ml", "l", "pc", "cs", "cc", "botte", "boîte", "paquet", "pincée", "tranche"];

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

/** Formats a number with a French decimal comma, at most `maxDecimals`, no useless zeros. */
export function formatNumber(value: number, maxDecimals = 2): string {
  const fixed = value.toFixed(maxDecimals);
  const trimmed = maxDecimals > 0 ? fixed.replace(/\.?0+$/, "") : fixed;
  return trimmed.replace(".", ",");
}

// Mass or volume: small unit below 1000, large unit (2 decimals max) above.
function formatMetric(qty: number, small: string, large: string): string {
  let rounded = qty < 100 ? Math.round(qty) : Math.round(qty / 10) * 10;
  if (qty > 0 && rounded < 1) rounded = 1;
  if (rounded >= 1000)
    return `${formatNumber(rounded / 1000, 2)}${NBSP}${large}`;
  return `${formatNumber(rounded, 0)}${NBSP}${small}`;
}

// Spoons: rounded up to the next half spoon.
function formatSpoon(qty: number, label: string): string {
  const rounded = qty > 0 ? Math.max(0.5, ceilSafe(qty * 2) / 2) : 0;
  return `${formatNumber(rounded, 1)}${NBSP}${label}`;
}

// Countable packaging units: whole number, plural with "s".
function formatCount(qty: number, singular: string): string {
  const rounded = qty > 0 ? Math.max(1, ceilSafe(qty)) : 0;
  return `${rounded}${NBSP}${rounded > 1 ? `${singular}s` : singular}`;
}

/** Human-friendly French display of a quantity (e.g. « 1,25 kg », « 2 c. à s. »). */
export function formatQty(qty: number, unit: Unit): string {
  const base = toBase(qty, unit);
  switch (base.unit) {
    case "g":
      return formatMetric(base.qty, "g", "kg");
    case "ml":
      return formatMetric(base.qty, "ml", "l");
    case "pc": {
      const n = base.qty > 0 ? Math.max(1, ceilSafe(base.qty)) : 0;
      return `${n}${NBSP}${n > 1 ? "pièces" : "pièce"}`;
    }
    case "cs":
      return formatSpoon(base.qty, "c. à s.");
    case "cc":
      return formatSpoon(base.qty, "c. à c.");
    case "botte":
    case "boîte":
    case "paquet":
    case "pincée":
    case "tranche":
      return formatCount(base.qty, base.unit);
  }
}
