/// <reference types="vite/client" />
// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { hashPassword } from "./domain/auth";

const modules = import.meta.glob("./**/*.ts");
const SATURDAY = "2026-10-24";

/** A seeded family whose admin Ada is signed in, in French. */
async function setup() {
  const t = convexTest(schema, modules);
  await t.mutation(internal.families.create, { name: "Test", admin: "Ada" });
  const passwordHash = await hashPassword("carottes-rapees", 1000);
  await t.run(async (ctx) => {
    for (const m of await ctx.db.query("members").collect())
      await ctx.db.patch(m._id, { passwordHash });
  });
  const r = await t.action(api.access.login, {
    family: "test",
    username: "ada",
    password: "carottes-rapees",
  });
  if (!r.ok) throw new Error(r.error);
  const me = await t.query(api.access.check, { token: r.token });
  return { t, token: r.token, meId: me!.memberId };
}

const ingredientNamed = (
  t: Awaited<ReturnType<typeof setup>>["t"],
  name: string,
) =>
  t.run(async (ctx) =>
    (await ctx.db.query("ingredients").collect()).find((i) => i.name === name)!,
  );

describe("German names of the catalogue", () => {
  it("come with the starter catalogue of a new family", async () => {
    const { t } = await setup();
    const oignon = await ingredientNamed(t, "Oignon");
    expect(oignon.nameDe).toBe("Zwiebel");
    const missing = await t.query(internal.catalogTranslate.missing, {
      familyId: oignon.familyId,
    });
    expect(missing.items).toEqual([]);
  });

  it("are saved, changed and removed with the product", async () => {
    const { t, token } = await setup();
    const oignon = await ingredientNamed(t, "Oignon");
    const edit = (nameDe?: string) =>
      t.mutation(api.catalog.upsertIngredient, {
        token,
        id: oignon._id,
        name: "Oignon",
        nameDe,
        aisleId: oignon.aisleId,
        unit: oignon.unit,
      });
    await edit("Gelbe Zwiebel");
    expect((await ingredientNamed(t, "Oignon")).nameDe).toBe("Gelbe Zwiebel");
    await edit(undefined); // an older app without the field keeps it
    expect((await ingredientNamed(t, "Oignon")).nameDe).toBe("Gelbe Zwiebel");
    await edit("");
    expect((await ingredientNamed(t, "Oignon")).nameDe).toBeUndefined();
  });

  it("show on the shopping list of a German profile only", async () => {
    const { t, token, meId } = await setup();
    const recipes = await t.query(api.recipes.list, { token });
    const recipe = recipes.find((r) => r.items.length >= 3)!;
    await t.mutation(api.meals.add, {
      token,
      date: SATURDAY,
      slot: "soir",
      recipeId: recipe._id,
      persons: 3,
    });
    const labels = async () =>
      (
        await t.query(api.shopping.list, { token, start: SATURDAY })
      ).sections.flatMap((s) => [s.name, ...s.items.map((i) => i.label)]);
    const french = await labels();
    await t.mutation(api.access.setLang, { token, id: meId, lang: "de" });
    const german = await labels();
    expect(german).toHaveLength(french.length);
    expect(german).not.toEqual(french);
    expect(german).toContain("Früchte und Gemüse");
    expect(french).toContain("Fruits et légumes");
  });

  it("are filled for the family's own items only, never over a name already given", async () => {
    const { t, token } = await setup();
    const oignon = await ingredientNamed(t, "Oignon");
    const other = await t.run(async (ctx) => {
      const familyId = await ctx.db.insert("families", {
        name: "Autre",
        slug: "autre",
        suspended: false,
        createdAt: 0,
      });
      const aisleId = await ctx.db.insert("aisles", {
        familyId,
        name: "Divers",
        emoji: "🛒",
        order: 0,
      });
      return ctx.db.insert("ingredients", {
        familyId,
        name: "Poivre",
        aisleId,
        unit: "g",
      });
    });
    const id = await t.mutation(api.catalog.upsertIngredient, {
      token,
      name: "Topinambour",
      aisleId: oignon.aisleId,
      unit: "g",
    });
    const saved = await t.mutation(internal.catalogTranslate.apply, {
      familyId: oignon.familyId,
      names: [
        { table: "ingredients", id, nameDe: "Topinambur" },
        { table: "ingredients", id: oignon._id, nameDe: "Falsch" },
        { table: "ingredients", id: other, nameDe: "Pfeffer" },
        { table: "ingredients", id: "pas-un-id", nameDe: "Nichts" },
      ],
    });
    expect(saved).toBe(1);
    expect((await ingredientNamed(t, "Topinambour")).nameDe).toBe("Topinambur");
    expect((await ingredientNamed(t, "Oignon")).nameDe).toBe("Zwiebel");
    expect(await t.run(async (ctx) => (await ctx.db.get(other))!.nameDe ?? null)).toBeNull();
  });

  it("are counted for admins only", async () => {
    const { t, token } = await setup();
    expect(await t.query(api.catalogTranslate.missingCount, { token })).toBe(0);
    const oignon = await ingredientNamed(t, "Oignon");
    await t.mutation(api.catalog.upsertIngredient, {
      token,
      name: "Topinambour",
      aisleId: oignon.aisleId,
      unit: "g",
    });
    expect(await t.query(api.catalogTranslate.missingCount, { token })).toBe(1);
    await t.run(async (ctx) => {
      for (const m of await ctx.db.query("members").collect())
        await ctx.db.patch(m._id, { role: "membre" });
    });
    await expect(
      t.query(api.catalogTranslate.missingCount, { token }),
    ).rejects.toThrow(/admins/);
  });
});

describe("background translation", () => {
  it("runs once for a burst of new items, after a German profile is set", async () => {
    const { t, token, meId } = await setup();
    const oignon = await ingredientNamed(t, "Oignon");
    const queued = () => t.run(async (ctx) => (await ctx.db.get(oignon.familyId))!.germanNames?.queuedAt ?? null);
    // A French family: nothing to translate, nothing queued
    await t.mutation(api.staples.create, { token, name: "Bougies" });
    expect(await queued()).toBeNull();
    await t.mutation(api.access.setLang, { token, id: meId, lang: "de" });
    const first = await queued();
    expect(first).not.toBeNull();
    await t.mutation(api.staples.create, { token, name: "Allumettes" });
    await t.mutation(api.staples.create, { token, name: "Ficelle" });
    expect(await queued()).toBe(first);
    const scheduled = await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect());
    expect(scheduled.filter((f) => f.name.includes("catalogTranslate"))).toHaveLength(1);
  });

  it("cleans the names proposed by Claude", async () => {
    const { cleanGermanName } = await import("./domain/lang");
    expect(cleanGermanName("  Strassen\nGemüse ", 80)).toBe("Strassen Gemüse");
    expect(cleanGermanName("Grosse Weißwurst", 80)).toBe("Grosse Weisswurst");
    expect(cleanGermanName("a".repeat(70), 60)).toHaveLength(60);
    expect(cleanGermanName("   ", 60)).toBe("");
  });
});
