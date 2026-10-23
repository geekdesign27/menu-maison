// French labels of units and parsing of amounts typed on a phone.
import {
  formatNumber,
  NBSP,
  sameFamily,
  type Unit,
} from "../../convex/domain/quantities";

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
];

// Singular and plural name of each unit, the single source of unit labels
const UNIT_NAMES: Record<Unit, { one: string; many: string }> = {
  g: { one: "g", many: "g" },
  kg: { one: "kg", many: "kg" },
  ml: { one: "ml", many: "ml" },
  l: { one: "l", many: "l" },
  pc: { one: "pièce", many: "pièces" },
  cs: { one: "c. à s.", many: "c. à s." },
  cc: { one: "c. à c.", many: "c. à c." },
  botte: { one: "botte", many: "bottes" },
  boîte: { one: "boîte", many: "boîtes" },
  paquet: { one: "paquet", many: "paquets" },
  pincée: { one: "pincée", many: "pincées" },
};

/** Unit name agreed with a quantity: « pièce », « pièces ». */
export function unitName(unit: Unit, qty = 1): string {
  const name = UNIT_NAMES[unit];
  return qty > 1 ? name.many : name.one;
}

/** Unit label in a list of choices, where the quantity is unknown: « pièce(s) ». */
export function unitChoiceLabel(unit: Unit): string {
  const { one, many } = UNIT_NAMES[unit];
  return one === many ? one : `${one}(s)`;
}

/** Amount with its unit, e.g. « 1 kg », « 6 pièces ». */
export function amountLabel(qty: number, unit: Unit): string {
  return `${formatNumber(qty)}${NBSP}${unitName(unit, qty)}`;
}

/** Units that can be added to `unit` on the shopping list. */
export function compatibleUnits(unit: Unit) {
  return UNITS.filter((u) => sameFamily(u, unit));
}

/**
 * Parses a positive decimal typed on a phone (« 1,5 » or « 1.5 »).
 * Returns undefined for an empty field, NaN for anything invalid.
 */
export function parseAmount(text: string): number | undefined {
  const trimmed = text.trim().replace(",", ".");
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) && n > 0 ? n : NaN;
}
