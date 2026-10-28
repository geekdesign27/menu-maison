import { describe, expect, it } from "vitest";
import { browserLang } from "./deviceLang";

describe("language of a device before sign-in", () => {
  it("follows the first French or German language of the browser", () => {
    expect(browserLang(["de-CH", "fr-CH"])).toBe("de");
    expect(browserLang(["en-GB", "de"])).toBe("de");
    expect(browserLang(["fr-CH", "de-CH"])).toBe("fr");
    expect(browserLang(["it-CH", "en"])).toBe("fr");
    expect(browserLang([])).toBe("fr");
  });
});
