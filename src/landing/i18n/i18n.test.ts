import { describe, expect, it } from "vitest";
import { LANDING_DE, LANDING_FR, type LandingKey } from ".";

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("landing page texts", () => {
  it("has every text in German, with the same placeholders", () => {
    for (const [key, text] of Object.entries(LANDING_FR)) {
      const de = LANDING_DE[key as LandingKey];
      expect(de, key).toBeTruthy();
      expect(placeholders(de), key).toEqual(placeholders(text));
    }
  });

  it("follows the Swiss rules: no ß, no em or en dash", () => {
    for (const dict of [LANDING_FR, LANDING_DE])
      for (const [key, text] of Object.entries(dict)) expect(text, key).not.toMatch(/[ß–—]/);
  });
});
