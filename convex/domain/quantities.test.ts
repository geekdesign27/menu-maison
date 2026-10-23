import { describe, expect, it } from "vitest";
import {
  formatNumber,
  formatQty,
  NBSP,
  sameFamily,
  toBase,
} from "./quantities";

// Only the space between number and unit is non-breaking
const s = (text: string) => text.replace(" ", NBSP);

describe("toBase", () => {
  it("converts kg and l, keeps other units", () => {
    expect(toBase(1.25, "kg")).toEqual({ qty: 1250, unit: "g" });
    expect(toBase(0.5, "l")).toEqual({ qty: 500, unit: "ml" });
    expect(toBase(3, "pc")).toEqual({ qty: 3, unit: "pc" });
    expect(toBase(2, "boîte")).toEqual({ qty: 2, unit: "boîte" });
  });
});

describe("sameFamily", () => {
  it("groups mass and volume units", () => {
    expect(sameFamily("g", "kg")).toBe(true);
    expect(sameFamily("l", "ml")).toBe(true);
    expect(sameFamily("cs", "cs")).toBe(true);
    expect(sameFamily("g", "ml")).toBe(false);
    expect(sameFamily("cs", "cc")).toBe(false);
  });
});

describe("formatNumber", () => {
  it("uses a decimal comma and drops useless zeros", () => {
    expect(formatNumber(1.25)).toBe("1,25");
    expect(formatNumber(2)).toBe("2");
    expect(formatNumber(1.5)).toBe("1,5");
    expect(formatNumber(10)).toBe("10");
  });
});

describe("formatQty", () => {
  it("formats mass with French conventions", () => {
    expect(formatQty(1250, "g")).toBe(s("1,25 kg"));
    expect(formatQty(2000, "g")).toBe(s("2 kg"));
    expect(formatQty(2, "kg")).toBe(s("2 kg"));
    expect(formatQty(250, "g")).toBe(s("250 g"));
    expect(formatQty(254, "g")).toBe(s("250 g"));
    expect(formatQty(47.4, "g")).toBe(s("47 g"));
    expect(formatQty(996, "g")).toBe(s("1 kg"));
  });

  it("uses a non-breaking space", () => {
    expect(formatQty(250, "g")).toBe("250 g");
  });

  it("formats volume", () => {
    expect(formatQty(1500, "ml")).toBe(s("1,5 l"));
    expect(formatQty(0.3, "l")).toBe(s("300 ml"));
  });

  it("never shows 0 for a positive quantity", () => {
    expect(formatQty(0.2, "g")).toBe(s("1 g"));
    expect(formatQty(0.1, "pc")).toBe("1");
    expect(formatQty(0.1, "cs")).toBe(s("0,5 c. à s."));
    expect(formatQty(0.1, "pincée")).toBe(s("1 pincée"));
  });

  it("rounds pieces up and shows them without unit", () => {
    expect(formatQty(2.2, "pc")).toBe("3");
    expect(formatQty(3, "pc")).toBe("3");
    // floating point noise must not round up
    expect(formatQty(0.1 * 3 * 10, "pc")).toBe("3");
  });

  it("rounds spoons up to the half", () => {
    expect(formatQty(1.6, "cs")).toBe(s("2 c. à s."));
    expect(formatQty(1.2, "cs")).toBe(s("1,5 c. à s."));
    expect(formatQty(1, "cc")).toBe(s("1 c. à c."));
  });

  it("pluralises packaging units", () => {
    expect(formatQty(2, "botte")).toBe(s("2 bottes"));
    expect(formatQty(1, "boîte")).toBe(s("1 boîte"));
    expect(formatQty(1.5, "boîte")).toBe(s("2 boîtes"));
    expect(formatQty(3, "pincée")).toBe(s("3 pincées"));
    expect(formatQty(1, "paquet")).toBe(s("1 paquet"));
  });
});
