/// <reference types="vite/client" />
// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { hashPassword } from "./domain/auth";

const modules = import.meta.glob("./**/*.ts");
const SATURDAY = "2026-10-24"; // first day of a shopping week (default shopping day)
const NEXT_WEEK = "2026-10-31";

async function setup() {
  const t = convexTest(schema, modules);
  await t.mutation(internal.families.create, { name: "Test", admin: "Ada" });
  const passwordHash = await hashPassword("carottes-rapees", 1000);
  await t.run(async (ctx) => {
    for (const m of await ctx.db.query("members").collect()) await ctx.db.patch(m._id, { passwordHash });
  });
  const r = await t.action(api.access.login, { family: "test", username: "ada", password: "carottes-rapees" });
  if (!r.ok) throw new Error(r.error);
  const token = r.token;
  const recipes = await t.query(api.recipes.list, { token });
  // A dish with several ingredients, like the wok
  const recipe = recipes.find((x) => x.items.length >= 3)!;
  return { t, token, recipe };
}

const itemsOf = async (t: Awaited<ReturnType<typeof setup>>["t"], token: string, start: string) =>
  (await t.query(api.shopping.list, { token, start })).sections.flatMap((s) => s.items).filter((i) => !i.extra);

describe("a dish not cooked", () => {
  it("leaves the list, keeps what was bought at home, and comes back with « Prévu »", async () => {
    const { t, token, recipe } = await setup();
    const id = await t.mutation(api.meals.add, { token, date: SATURDAY, slot: "soir", recipeId: recipe._id, persons: 3 });
    const before = await itemsOf(t, token, SATURDAY);
    expect(before.length).toBeGreaterThanOrEqual(3);
    // The chicken was bought on Saturday morning
    const bought = before[0];
    await t.mutation(api.shopping.toggle, { token, start: SATURDAY, itemKey: bought.key, checked: true });

    const preview = await t.query(api.meals.notCookedPreview, { token, id });
    expect(preview.items.filter((i) => i.bought).map((i) => i.ingredientId)).toEqual([bought.ingredientId]);
    const keep = preview.items.filter((i) => i.bought).map(({ ingredientId, qty, unit }) => ({ ingredientId, qty, unit }));
    await t.mutation(api.meals.markNotCooked, { token, id, keep });

    // Nothing left to buy for it, the dish stays in the week as « pas cuisiné »
    expect(await itemsOf(t, token, SATURDAY)).toEqual([]);
    expect((await t.query(api.meals.week, { token, start: SATURDAY }))[0].status).toBe("pas cuisiné");
    const stock = await t.query(api.homeStock.list, { token });
    expect(stock.items).toEqual([expect.objectContaining({ ingredientId: bought.ingredientId, since: SATURDAY, from: recipe.name })]);
    expect(stock.ideas.map((i) => i._id)).toContain(recipe._id);

    // Planned again next week: the list says it may be at home, and still lists it
    await t.mutation(api.meals.add, { token, date: NEXT_WEEK, slot: "soir", recipeId: recipe._id, persons: 3 });
    const next = (await itemsOf(t, token, NEXT_WEEK)).find((i) => i.ingredientId === bought.ingredientId)!;
    expect(next.homeStock).toEqual([expect.objectContaining({ since: SATURDAY, from: recipe.name })]);

    // Back to « Prévu »: the dish uses its ingredients again
    await t.mutation(api.meals.setStatus, { token, id, status: "prévu" });
    expect((await t.query(api.homeStock.list, { token })).items).toEqual([]);
    expect((await itemsOf(t, token, SATURDAY)).length).toBe(before.length);
  });

  it("withdraws the leftovers planned from it, and is not for leftovers", async () => {
    const { t, token, recipe } = await setup();
    const id = await t.mutation(api.meals.add, { token, date: SATURDAY, slot: "soir", recipeId: recipe._id, persons: 2, extraPortions: 2 });
    const leftover = await t.mutation(api.meals.planLeftover, { token, sourceId: id, date: "2026-10-25", slot: "midi", persons: 2 });
    await expect(t.mutation(api.meals.markNotCooked, { token, id: leftover, keep: [] })).rejects.toThrow("restes");
    expect((await t.query(api.meals.notCookedPreview, { token, id })).leftoversPlanned).toBe(1);
    await t.mutation(api.meals.markNotCooked, { token, id, keep: [] });
    const week = await t.query(api.meals.week, { token, start: SATURDAY });
    expect(week.map((m) => m._id)).toEqual([id]);
    expect(week[0].leftoverPortions).toBe(0);
    // Only through « Pas cuisiné », which asks about the ingredients
    await expect(t.mutation(api.meals.setStatus, { token, id, status: "pas cuisiné" })).rejects.toThrow("Pas cuisiné");
  });

  it("cancels tomorrow's lunch cooked with tonight's dinner, without counting the food twice", async () => {
    const { t, token, recipe } = await setup();
    const dinner = await t.mutation(api.meals.add, {
      token, date: SATURDAY, slot: "soir", recipeId: recipe._id, persons: 3, tomorrowLunchPersons: 2,
    });
    // Another dish of the same recipe, cooked on its own later: not part of it
    await t.mutation(api.meals.add, { token, date: "2026-10-27", slot: "soir", recipeId: recipe._id, persons: 3 });
    const items = await itemsOf(t, token, SATURDAY);
    const bought = items[0];
    await t.mutation(api.shopping.toggle, { token, start: SATURDAY, itemKey: bought.key, checked: true });
    const lunch = (await t.query(api.meals.week, { token, start: SATURDAY })).find((m) => m.slot === "midi")!;

    // Asked from the lunch: the whole cooking is cancelled, dinner included
    const preview = await t.query(api.meals.notCookedPreview, { token, id: lunch._id });
    expect(preview.together).toEqual([{ date: SATURDAY, slot: "soir" }]);
    const kept = preview.items.find((i) => i.bought)!;
    expect(kept.qty).toBeGreaterThan(0);
    const keep = [{ ingredientId: kept.ingredientId, qty: kept.qty, unit: kept.unit }];
    await t.mutation(api.meals.markNotCooked, { token, id: lunch._id, keep });
    const week = await t.query(api.meals.week, { token, start: SATURDAY });
    expect(week.filter((m) => m.date < "2026-10-27").map((m) => m.status)).toEqual(["pas cuisiné", "pas cuisiné"]);
    expect(week.find((m) => m.date === "2026-10-27")!.status).toBe("prévu");

    // Asked again from the dinner: still one stock, not two
    await t.mutation(api.meals.markNotCooked, { token, id: dinner, keep });
    const stock = (await t.query(api.homeStock.list, { token })).items;
    expect(stock).toEqual([expect.objectContaining({ ingredientId: kept.ingredientId })]);

    // Cooked after all: both meals come back, the stock is used by the dish
    await t.mutation(api.meals.setStatus, { token, id: dinner, status: "prévu" });
    const back = await t.query(api.meals.week, { token, start: SATURDAY });
    expect(back.map((m) => m.status)).toEqual(["prévu", "prévu", "prévu"]);
    expect((await t.query(api.homeStock.list, { token })).items).toEqual([]);
  });

  it("is refused on a lunch whose dinner was already eaten", async () => {
    const { t, token, recipe } = await setup();
    const dinner = await t.mutation(api.meals.add, {
      token, date: SATURDAY, slot: "soir", recipeId: recipe._id, persons: 3, tomorrowLunchPersons: 2,
    });
    await t.mutation(api.meals.setStatus, { token, id: dinner, status: "mangé" });
    const lunch = (await t.query(api.meals.week, { token, start: SATURDAY })).find((m) => m.slot === "midi")!;
    await expect(t.mutation(api.meals.markNotCooked, { token, id: lunch._id, keep: [] })).rejects.toThrow("Pas mangé");
  });

  it("is used up or thrown away from the fridge", async () => {
    const { t, token, recipe } = await setup();
    const id = await t.mutation(api.meals.add, { token, date: SATURDAY, slot: "soir", recipeId: recipe._id, persons: 3 });
    const { items } = await t.query(api.meals.notCookedPreview, { token, id });
    await t.mutation(api.meals.markNotCooked, {
      token,
      id,
      keep: items.slice(0, 2).map(({ ingredientId, qty, unit }) => ({ ingredientId, qty, unit })),
    });
    const stock = await t.query(api.homeStock.list, { token });
    expect(stock.items).toHaveLength(2);
    await t.mutation(api.homeStock.remove, { token, id: stock.items[0]._id });
    expect((await t.query(api.homeStock.list, { token })).items).toHaveLength(1);
    await expect(
      t.mutation(api.meals.markNotCooked, { token, id, keep: [{ ingredientId: items[0].ingredientId, qty: -1, unit: "g" }] }),
    ).rejects.toThrow("Quantité");
  });
});

