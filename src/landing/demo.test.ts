import { describe, expect, it } from "vitest";
import {
  CHICKEN_PORTIONS,
  DEMO_STORES,
  demoItem,
  demoList,
  demoRecipeCost,
  goodUntil,
  LASAGNES,
  needFor,
  ROAST_CHICKEN,
  STORY_PORTIONS,
} from "./demo";

// The landing page quotes these numbers: they must stay what the app computes
describe("landing demo week", () => {
  it("merges the carrots of both dishes into one line", () => {
    expect(needFor(LASAGNES, 6, "Carottes")).toBe(240);
    expect(needFor(ROAST_CHICKEN, CHICKEN_PORTIONS, "Carottes")).toBe(300);
    const list = demoList();
    const carrots = list.sections.flatMap((s) => s.items).filter((i) => i.label === "Carottes");
    expect(carrots).toHaveLength(1);
    expect(carrots[0].qty).toBe(540);
  });

  it("follows each store's walking order", () => {
    const first = DEMO_STORES.map((s) => demoList(s).sections[0].name);
    expect(first).toEqual(["Boulangerie", "Fruits et légumes", "Fruits et légumes"]);
  });

  it("buys tomorrow's lunch and the fridge portion with tonight's dish", () => {
    const six = demoItem(demoList(), "Viande hachée mixte")?.qty;
    const three = demoItem(demoList(DEMO_STORES[0], { tonight: 3, tomorrowLunch: 0, extra: 0 }), "Viande hachée mixte")?.qty;
    expect(STORY_PORTIONS.tonight + STORY_PORTIONS.tomorrowLunch + STORY_PORTIONS.extra).toBe(6);
    expect(six).toBe(720);
    expect(three).toBe(360);
  });

  it("prices the lasagnes like the recipe page of the screenshots", () => {
    expect(demoRecipeCost(LASAGNES, 3, DEMO_STORES[1])).toBe(13.95);
  });

  it("keeps the lasagnes three days in the fridge", () => {
    expect(goodUntil(LASAGNES)).toBe("2026-10-31");
  });
});
