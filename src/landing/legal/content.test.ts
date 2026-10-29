import { describe, expect, it } from "vitest";
import { PRICE_CHF } from "../../../convex/domain/billing";
import { LEGAL, REFUND_DAYS, SELLER } from "./content";

const all = (lang: "fr" | "de") =>
  Object.values(LEGAL[lang]).flatMap((doc) => [
    doc.title,
    ...doc.sections.flatMap((s) => [s.heading, ...(s.paragraphs ?? []), ...(s.items ?? [])]),
  ]);

describe("legal pages", () => {
  it("has the same sections in French and German", () => {
    for (const doc of Object.keys(LEGAL.fr) as (keyof typeof LEGAL.fr)[]) {
      const fr = LEGAL.fr[doc].sections;
      const de = LEGAL.de[doc].sections;
      expect(de.length, doc).toBe(fr.length);
      fr.forEach((s, i) => {
        expect(de[i].paragraphs?.length, `${doc} ${i}`).toBe(s.paragraphs?.length);
        expect(de[i].items?.length, `${doc} ${i}`).toBe(s.items?.length);
      });
    }
  });

  it("follows the Swiss rules: no ß, no em or en dash", () => {
    for (const lang of ["fr", "de"] as const)
      for (const text of all(lang)) expect(text).not.toMatch(/[ß–—]/);
  });

  it("names the seller, the price and the refund delay", () => {
    for (const lang of ["fr", "de"] as const) {
      const text = all(lang).join(" ");
      expect(text).toContain(SELLER.street);
      expect(text).toContain(SELLER.email);
      expect(text).toContain(`${PRICE_CHF}\u00a0CHF`);
      expect(text).toContain(`${REFUND_DAYS}`);
    }
  });
});
