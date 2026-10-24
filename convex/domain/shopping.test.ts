import { describe, expect, it } from "vitest";
import type { ShoppingInput } from "./shopping";
import {
  buildShoppingList,
  effectivePrice,
  ingredientCost,
  orderAisles,
  recipeCost,
  roundChf,
} from "./shopping";
import { NBSP } from "./quantities";

const aisles: ShoppingInput["aisles"] = [
  { _id: "fruits", name: "Fruits et légumes", emoji: "🥕", order: 1 },
  { _id: "boucherie", name: "Boucherie", emoji: "🍗", order: 2 },
  { _id: "epicerie", name: "Épicerie", emoji: "🥫", order: 3 },
  { _id: "frais", name: "Produits frais", emoji: "🧀", order: 4 },
];

const ingredients: ShoppingInput["ingredients"] = {
  poulet: {
    name: "Poulet",
    aisleId: "boucherie",
    unit: "g",
    priceChf: 25,
    priceQty: 1000,
  },
  riz: {
    name: "Riz",
    aisleId: "epicerie",
    unit: "kg",
    priceChf: 2.5,
    priceQty: 1,
  },
  oignon: {
    name: "Oignon",
    aisleId: "fruits",
    unit: "pc",
    priceChf: 0.5,
    priceQty: 1,
  },
  herbes: { name: "Herbes de Provence", aisleId: "fruits", unit: "pincée" },
  creme: {
    name: "Crème",
    aisleId: "frais",
    unit: "ml",
    priceChf: 3,
    priceQty: 500,
  },
};

const recipes: ShoppingInput["recipes"] = {
  curry: {
    name: "Curry de poulet",
    items: [
      { ingredientId: "poulet", qtyPerPerson: 150, unit: "g" },
      { ingredientId: "riz", qtyPerPerson: 80, unit: "g" },
      { ingredientId: "oignon", qtyPerPerson: 0.5, unit: "pc" },
    ],
  },
  poeleeRiz: {
    name: "Poêlée de riz",
    items: [
      { ingredientId: "riz", qtyPerPerson: 0.1, unit: "kg" },
      { ingredientId: "herbes", qtyPerPerson: 1, unit: "pincée" },
      { ingredientId: "inconnu", qtyPerPerson: 1, unit: "pc" },
    ],
  },
};

function input(overrides: Partial<ShoppingInput> = {}): ShoppingInput {
  return {
    meals: [],
    recipes,
    ingredients,
    aisles,
    store: null,
    extras: [],
    checks: {},
    ...overrides,
  };
}

function findItem(list: ReturnType<typeof buildShoppingList>, key: string) {
  return list.sections.flatMap((s) => s.items).find((i) => i.key === key);
}

