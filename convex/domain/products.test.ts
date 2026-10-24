import { describe, expect, it } from "vitest";
import { NBSP } from "./quantities";
import { buildProducts, deletionBlocker, filterProducts } from "./products";

const ingredients = [
  { _id: "pates", name: "Pâtes", aisleId: "epicerie", priceChf: 2, priceQty: 500, imageId: "img1" },
  { _id: "julienne", name: "Julienne", aisleId: "frais", onlyChains: ["Coop"] },
  { _id: "oignon", name: "Oignon", aisleId: "fruits", priceChf: 0.5 }, // price without quantity
];
const staples = [
  { _id: "pq", name: "Papier toilette", aisleId: "menage", priceChf: 6 },
  { _id: "cafe", name: "Café", priceChf: 8, imageId: "img2", onlyChains: ["Migros"] },
];
const recipes = [
  { _id: "r1", name: "Spaghetti bolo", archived: false, items: [{ ingredientId: "pates" }, { ingredientId: "oignon" }] },
  { _id: "r2", name: "Ancienne soupe", archived: true, items: [{ ingredientId: "oignon" }, { ingredientId: "oignon" }] },
  { _id: "r3", name: "Bouillon", archived: false, items: [{ ingredientId: "oignon" }] },
];

const rows = buildProducts(ingredients, staples, recipes);
const names = (list: { name: string }[]) => list.map((p) => p.name);

describe("buildProducts", () => {
  it("merges ingredients and staples sorted by name", () => {
    expect(names(rows)).toEqual(["Café", "Julienne", "Oignon", "Papier toilette", "Pâtes"]);
    expect(rows.find((p) => p.name === "Café")?.kind).toBe("staple");
  });

  it("lists recipe uses once per recipe, archived last", () => {
    const oignon = rows.find((p) => p.name === "Oignon")!;
    expect(oignon.recipes.map((r) => r.name)).toEqual(["Bouillon", "Spaghetti bolo", "Ancienne soupe"]);
    expect(rows.find((p) => p.name === "Café")!.recipes).toEqual([]);
  });

  it("needs a price and its quantity for an ingredient, a price alone for a staple", () => {
    expect(rows.find((p) => p.name === "Pâtes")!.priced).toBe(true);
    expect(rows.find((p) => p.name === "Oignon")!.priced).toBe(false);
    expect(rows.find((p) => p.name === "Papier toilette")!.priced).toBe(true);
  });
});

describe("filterProducts", () => {
  it("searches without accents or case", () => {
    expect(names(filterProducts(rows, { search: "PATE" }))).toEqual(["Pâtes"]);
  });

  it("filters by kind and aisle, null meaning no aisle", () => {
    expect(names(filterProducts(rows, { kind: "staple" }))).toEqual(["Café", "Papier toilette"]);
    expect(names(filterProducts(rows, { aisleId: "fruits" }))).toEqual(["Oignon"]);
    expect(names(filterProducts(rows, { aisleId: null }))).toEqual(["Café"]);
  });

  it("keeps products sold everywhere when filtering by chain", () => {
    expect(names(filterProducts(rows, { chain: "Coop" }))).toEqual(["Julienne", "Oignon", "Papier toilette", "Pâtes"]);
  });

  it("keeps only products missing their price, or their photo", () => {
    expect(names(filterProducts(rows, { missing: "price" }))).toEqual(["Julienne", "Oignon"]);
    expect(names(filterProducts(rows, { missing: "photo" }))).toEqual(["Julienne", "Oignon", "Papier toilette"]);
  });
});

describe("deletionBlocker", () => {
  it("allows deleting an unused ingredient", () => {
    expect(deletionBlocker([])).toBeNull();
  });

  it("names the recipes using it", () => {
    expect(deletionBlocker([{ name: "Bouillon", archived: false }])).toBe(
      `Utilisé dans la recette «${NBSP}Bouillon${NBSP}». Retire-le d'abord de cette recette.`,
    );
    const many = ["A", "B", "C", "D", "E"].map((name) => ({ name, archived: name === "A" }));
    expect(deletionBlocker(many)).toBe(
      `Utilisé dans les recettes «${NBSP}A${NBSP}» (archivée), «${NBSP}B${NBSP}», «${NBSP}C${NBSP}» et 2 autres. Retire-le d'abord de ces recettes.`,
    );
  });
});
