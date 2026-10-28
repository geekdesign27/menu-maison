import { describe, expect, it } from "vitest";
import { fr, typo } from "./typo";

describe("typo", () => {
  it("binds the punctuation to the word before it", () => {
    expect(typo("On mange quoi ce soir ?")).toBe("On mange quoi ce soir ?");
    expect(typo("Parfait !")).toBe("Parfait !");
    expect(typo("Attention : risque")).toBe("Attention : risque");
  });

  it("keeps the guillemets with their words", () => {
    expect(typo("le « on mange quoi » a")).toBe("le « on mange quoi » a");
  });

  it("keeps numbers with their unit", () => {
    expect(typo("6 portions, CHF 13.95")).toBe("6 portions, CHF 13.95");
  });

  it("works as a tagged template", () => {
    const n = 3;
    expect(fr`${n} portions ?`).toBe("3 portions ?");
  });
});
