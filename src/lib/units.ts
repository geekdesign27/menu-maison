// Labels of units (French, German) and parsing of amounts typed on a phone.
import {
  formatNumber,
  NBSP,
  sameFamily,
  UNITS,
  type Unit,
} from "../../convex/domain/quantities";
import type { Lang } from "../../convex/domain/lang";

export { UNITS };

// Singular and plural name of each unit, the single source of unit labels
const UNIT_NAMES_FR: Record<Unit, { one: string; many: string }> = {
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
  tranche: { one: "tranche", many: "tranches" },
};

const UNIT_NAMES_DE: Record<Unit, { one: string; many: string }> = {
  g: { one: "g", many: "g" },
  kg: { one: "kg", many: "kg" },
  ml: { one: "ml", many: "ml" },
  l: { one: "l", many: "l" },
  pc: { one: "Stück", many: "Stück" },
  cs: { one: "EL", many: "EL" },
  cc: { one: "TL", many: "TL" },
  botte: { one: "Bund", many: "Bund" },
  boîte: { one: "Dose", many: "Dosen" },
  paquet: { one: "Packung", many: "Packungen" },
  pincée: { one: "Prise", many: "Prisen" },
  tranche: { one: "Scheibe", many: "Scheiben" },
};

const UNIT_NAMES: Record<Lang, Record<Unit, { one: string; many: string }>> = {
  fr: UNIT_NAMES_FR,
  de: UNIT_NAMES_DE,
};

/** Unit name agreed with a quantity: « pièce », « pièces ». */
export function unitName(unit: Unit, qty = 1, lang: Lang = "fr"): string {
  const name = UNIT_NAMES[lang][unit];
  return qty > 1 ? name.many : name.one;
}

/** Unit label in a list of choices, where the quantity is unknown: « pièce(s) ». */
export function unitChoiceLabel(unit: Unit, lang: Lang = "fr"): string {
  const { one, many } = UNIT_NAMES[lang][unit];
  return one === many ? one : `${one}(s)`;
}

/** Amount with its unit, e.g. « 1 kg », « 6 pièces ». */
export function amountLabel(
  qty: number,
  unit: Unit,
  lang: Lang = "fr",
): string {
  return `${formatNumber(qty, 2, lang)}${NBSP}${unitName(unit, qty, lang)}`;
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
