import { describe, expect, it } from "vitest";
import {
  allergenLabels,
  findExisting,
  itemGrams,
  parseOffProduct,
  recipeAllergens,
  recipeNutrition,
  shortName,
  suggestAisleName,
} from "./openFoodFacts";

// Shape returned by search.openfoodfacts.org (trimmed real product)
const migrosSpaghetti = {
  code: "76167700014709",
  product_name: "M-CLASSIC Spaghetti",
  brands: ["Jowa", "Migros", "M-Classic"],
  allergens_tags: ["en:eggs", "en:gluten", "en:unknown-thing"],
  nutriscore_grade: "b",
  nutriments: {
    "energy-kj_100g": 1490,
    proteins_100g: 14,
    carbohydrates_100g: 69,
    fat_100g: 2,
    salt_100g: 0.01,
  },
  categories_tags: ["en:plant-based-foods", "en:pastas", "en:spaghetti"],
  quantity: "750 g",
  image_front_url:
    "https://images.openfoodfacts.org/images/products/761/677/000/14709/front_fr.3.400.jpg",
  image_front_small_url:
    "https://images.openfoodfacts.org/images/products/761/677/000/14709/front_fr.3.200.jpg",
};

describe("parseOffProduct", () => {
  it("keeps the known allergens and converts kJ to kcal", () => {
    const hit = parseOffProduct(migrosSpaghetti)!;
    expect(hit.code).toBe("76167700014709");
    expect(hit.allergens).toEqual(["en:eggs", "en:gluten"]);
    expect(hit.nutriscore).toBe("b");
    expect(hit.per100).toEqual({
      kcal: 356,
      proteins: 14,
      carbs: 69,
      fat: 2,
      salt: 0.01,
    });
    expect(hit.liquid).toBe(false);
    expect(hit.thumbUrl).toContain("200.jpg");
  });

  it("reads brands given as text and spots drinks", () => {
    const hit = parseOffProduct({
      code: "7613404100000",
      product_name_fr: "Lait entier",
      brands: "Coop, Naturaplan",
      quantity: "1 l",
      nutriscore_grade: "unknown",
    })!;
    expect(hit.brands).toEqual(["Coop", "Naturaplan"]);
    expect(hit.liquid).toBe(true);
    expect(hit.nutriscore).toBeUndefined();
    expect(hit.per100).toBeUndefined();
  });

  it("rejects a product without barcode or name, and negative values", () => {
    expect(parseOffProduct({ product_name: "Sans code" })).toBeNull();
    expect(parseOffProduct({ code: "123456", product_name: "  " })).toBeNull();
    expect(
      parseOffProduct({
        code: "123456",
        product_name: "X",
        nutriments: { fat_100g: -3 },
      })!.per100,
    ).toBeUndefined();
  });
});

describe("shortName", () => {
  it("removes brands, sizes and pack numbers", () => {
    expect(
      shortName("M-CLASSIC Spaghetti", ["Jowa", "Migros", "M-Classic"]),
    ).toBe("Spaghetti");
    expect(shortName("Barilla Spaghetti Nº5 500 g", ["Barilla"])).toBe(
      "Spaghetti",
    );
    expect(shortName("Lait entier UHT 1l", ["Coop"])).toBe("Lait entier UHT");
  });

  it("keeps a brand named like the searched food", () => {
    expect(shortName("Edamama Edamame nouilles BIO", ["Edamame"], "edamame")).toBe("Edamama Edamame nouilles BIO");
    expect(shortName("Edamama Edamame nouilles BIO", ["Edamame"])).toBe("Edamama nouilles BIO");
  });

  it("keeps words that merely contain a brand, and the name when nothing is left", () => {
    expect(shortName("Coopérative tomates", ["Coop"])).toBe(
      "Coopérative tomates",
    );
    expect(shortName("Migros", ["Migros"])).toBe("Migros");
    expect(shortName("pâtes fraîches", [])).toBe("Pâtes fraîches");
  });
});

describe("suggestAisleName", () => {
  it("maps categories to the app's aisles", () => {
    expect(suggestAisleName(migrosSpaghetti.categories_tags)).toBe(
      "Pâtes, riz et céréales",
    );
    expect(suggestAisleName(["en:dairies", "en:cheeses"])).toBe("Fromages");
    expect(suggestAisleName(["en:frozen-foods", "en:vegetables"])).toBe(
      "Surgelés",
    );
    expect(suggestAisleName(["en:snacks"])).toBeNull();
  });
});

describe("findExisting", () => {
  const ingredients = [
    { _id: "a", name: "Pâtes", off: { code: "111" } },
    { _id: "b", name: "Spaghetti" },
  ];

  it("finds the same barcode first, then the same name", () => {
    expect(findExisting(ingredients, "111", "Spaghetti")).toEqual({
      by: "code",
      ingredient: ingredients[0],
    });
    expect(findExisting(ingredients, "222", "SPAGHETTI")).toEqual({
      by: "name",
      ingredient: ingredients[1],
    });
    expect(findExisting(ingredients, "222", "pates")).toEqual({
      by: "name",
      ingredient: ingredients[0],
    });
    expect(findExisting(ingredients, "222", "Riz")).toBeNull();
  });
});

describe("recipe allergens and nutrition", () => {
  const ingredients = {
    pates: {
      off: {
        allergens: ["en:gluten", "en:eggs"],
        per100: { kcal: 350, proteins: 12, carbs: 70, fat: 2, salt: 0 },
      },
    },
    creme: {
      off: {
        allergens: ["en:milk"],
        per100: { kcal: 300, fat: 30, proteins: 2 },
      },
    },
    oignon: undefined,
    huile: { off: { allergens: [], per100: { kcal: 900, fat: 100 } } },
  };
  const items = [
    { ingredientId: "pates", qtyPerPerson: 0.1, unit: "kg" as const },
    { ingredientId: "creme", qtyPerPerson: 50, unit: "ml" as const },
    { ingredientId: "oignon", qtyPerPerson: 0.5, unit: "pc" as const },
    { ingredientId: "huile", qtyPerPerson: 1, unit: "cs" as const },
  ];

  it("labels allergens in French, without duplicates", () => {
    expect(
      allergenLabels(["en:milk", "en:gluten", "en:milk", "en:other"]),
    ).toEqual(["Gluten", "Lait"]);
    expect(recipeAllergens(items, ingredients)).toEqual({
      labels: ["Gluten", "Lait", "Œufs"],
      known: 3,
      total: 4,
    });
  });

  it("weighs spoons, ignores pieces and sums one portion", () => {
    expect(itemGrams(1, "cs")).toBe(15);
    expect(itemGrams(0.2, "l")).toBe(200);
    expect(itemGrams(2, "pc")).toBeNull();
    // 100 g pasta 350 kcal + 50 ml cream 150 kcal + 15 g oil 135 kcal
    expect(recipeNutrition(items, ingredients)).toEqual({
      kcal: 635,
      proteins: 13,
      carbs: 70,
      sugars: 0,
      fat: 2 + 15 + 15,
      salt: 0,
      covered: 3,
      total: 4,
    });
  });
});
