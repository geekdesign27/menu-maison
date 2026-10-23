import type { Unit } from "../../../convex/domain/quantities";
import { formatNumber, NBSP } from "../../../convex/domain/quantities";

export const UNITS: { value: Unit; label: string }[] = [
  { value: "pc", label: "pièce" },
  { value: "g", label: "g" },
  { value: "kg", label: "kg" },
  { value: "ml", label: "ml" },
  { value: "l", label: "l" },
  { value: "paquet", label: "paquet" },
  { value: "boîte", label: "boîte" },
  { value: "botte", label: "botte" },
  { value: "cs", label: "c. à s." },
  { value: "cc", label: "c. à c." },
  { value: "pincée", label: "pincée" },
];

export function unitLabel(unit: Unit): string {
  return UNITS.find((u) => u.value === unit)?.label ?? unit;
}

/** Amount with its unit, e.g. « 1 kg », « 6 pièces ». */
export function amountLabel(qty: number, unit: Unit): string {
  const label = unitLabel(unit);
  const plural =
    qty > 1 && ["pièce", "paquet", "boîte", "botte", "pincée"].includes(label);
  return `${formatNumber(qty)}${NBSP}${plural ? `${label}s` : label}`;
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
