import { describe, expect, it } from "vitest";
import { DICTIONARIES, translate } from ".";

const placeholders = (text: string) =>
  [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("translations", () => {
  it("fills placeholders", () => {
    expect(translate("de", "lang.nowGerman", { name: "Anna" })).toBe(
      "Anna: App auf Deutsch",
    );
    expect(translate("fr", "lang.nowGerman", { name: "Anna" })).toBe(
      "Anna\u00a0: app en allemand",
    );
  });

  it("keeps the same placeholders in every language", () => {
    for (const [key, text] of Object.entries(DICTIONARIES.fr))
      expect(
        placeholders(DICTIONARIES.de[key as keyof typeof DICTIONARIES.de]),
        key,
      ).toEqual(placeholders(text));
  });

  it("follows the Swiss rules: no ß, no em or en dash", () => {
    for (const dict of Object.values(DICTIONARIES))
      for (const [key, text] of Object.entries(dict))
        expect(text, key).not.toMatch(/[ß–—]/);
  });
});
