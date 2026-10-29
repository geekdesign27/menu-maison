import { describe, expect, it } from "vitest";
import { clickEventOf } from "./visits";

describe("clickEventOf", () => {
  it("names the counted buttons by their address", () => {
    expect(clickEventOf("#/essai", null)).toBe("trial");
    expect(clickEventOf("#/connexion", null)).toBe("login");
    expect(clickEventOf("#tarif", null)).toBe("pricing");
    expect(
      clickEventOf("mailto:miam@menumaison.ch", "mailto:miam@menumaison.ch"),
    ).toBe("contact");
  });

  it("ignores the other links", () => {
    expect(clickEventOf("#fonctionnement", null)).toBeNull();
    expect(clickEventOf("#/", null)).toBeNull();
    expect(clickEventOf("mailto:x@y.ch", null)).toBeNull();
    expect(clickEventOf(null, null)).toBeNull();
  });
});