describe("buildShoppingList", () => {
  it("adds up two chicken meals", () => {
    const list = buildShoppingList(
      input({
        meals: [
          { _id: "m1", recipeId: "curry", persons: 3 },
          { _id: "m2", recipeId: "curry", persons: 2 },
        ],
      }),
    );
    const poulet = findItem(list, "ing:poulet:g");
    expect(poulet?.qty).toBe(750);
    expect(poulet?.display).toBe(`750${NBSP}g`);
    expect(poulet?.recipes).toEqual(["Curry de poulet"]);
    expect(findItem(list, "ing:oignon:pc")?.display).toBe(`3${NBSP}pièces`);
  });

  it("buys a dish in the week it is cooked, not the week it is eaten", () => {
    const period = { start: "2026-10-24", end: "2026-10-30" };
    const list = buildShoppingList(
      input({
        period,
        meals: [
          // Friday dinner + Saturday lunch cooked the same Friday evening
          { _id: "m1", recipeId: "curry", persons: 3, cookedOn: "2026-10-30" },
          { _id: "m2", recipeId: "curry", persons: 2, cookedOn: "2026-10-30" },
          // First-day lunch prepared the evening before: bought the week before
          { _id: "m3", recipeId: "curry", persons: 4, cookedOn: "2026-10-23" },
        ],
      }),
    );
    expect(findItem(list, "ing:poulet:g")?.qty).toBe(750);
  });

  it("keeps items already at home out of the list, totals and cost", () => {
    const list = buildShoppingList(
      input({
        meals: [{ _id: "m1", recipeId: "curry", persons: 2 }],
        ingredients: {
          ...ingredients,
          riz: { ...ingredients.riz, pantry: true },
        },
        skipped: ["ing:riz:g"],
      }),
    );
    expect(findItem(list, "ing:riz:g")).toBeUndefined();
    expect(list.skipped.map((i) => i.key)).toEqual(["ing:riz:g"]);
    expect(list.skipped[0].pantry).toBe(true);
    expect(list.skipped[0].display).toBe(`160${NBSP}g`);
    expect(list.total).toBe(2); // poulet + oignon
    expect(list.costChf).toBe(8); // 300 g poulet 7.50 + 1 oignon 0.50
    expect(findItem(list, "ing:poulet:g")?.pantry).toBe(false);
  });

  it("counts whole packs for ingredients bought by the pack", () => {
    const list = buildShoppingList(
      input({
        recipes: {
          croque: {
            name: "Croque-monsieur",
            items: [
              { ingredientId: "jambon", qtyPerPerson: 2, unit: "tranche" },
            ],
          },
          gratin: {
            name: "Gratin",
            items: [
              { ingredientId: "gruyere", qtyPerPerson: 0.05, unit: "kg" },
            ],
          },
        },
        ingredients: {
          // 8 slices per pack at 4.00 CHF the pack
          jambon: {
            name: "Jambon",
            aisleId: "boucherie",
            unit: "tranche",
            priceChf: 4,
            priceQty: 8,
            packSize: 8,
          },
          // 200 g per pack
          gruyere: {
            name: "Gruyère",
            aisleId: "frais",
            unit: "g",
            priceChf: 5,
            priceQty: 200,
            packSize: 200,
          },
        },
        meals: [
          { _id: "m1", recipeId: "croque", persons: 7 }, // 14 slices
          { _id: "m2", recipeId: "gratin", persons: 4 }, // 200 g, exactly one pack
        ],
      }),
    );
    const jambon = findItem(list, "ing:jambon:tranche");
    expect(jambon?.packs).toBe(2);
    expect(jambon?.display).toBe(`2${NBSP}paquets`);
    expect(jambon?.packDetail).toBe(`≈${NBSP}14${NBSP}tranches`);
    expect(jambon?.costChf).toBe(8); // two whole packs
    expect(findItem(list, "ing:gruyere:g")?.packs).toBe(1);
  });

  it("buys the extra portions cooked for the fridge", () => {
    const list = buildShoppingList(
      input({
        // 3 tonight + 2 more cooked for later = 5 portions of chicken
        meals: [{ _id: "m1", recipeId: "curry", persons: 3, extraPortions: 2 }],
      }),
    );
    expect(findItem(list, "ing:poulet:g")?.qty).toBe(750);
  });

  it("sets apart products sold only by another chain", () => {
    const list = buildShoppingList(
      input({
        meals: [{ _id: "m1", recipeId: "curry", persons: 2 }],
        ingredients: {
          ...ingredients,
          oignon: { ...ingredients.oignon, onlyChains: ["Coop"] },
        },
        store: { chain: "Aldi", aisleOrder: [], overrides: [], priceFactor: 1 },
        extras: [
          {
            _id: "x1",
            label: "Julienne de légumes",
            onlyChains: ["Coop", "Migros"],
            priceChf: 3,
            qty: 2,
          },
        ],
      }),
    );
    const last = list.sections.at(-1)!;
    expect(last.elsewhere).toBe(true);
    expect(last.name).toBe("À acheter chez Coop ou Migros");
    expect(
      list.sections
        .find((s) => s.name === "À acheter chez Coop")
        ?.items.map((i) => i.label),
    ).toEqual(["Oignon"]);
    expect(list.total).toBe(2); // poulet + riz, here at Aldi
    expect(findItem(list, "extra:x1")?.costChf).toBe(6); // 2 × 3.00, still in the week's cost

    // At Coop, the same products are in their aisles
    const atCoop = buildShoppingList(
      input({
        meals: [{ _id: "m1", recipeId: "curry", persons: 2 }],
        ingredients: {
          ...ingredients,
          oignon: { ...ingredients.oignon, onlyChains: ["Coop"] },
        },
        store: { chain: "Coop", aisleOrder: [], overrides: [], priceFactor: 1 },
      }),
    );
    expect(atCoop.sections.some((s) => s.elsewhere)).toBe(false);
  });

  it("merges kg and g of the same ingredient", () => {
    const list = buildShoppingList(
      input({
        meals: [
          { _id: "m1", recipeId: "curry", persons: 5 }, // 400 g rice
          { _id: "m2", recipeId: "poeleeRiz", persons: 4 }, // 0.4 kg rice
        ],
      }),
    );
    const riz = findItem(list, "ing:riz:g");
    expect(riz?.qty).toBeCloseTo(800);
    expect(riz?.unit).toBe("g");
    expect(riz?.recipes).toEqual(["Curry de poulet", "Poêlée de riz"]);
    expect(
      list.sections
        .flatMap((s) => s.items)
        .filter((i) => i.ingredientId === "riz"),
    ).toHaveLength(1);
  });

  it("ignores leftover meals, free-text meals and missing data", () => {
    const list = buildShoppingList(
      input({
        meals: [
          { _id: "m1", recipeId: "curry", persons: 2 },
          { _id: "m2", recipeId: "curry", persons: 2, fromLeftoverOf: "m1" },
          { _id: "m3", persons: 4 }, // restaurant
          { _id: "m4", recipeId: "deleted", persons: 2 },
          { _id: "m5", recipeId: "poeleeRiz", persons: 1 }, // has an unknown ingredient
        ],
      }),
    );
    expect(findItem(list, "ing:poulet:g")?.qty).toBe(300);
    expect(findItem(list, "ing:inconnu:pc")).toBeUndefined();
  });

  it("orders sections by default aisle order without store", () => {
    const list = buildShoppingList(
      input({ meals: [{ _id: "m1", recipeId: "curry", persons: 2 }] }),
    );
    expect(list.sections.map((s) => s.aisleId)).toEqual([
      "fruits",
      "boucherie",
      "epicerie",
    ]);
  });

  it("applies a store aisle override", () => {
    const list = buildShoppingList(
      input({
        meals: [{ _id: "m1", recipeId: "curry", persons: 2 }],
        store: {
          aisleOrder: [],
          overrides: [{ ingredientId: "oignon", aisleId: "epicerie" }],
          priceFactor: 1,
        },
      }),
    );
    const epicerie = list.sections.find((s) => s.aisleId === "epicerie");
    expect(epicerie?.items.map((i) => i.label)).toEqual(["Oignon", "Riz"]);
    expect(list.sections.find((s) => s.aisleId === "fruits")).toBeUndefined();
  });

  it("reorders sections when the store changes", () => {
    const base = input({
      meals: [{ _id: "m1", recipeId: "curry", persons: 2 }],
    });
    const aldi = buildShoppingList({
      ...base,
      store: {
        aisleOrder: ["fruits", "boucherie", "epicerie"],
        overrides: [],
        priceFactor: 0.85,
      },
    });
    const coop = buildShoppingList({
      ...base,
      store: {
        aisleOrder: ["epicerie", "boucherie"],
        overrides: [],
        priceFactor: 1.1,
      },
    });
    expect(aldi.sections.map((s) => s.aisleId)).toEqual([
      "fruits",
      "boucherie",
      "epicerie",
    ]);
    // aisles missing from the store order come after, by default order
    expect(coop.sections.map((s) => s.aisleId)).toEqual([
      "epicerie",
      "boucherie",
      "fruits",
    ]);
  });

  it("sorts items alphabetically with checked items last and counts them", () => {
    const list = buildShoppingList(
      input({
        meals: [{ _id: "m1", recipeId: "poeleeRiz", persons: 2 }],
        store: {
          aisleOrder: [],
          overrides: [{ ingredientId: "riz", aisleId: "fruits" }],
          priceFactor: 1,
        },
        extras: [{ _id: "x1", label: "Ail", aisleId: "fruits" }],
        checks: { "ing:herbes:pincée": true, "extra:x1": false },
      }),
    );
    const fruits = list.sections.find((s) => s.aisleId === "fruits");
    expect(fruits?.items.map((i) => i.label)).toEqual([
      "Ail",
      "Riz",
      "Herbes de Provence",
    ]);
    expect(fruits?.items[2].checked).toBe(true);
    expect(list.total).toBe(3);
    expect(list.remaining).toBe(2);
  });

  it("puts extras without known aisle in « Divers » at the end", () => {
    const list = buildShoppingList(
      input({
        meals: [{ _id: "m1", recipeId: "curry", persons: 2 }],
        extras: [
          { _id: "x1", label: "Lessive" },
          {
            _id: "x2",
            label: "Café",
            qty: 2,
            unit: "paquet",
            aisleId: "supprimé",
          },
          { _id: "x3", label: "Yogourts", qty: 6 },
        ],
      }),
    );
    const last = list.sections[list.sections.length - 1];
    expect(last.aisleId).toBeNull();
    expect(last.name).toBe("Divers");
    expect(last.emoji).toBe("🛒");
    expect(last.items.map((i) => [i.key, i.display])).toEqual([
      ["extra:x2", `2${NBSP}paquets`],
      ["extra:x1", ""],
      ["extra:x3", `6${NBSP}pièces`],
    ]);
    expect(last.items.every((i) => i.extra && i.recipes.length === 0)).toBe(
      true,
    );
  });

  it("omits empty sections and returns an empty list without meals", () => {
    const list = buildShoppingList(input());
    expect(list).toEqual({
      sections: [],
      total: 0,
      remaining: 0,
      costChf: 0,
      skipped: [],
    });
  });

  it("computes costs with the store price factor", () => {
    const list = buildShoppingList(
      input({
        meals: [{ _id: "m1", recipeId: "curry", persons: 4 }],
        store: { aisleOrder: [], overrides: [], priceFactor: 0.85 },
      }),
    );
    // 600 g chicken at 25 CHF/kg × 0.85 = 12.75
    expect(findItem(list, "ing:poulet:g")?.costChf).toBe(12.75);
    // 320 g rice at 2.50 CHF/kg × 0.85 = 0.68 → 0.70
    expect(findItem(list, "ing:riz:g")?.costChf).toBe(0.7);
    // 2 onions at 0.50 × 0.85 = 0.85
    expect(findItem(list, "ing:oignon:pc")?.costChf).toBe(0.85);
    expect(list.costChf).toBe(14.3);
  });
});

