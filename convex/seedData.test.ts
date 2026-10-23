import { describe, expect, it } from "vitest";
import type { Unit } from "./seedData";
import {
  AISLES,
  INGREDIENTS,
  MEMBERS,
  RECIPES,
  STORES,
  TAGS,
} from "./seedData";

/** Units that can be converted into each other share a family. */
function unitFamily(unit: Unit): string {
  if (unit === "g" || unit === "kg") return "mass";
  if (unit === "ml" || unit === "l") return "volume";
  return unit;
}

function duplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const dups: string[] = [];
  for (const value of values) {
    const key = value.toLocaleLowerCase("fr-CH");
    if (seen.has(key)) dups.push(value);
    seen.add(key);
  }
  return dups;
}

/** Every human-readable string in the seed data, with a label for error messages. */
function allTexts(): { where: string; text: string }[] {
  const texts: { where: string; text: string }[] = [];
  for (const a of AISLES) texts.push({ where: `aisle ${a.key}`, text: a.name });
  for (const i of INGREDIENTS)
    texts.push({ where: `ingredient ${i.name}`, text: i.name });
  for (const t of TAGS) texts.push({ where: "tag", text: t });
  for (const r of RECIPES) {
    texts.push({ where: `recipe ${r.name}`, text: r.name });
    texts.push({ where: `recipe ${r.name} description`, text: r.description });
    r.steps.forEach((s, n) =>
      texts.push({ where: `recipe ${r.name} step ${n + 1}`, text: s }),
    );
  }
  for (const s of STORES)
    texts.push({ where: `store ${s.name}`, text: s.name });
  for (const m of MEMBERS)
    texts.push({ where: `member ${m.name}`, text: m.name });
  return texts;
}

const aisleKeys = new Set(AISLES.map((a) => a.key));
const ingredientsByName = new Map(INGREDIENTS.map((i) => [i.name, i]));

describe("seed data: aisles", () => {
  it("has 12 to 15 aisles with unique keys and names", () => {
    expect(AISLES.length).toBeGreaterThanOrEqual(12);
    expect(AISLES.length).toBeLessThanOrEqual(15);
    expect(duplicates(AISLES.map((a) => a.key))).toEqual([]);
    expect(duplicates(AISLES.map((a) => a.name))).toEqual([]);
  });

  it("uses short kebab-case keys and an emoji for each aisle", () => {
    for (const a of AISLES) {
      expect(a.key, a.key).toMatch(/^[a-z]+(-[a-z]+)*$/);
      expect(a.emoji.length, a.key).toBeGreaterThan(0);
    }
  });
});

describe("seed data: ingredients", () => {
  it("has 120 to 170 ingredients with unique names", () => {
    expect(INGREDIENTS.length).toBeGreaterThanOrEqual(120);
    expect(INGREDIENTS.length).toBeLessThanOrEqual(170);
    expect(duplicates(INGREDIENTS.map((i) => i.name))).toEqual([]);
  });

  it("puts every ingredient in an existing aisle", () => {
    const orphans = INGREDIENTS.filter((i) => !aisleKeys.has(i.aisle)).map(
      (i) => i.name,
    );
    expect(orphans).toEqual([]);
  });

  it("has consistent positive prices", () => {
    for (const i of INGREDIENTS) {
      // Price and quantity go together
      expect(i.priceChf === undefined, i.name).toBe(i.priceQty === undefined);
      if (i.priceChf !== undefined && i.priceQty !== undefined) {
        expect(i.priceChf, i.name).toBeGreaterThan(0);
        expect(i.priceQty, i.name).toBeGreaterThan(0);
      }
    }
  });
});

