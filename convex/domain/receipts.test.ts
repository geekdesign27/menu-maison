import { describe, expect, it } from "vitest";
import {
  checkTotal,
  ingredientPrice,
  labelKey,
  looksLikeCardNumber,
  needsPackContent,
  packContentProblem,
  parseReceipt,
} from "./receipts";

// Excerpt of the Lidl receipt of 24.10.2026, as Claude returns it
const raw = {
  chain: "Lidl",
  date: "2026-10-24",
  total: 7.4,
  lines: [
    {
      label: "Sac en papier FSC",
      quantity: 3,
      unitPrice: 0.49,
      total: 1.47,
      weightKg: 0,
      pricePerKg: 0,
      kind: "bag",
      match: "",
    },
    {
      label: "Bananes bio Fairtrade",
      quantity: 1,
      unitPrice: 1.89,
      total: 1.89,
      weightKg: 0.704,
      pricePerKg: 2.69,
      kind: "product",
      match: "i4",
    },
    {
      label: "Oeuf élv au sol",
      quantity: 1,
      unitPrice: 4.19,
      total: 4.19,
      weightKg: 0,
      pricePerKg: 0,
      kind: "product",
      match: "i9",
    },
    {
      label: "",
      quantity: 1,
      unitPrice: 1,
      total: 1,
      weightKg: 0,
      pricePerKg: 0,
      kind: "product",
      match: "",
    },
  ],
};

describe("parseReceipt", () => {
  it("keeps valid lines and drops empty labels", () => {
    const receipt = parseReceipt(raw);
    expect(receipt.chain).toBe("Lidl");
    expect(receipt.date).toBe("2026-10-24");
    expect(receipt.lines.map((l) => l.label)).toEqual([
      "Sac en papier FSC",
      "Bananes bio Fairtrade",
      "Oeuf élv au sol",
    ]);
    expect(receipt.lines[0].kind).toBe("bag");
  });

  it("falls back on safe values for unexpected fields", () => {
    const receipt = parseReceipt({
      chain: "Manor",
      date: "24.10.2026",
      lines: [
        {
          label: "Pain",
          quantity: 0,
          unitPrice: "2",
          total: 2,
          kind: "gift",
          match: "x1",
        },
      ],
    });
    expect(receipt.chain).toBe("Autre");
    expect(receipt.date).toBe("");
    expect(receipt.lines[0]).toMatchObject({
      quantity: 1,
      unitPrice: 0,
      kind: "product",
      match: "",
    });
  });

  it("refuses a reply without any line", () => {
    expect(() => parseReceipt({ chain: "Lidl", lines: [] })).toThrow(
      "Aucune ligne",
    );
    expect(() => parseReceipt(null)).toThrow();
  });
});

describe("checkTotal", () => {
  it("compares the sum of the lines with the printed total", () => {
    expect(checkTotal(parseReceipt(raw))).toEqual({
      sum: 7.55,
      matches: false,
    });
    expect(checkTotal(parseReceipt({ ...raw, total: 7.55 })).matches).toBe(
      true,
    );
  });
});

describe("labelKey", () => {
  it("ignores accents, case and repeated spaces", () => {
    expect(labelKey("  Oeuf  élv au SOL ")).toBe("oeuf elv au sol");
  });
});

describe("ingredientPrice", () => {
  const bananas = { unitPrice: 1.89, weightKg: 0.704, pricePerKg: 2.69 };
  const eggs = { unitPrice: 4.19, weightKg: 0, pricePerKg: 0 };

  it("uses the kilo price of weighed products", () => {
    expect(ingredientPrice(bananas, "g", undefined)).toEqual({
      priceChf: 2.69,
      priceQty: 1000,
    });
    expect(ingredientPrice(bananas, "kg", undefined)).toEqual({
      priceChf: 2.69,
      priceQty: 1,
    });
    expect(needsPackContent(bananas, "g", undefined)).toBe(false);
  });

  it("needs the pack content otherwise", () => {
    expect(ingredientPrice(eggs, "pc", undefined)).toBeNull();
    expect(needsPackContent(eggs, "pc", undefined)).toBe(true);
    expect(ingredientPrice(eggs, "pc", 10)).toEqual({
      priceChf: 4.19,
      priceQty: 10,
    });
    expect(needsPackContent(eggs, "pc", 10)).toBe(false);
    // A weighed line still needs a content for an ingredient counted in pieces
    expect(needsPackContent(bananas, "pc", undefined)).toBe(true);
  });
});

describe("packContentProblem", () => {
  it("rejects a pack content that looks typed in packs instead of grams", () => {
    expect(packContentProblem("g", 1)).toContain("grammes");
    expect(packContentProblem("ml", 5)).toContain("millilitres");
    expect(packContentProblem("g", 500)).toBeNull();
    expect(packContentProblem("pc", 1)).toBeNull();
  });
});

describe("looksLikeCardNumber", () => {
  it("spots card numbers, masked or not, and keeps product labels", () => {
    expect(looksLikeCardNumber("XXXXXXXXXXXXXXX2894")).toBe(true);
    expect(looksLikeCardNumber("VISA 4123 4567 8901 2345")).toBe(true);
    expect(looksLikeCardNumber("Snickers 9er + 1 gratuit")).toBe(false);
    expect(looksLikeCardNumber("Cola Zero 0.33l")).toBe(false);
  });

  it("drops such a line when reading", () => {
    const receipt = parseReceipt({
      chain: "Lidl",
      lines: [
        { label: "Pain de mie", quantity: 1, unitPrice: 1.19, total: 1.19, weightKg: 0, pricePerKg: 0, kind: "product", match: "" },
        { label: "PostFinance XXXXXXXXXXXXXXX2894", quantity: 1, unitPrice: 0, total: 0, weightKg: 0, pricePerKg: 0, kind: "product", match: "" },
      ],
    });
    expect(receipt.lines.map((l) => l.label)).toEqual(["Pain de mie"]);
  });
});