describe("ingredientCost", () => {
  it("converts units on both sides", () => {
    expect(ingredientCost(ingredients.riz, 500, "g")).toBe(1.25);
    expect(ingredientCost(ingredients.creme, 0.25, "l")).toBe(1.5);
  });

  it("rounds to 0.05 CHF", () => {
    expect(ingredientCost(ingredients.poulet, 123, "g")).toBe(3.1); // 3.075
    expect(roundChf(0.1 + 0.2)).toBe(0.3);
  });

  it("is undefined without price or with incompatible units", () => {
    expect(ingredientCost(ingredients.herbes, 2, "pincée")).toBeUndefined();
    expect(ingredientCost(ingredients.poulet, 2, "pc")).toBeUndefined();
    expect(
      ingredientCost({ unit: "g", priceChf: 3, priceQty: 0 }, 100, "g"),
    ).toBeUndefined();
  });
});

describe("recipeCost", () => {
  it("sums known costs and flags incomplete recipes", () => {
    expect(recipeCost(recipes.curry, 2, ingredients)).toEqual({
      total: 8.4,
      complete: true,
    });
    // rice 0.50 CHF only: herbs have no price and one ingredient is unknown
    expect(recipeCost(recipes.poeleeRiz, 2, ingredients)).toEqual({
      total: 0.5,
      complete: false,
    });
    expect(recipeCost(recipes.curry, 2, ingredients, 2)).toEqual({
      total: 16.8,
      complete: true,
    });
  });
});

