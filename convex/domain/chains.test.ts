import { describe, expect, it } from "vitest";
import {
  BRANDS,
  CHAINS,
  chainKind,
  chainName,
  DEFAULT_PRICE_FACTOR,
  hasOpeningHours,
  namePrefill,
} from "./chains";

describe("chains", () => {
  it("stores only printable ASCII values, usable as Convex field names", () => {
    for (const c of CHAINS) expect(c).toMatch(/^[\x20-\x7e]+$/);
    expect(new Set(CHAINS).size).toBe(CHAINS.length);
  });

  it("shows the shops that are not a brand in the member's language", () => {
    expect(chainName("Marche")).toBe("Marché");
    expect(chainName("Specialise")).toBe("Magasin spécialisé");
    expect(chainName("Specialise", "de")).toBe("Fachgeschäft");
    expect(chainName("Autre", "de")).toBe("Andere");
    expect(chainName("Coop Pronto", "de")).toBe("Coop Pronto");
  });

  it("keeps markets and small shops out of the brand list", () => {
    expect(BRANDS).not.toContain("Marche");
    expect(BRANDS).not.toContain("Autre");
    expect(BRANDS).toContain("Volg");
    expect(chainKind("Migrolino")).toBe("convenience");
    expect(chainKind("Aligro")).toBe("supermarket");
    expect(hasOpeningHours("Marche")).toBe(true);
    expect(hasOpeningHours("Migros")).toBe(false);
  });

  it("prefills the store name from the chain", () => {
    expect(namePrefill("Volg")).toBe("Volg ");
    expect(namePrefill("Marche")).toBe("Marché de ");
    expect(namePrefill("Specialise")).toBe("");
  });

  it("gives every chain a price level the store editor accepts", () => {
    for (const c of CHAINS) {
      expect(DEFAULT_PRICE_FACTOR[c]).toBeGreaterThanOrEqual(0.8);
      expect(DEFAULT_PRICE_FACTOR[c]).toBeLessThanOrEqual(1.2);
    }
  });
});