describe("seed data: recipes", () => {
  it("has at least 45 recipes with unique names", () => {
    expect(RECIPES.length).toBeGreaterThanOrEqual(45);
    expect(duplicates(RECIPES.map((r) => r.name))).toEqual([]);
  });

  it("references existing ingredients with a compatible unit and a positive quantity", () => {
    const problems: string[] = [];
    for (const r of RECIPES) {
      for (const item of r.items) {
        const ingredient = ingredientsByName.get(item.ingredient);
        if (!ingredient) {
          problems.push(`${r.name}: unknown ingredient "${item.ingredient}"`);
          continue;
        }
        if (unitFamily(item.unit) !== unitFamily(ingredient.unit)) {
          problems.push(
            `${r.name}: ${item.ingredient} in ${item.unit}, expected ${ingredient.unit}`,
          );
        }
        if (!(item.qtyPerPerson > 0)) {
          problems.push(
            `${r.name}: ${item.ingredient} quantity ${item.qtyPerPerson}`,
          );
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it("does not list the same ingredient twice in a recipe", () => {
    for (const r of RECIPES) {
      expect(duplicates(r.items.map((i) => i.ingredient)), r.name).toEqual([]);
    }
  });

  it("uses 2 to 4 known tags per recipe", () => {
    const known = new Set(TAGS);
    for (const r of RECIPES) {
      expect(r.tags.length, r.name).toBeGreaterThanOrEqual(2);
      expect(r.tags.length, r.name).toBeLessThanOrEqual(4);
      expect(
        r.tags.filter((t) => !known.has(t)),
        r.name,
      ).toEqual([]);
      expect(duplicates(r.tags), r.name).toEqual([]);
    }
  });

  it("uses every tag of TAGS at least once", () => {
    const used = new Set(RECIPES.flatMap((r) => r.tags));
    expect(TAGS.filter((t) => !used.has(t))).toEqual([]);
    expect(duplicates(TAGS)).toEqual([]);
  });

  it("has realistic times, fridge days, steps and content", () => {
    for (const r of RECIPES) {
      expect(Number.isInteger(r.prepMinutes) && r.prepMinutes > 0, r.name).toBe(
        true,
      );
      expect(Number.isInteger(r.fridgeDays), r.name).toBe(true);
      expect(r.fridgeDays, r.name).toBeGreaterThanOrEqual(0);
      expect(r.fridgeDays, r.name).toBeLessThanOrEqual(5);
      expect(r.steps.length, r.name).toBeGreaterThanOrEqual(4);
      expect(r.steps.length, r.name).toBeLessThanOrEqual(7);
      expect(r.items.length, r.name).toBeGreaterThan(0);
      expect(r.emoji.length, r.name).toBeGreaterThan(0);
      expect(r.description.length, r.name).toBeGreaterThan(0);
    }
  });

  it("keeps Express recipes at 20 minutes or less", () => {
    const slow = RECIPES.filter(
      (r) => r.tags.includes("Express") && r.prepMinutes > 20,
    );
    expect(slow.map((r) => r.name)).toEqual([]);
  });
});

describe("seed data: stores and members", () => {
  it("lists every aisle exactly once in each store order", () => {
    const sortedKeys = [...aisleKeys].sort();
    for (const s of STORES) {
      expect([...s.aisleOrder].sort(), s.name).toEqual(sortedKeys);
    }
  });

  it("has unique store names, distinct orders and positive price factors", () => {
    expect(duplicates(STORES.map((s) => s.name))).toEqual([]);
    expect(duplicates(STORES.map((s) => s.aisleOrder.join(",")))).toEqual([]);
    for (const s of STORES) expect(s.priceFactor, s.name).toBeGreaterThan(0);
  });

  it("has the three family members with distinct hex colors", () => {
    expect(MEMBERS.map((m) => m.name)).toEqual([
      "Pierre-Alain",
      "Patricia",
      "Clara",
    ]);
    for (const m of MEMBERS)
      expect(m.color, m.name).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(duplicates(MEMBERS.map((m) => m.color))).toEqual([]);
  });
});

describe("seed data: typography", () => {
  it("contains no em dash nor en dash", () => {
    // Built from code points so this test file itself stays free of those dashes
    const dashes = new RegExp(`[${String.fromCharCode(0x2014, 0x2013)}]`);
    const bad = allTexts().filter(({ text }) => dashes.test(text));
    expect(bad).toEqual([]);
  });

  it("never puts a plain space before : ; ! ? (Swiss French uses a no-break space)", () => {
    const bad = allTexts().filter(({ text }) => / [:;!?]/.test(text));
    expect(bad).toEqual([]);
  });

  it("has no leading, trailing or double spaces", () => {
    const bad = allTexts().filter(
      ({ text }) => text !== text.trim() || /  /.test(text),
    );
    expect(bad).toEqual([]);
  });
});