describe("the shopping list", () => {
  it("still loads once an item counted in « boîte » or « pincée » is checked", async () => {
    const { t, token, recipe } = await setup();
    // Accented units end up in the item key (ing:<id>:boîte)
    await t.run(async (ctx) => {
      const r = (await ctx.db.get(recipe._id))!;
      await ctx.db.patch(r._id, {
        items: r.items.map((item, i) => (i === 0 ? { ...item, unit: "boîte" as const } : i === 1 ? { ...item, unit: "pincée" as const } : item)),
      });
    });
    await t.mutation(api.meals.add, { token, date: SATURDAY, slot: "soir", recipeId: recipe._id, persons: 3 });
    const accented = (await itemsOf(t, token, SATURDAY)).filter((i) => /[^\x20-\x7e]/.test(i.key));
    expect(accented.length).toBe(2);
    const memberId = await t.run(async (ctx) => (await ctx.db.query("members").first())!._id);
    for (const item of accented)
      await t.mutation(api.shopping.toggle, { token, start: SATURDAY, itemKey: item.key, checked: true, memberId });

    const after = (await itemsOf(t, token, SATURDAY)).filter((i) => accented.some((a) => a.key === i.key));
    expect(after.map((i) => [i.checked, i.checkedBy])).toEqual([[true, memberId], [true, memberId]]);
  });
});
