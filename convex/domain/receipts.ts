// Shop receipts: checking what Claude read, turning a receipt line into a
// price for one product at one chain, and remembering how a chain labels it.
import type { Unit } from "./quantities";
import { searchKey } from "./text";

export const CHAINS = [
  "Aldi",
  "Lidl",
  "Coop",
  "Migros",
  "Denner",
  "Autre",
] as const;
export type Chain = (typeof CHAINS)[number];

/** Bags, discounts and deposits never update a product price. */
export type LineKind = "product" | "bag" | "discount" | "deposit";

export interface ReceiptLine {
  label: string;
  quantity: number; // items bought (1 for weighed products)
  unitPrice: number; // CHF per item
  total: number; // CHF for the line
  weightKg: number; // 0 when not weighed
  pricePerKg: number; // 0 when not weighed
  kind: LineKind;
  /** Catalog key proposed by Claude (« i12 », « s3 »), or "" for an item off the list. */
  match: string;
}

export interface Receipt {
  chain: Chain;
  date: string; // YYYY-MM-DD, "" when unreadable
  total: number;
  lines: ReceiptLine[];
}

const num = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) ? v : 0;
const str = (v: unknown, max: number) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

/** Validates the JSON returned by Claude; throws when it is not a receipt. */
export function parseReceipt(raw: unknown): Receipt {
  if (!raw || typeof raw !== "object") throw new Error("Réponse illisible");
  const r = raw as Record<string, unknown>;
  const chain = CHAINS.find((c) => c === r.chain) ?? "Autre";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(str(r.date, 10))
    ? str(r.date, 10)
    : "";
  const lines = (Array.isArray(r.lines) ? r.lines : [])
    .map((l): ReceiptLine | null => {
      if (!l || typeof l !== "object") return null;
      const line = l as Record<string, unknown>;
      const label = str(line.label, 80);
      if (!label || looksLikeCardNumber(label)) return null;
      const kinds: LineKind[] = ["product", "bag", "discount", "deposit"];
      return {
        label,
        quantity: Math.max(1, num(line.quantity)),
        unitPrice: num(line.unitPrice),
        total: num(line.total),
        weightKg: Math.max(0, num(line.weightKg)),
        pricePerKg: Math.max(0, num(line.pricePerKg)),
        kind: kinds.find((k) => k === line.kind) ?? "product",
        match: /^[is]\d+$/.test(str(line.match, 8)) ? str(line.match, 8) : "",
      };
    })
    .filter((l): l is ReceiptLine => l !== null);
  if (lines.length === 0)
    throw new Error("Aucune ligne de produit lue sur ce ticket.");
  return { chain, date, total: Math.max(0, num(r.total)), lines };
}

/** Sum of the lines, and whether it matches the total printed on the receipt. */
export function checkTotal(receipt: Receipt): {
  sum: number;
  matches: boolean;
} {
  const sum =
    Math.round(receipt.lines.reduce((s, l) => s + l.total, 0) * 100) / 100;
  return { sum, matches: Math.abs(sum - receipt.total) < 0.05 };
}

/** Key under which a chain's label is remembered (accents, case, spaces ignored). */
export function labelKey(label: string): string {
  return searchKey(label).replace(/\s+/g, " ");
}

export function isWeighed(
  line: Pick<ReceiptLine, "weightKg" | "pricePerKg">,
): boolean {
  return line.weightKg > 0 && line.pricePerKg > 0;
}

/**
 * Price of an ingredient read from a line, in the ingredient's own unit:
 * weighed lines give the kilo price, other lines need the pack content
 * (« 10 » eggs, « 500 » g). Null when the content is still unknown.
 */
export function ingredientPrice(
  line: Pick<ReceiptLine, "unitPrice" | "weightKg" | "pricePerKg">,
  unit: Unit,
  packQty: number | undefined,
): { priceChf: number; priceQty: number } | null {
  if (isWeighed(line)) {
    if (unit === "g") return { priceChf: line.pricePerKg, priceQty: 1000 };
    if (unit === "kg") return { priceChf: line.pricePerKg, priceQty: 1 };
  }
  if (packQty === undefined || !(packQty > 0) || !(line.unitPrice > 0))
    return null;
  return { priceChf: line.unitPrice, priceQty: packQty };
}

/** True when the pack content must be asked before the price can be kept. */
export function needsPackContent(
  line: Pick<ReceiptLine, "weightKg" | "pricePerKg">,
  unit: Unit,
  packQty: number | undefined,
): boolean {
  if (isWeighed(line) && (unit === "g" || unit === "kg")) return false;
  return packQty === undefined;
}

/**
 * Catches a pack content typed in the wrong unit (« 1 » meaning one pack of
 * bread counted in grams). Null when the content is plausible.
 */
export function packContentProblem(unit: Unit, qty: number): string | null {
  if ((unit === "g" || unit === "ml") && qty < 20)
    return `Le contenu se donne en ${unit === "g" ? "grammes" : "millilitres"} : ${unit === "g" ? "500 pour un paquet de 500 g" : "1000 pour une bouteille d'un litre"}.`;
  return null;
}

/** A label holding 12 digits or more (masked or not) is payment data, never a product. */
export function looksLikeCardNumber(label: string): boolean {
  return /(?:[\dX*][\s-]?){12,}/i.test(label);
}