describe("orderAisles", () => {
  it("falls back to default order and ignores unknown or duplicate ids", () => {
    expect(orderAisles(aisles).map((a) => a._id)).toEqual([
      "fruits",
      "boucherie",
      "epicerie",
      "frais",
    ]);
    const store = {
      aisleOrder: ["frais", "ghost", "frais", "fruits"],
      overrides: [],
      priceFactor: 1,
    };
    expect(orderAisles(aisles, store).map((a) => a._id)).toEqual([
      "frais",
      "fruits",
      "boucherie",
      "epicerie",
    ]);
  });
});

describe("chain prices read on receipts", () => {
  const spaghetti = {
    name: "Spaghetti",
    aisleId: "epicerie",
    unit: "g" as const,
    priceChf: 2,
    priceQty: 500,
    chainPrices: { Lidl: { priceChf: 1.19, priceQty: 1000 } },
  };

  it("uses the receipt price at that chain, without the store factor", () => {
    expect(effectivePrice(spaghetti, "Lidl", 0.85)).toEqual({ priceChf: 1.19, priceQty: 1000, fromReceipt: true });
    expect(effectivePrice(spaghetti, "Coop", 1.1)).toEqual({ priceChf: 2.2, priceQty: 500, fromReceipt: false });
    expect(effectivePrice(spaghetti, undefined)).toEqual({ priceChf: 2, priceQty: 500, fromReceipt: false });
  });

  it("prices recipes and the list with it", () => {
    const recipe = { items: [{ ingredientId: "spag", qtyPerPerson: 100, unit: "g" as const }] };
    expect(recipeCost(recipe, 5, { spag: spaghetti }, 0.85, "Lidl")).toEqual({ total: 0.6, complete: true });
    expect(recipeCost(recipe, 5, { spag: spaghetti }, 0.85, "Aldi")).toEqual({ total: 1.7, complete: true });

    const list = buildShoppingList({
      meals: [{ _id: "m1", recipeId: "r1", persons: 5 }],
      recipes: { r1: { name: "Bolo", ...recipe } },
      ingredients: { spag: spaghetti },
      aisles,
      store: { chain: "Lidl", aisleOrder: [], overrides: [], priceFactor: 0.85 },
      extras: [{ _id: "x1", label: "Papier toilette", qty: 2, priceChf: 8, chainPrices: { Lidl: { priceChf: 19.89, priceQty: 1 } } }],
      checks: {},
    });
    const items = list.sections.flatMap((s) => s.items);
    expect(items.find((i) => i.label === "Spaghetti")?.costChf).toBe(0.6);
    expect(items.find((i) => i.label === "Papier toilette")?.costChf).toBe(39.8); // 2 × 19.89, rounded to 5 centimes
  });
});
