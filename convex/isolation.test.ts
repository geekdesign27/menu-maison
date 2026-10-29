/// <reference types="vite/client" />
// @vitest-environment edge-runtime
//
// Two families on one deployment: family B must never read, change or delete
// anything of family A, whatever ids it sends. Every public function is either
// exercised here or listed with the reason it needs no cross-family case.
import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";
import { sha256 } from "./lib";
import { seedFamily } from "./seed";

const modules = import.meta.glob("./**/*.ts");

const DATE = "2026-10-24"; // a Saturday, start of a planning week

async function setup() {
  const t = convexTest(schema, modules);
  const make = (slug: string, token: string) =>
    t.run(async (ctx) => {
      const familyId = await ctx.db.insert("families", {
        name: slug,
        slug,
        suspended: false,
        createdAt: 0,
      });
      const memberId = await ctx.db.insert("members", {
        familyId,
        name: slug.toUpperCase(),
        emoji: "🙂",
        color: "#A8C8E8",
        order: 0,
        username: "admin",
        passwordHash: "pbkdf2-sha256$1$00$00", // never checked here: the session is inserted directly
        role: "admin",
      });
      await ctx.db.insert("sessions", {
        token: await sha256(token),
        memberId,
        familyId,
        createdAt: 0,
        expiresAt: Date.now() + 3_600_000,
      });
      await seedFamily(ctx, familyId);
      return { familyId, memberId };
    });
  const a = {
    token: "token-famille-a",
    ...(await make("famille-a", "token-famille-a")),
  };
  const b = {
    token: "token-famille-b",
    ...(await make("famille-b", "token-famille-b")),
  };

  // Family A uses the app: a meal with extra portions, a liked recipe, a wish,
  // a usual item on the list, a checked item, a usual week, a receipt
  const base = await t.query(api.catalog.base, { token: a.token });
  const recipes = await t.query(api.recipes.list, { token: a.token });
  const recipe = recipes[0];
  const aisle = base.aisles[0];
  const ingredient = base.ingredients[0];
  const store = base.stores[0];
  const mealId = await t.mutation(api.meals.add, {
    token: a.token,
    date: DATE,
    slot: "soir",
    recipeId: recipe._id,
    persons: 3,
    extraPortions: 2,
  });
  await t.mutation(api.meals.setStatus, {
    token: a.token,
    id: mealId,
    status: "mangé",
    leftoverPortions: 2,
  });
  await t.mutation(api.recipes.toggleLike, {
    token: a.token,
    recipeId: recipe._id,
    memberId: a.memberId,
  });
  const wishId = await t.mutation(api.wishes.add, {
    token: a.token,
    memberId: a.memberId,
    text: "Raclette",
  });
  const extraId = await t.mutation(api.shopping.addExtra, {
    token: a.token,
    start: DATE,
    label: "Papier toilette",
  });
  await t.mutation(api.shopping.toggle, {
    token: a.token,
    start: DATE,
    itemKey: "x",
    checked: true,
  });
  const templateId = await t.mutation(api.templates.saveWeek, {
    token: a.token,
    name: "Semaine A",
    start: DATE,
  });
  const staples = await t.query(api.staples.list, {
    token: a.token,
    start: DATE,
  });
  const staple = staples.find((s) => s.extraId === extraId)!;
  await t.mutation(api.receipts.save, {
    token: a.token,
    chain: "Coop",
    date: DATE,
    lines: [
      {
        label: "PAPIER WC",
        unitPrice: 5,
        weightKg: 0,
        pricePerKg: 0,
        target: { kind: "staple", id: staple._id },
        packQty: null,
        newStapleName: null,
      },
    ],
  });
  // Family A has an ingredient at home from a dish it did not cook
  const stockId = await t.run((ctx) =>
    ctx.db.insert("homeStock", {
      familyId: a.familyId,
      ingredientId: ingredient._id,
      qty: 450,
      unit: "g",
      since: DATE,
      fromName: recipe.name,
    }),
  );
  return {
    t,
    a,
    b,
    ids: {
      stockId,
      mealId,
      wishId,
      extraId,
      templateId,
      recipe,
      aisle,
      ingredient,
      store,
      staple,
    },
  };
}

type Setup = Awaited<ReturnType<typeof setup>>;
let s: Setup;

beforeEach(async () => {
  s = await setup();
});

/** Every id family A owns, as stored in the database. */
async function idsOfA() {
  return s.t.run(async (ctx) => {
    const ids = new Set<string>();
    for (const table of [
      "members",
      "aisles",
      "ingredients",
      "recipes",
      "likes",
      "stores",
      "meals",
      "templates",
      "shoppingChecks",
      "shoppingExtras",
      "staples",
      "stockSkips",
      "wishes",
      "chainPrices",
      "receiptAliases",
      "settings",
      "homeStock",
    ] as const) {
      for (const row of await ctx.db.query(table).collect())
        if (row.familyId === s.a.familyId) ids.add(row._id);
    }
    return [...ids];
  });
}

/** Snapshot of family A's rows, to prove nothing changed. */
async function snapshotA() {
  return s.t.run(async (ctx) => {
    const out: Record<string, unknown[]> = {};
    for (const table of [
      "members",
      "aisles",
      "ingredients",
      "recipes",
      "likes",
      "stores",
      "meals",
      "templates",
      "shoppingChecks",
      "shoppingExtras",
      "staples",
      "wishes",
      "chainPrices",
      "receiptAliases",
      "settings",
      "homeStock",
    ] as const) {
      out[table] = (await ctx.db.query(table).collect()).filter(
        (r) => r.familyId === s.a.familyId,
      );
    }
    return out;
  });
}

describe("reads stay within the family", () => {
  it("family B sees none of family A's ids", async () => {
    const own = await idsOfA();
    const { token } = s.b;
    const results = [
      await s.t.query(api.catalog.base, { token }),
      await s.t.query(api.recipes.list, { token }),
      await s.t.query(api.recipes.get, { token, id: s.ids.recipe._id }),
      await s.t.query(api.meals.week, { token, start: DATE }),
      await s.t.query(api.meals.fridge, { token, today: "2026-10-25" }),
      await s.t.query(api.meals.leftoversFor, { token, date: "2026-10-25" }),
      await s.t.query(api.shopping.list, {
        token,
        start: DATE,
        storeId: s.ids.store._id,
      }),
      await s.t.query(api.staples.list, { token, start: DATE }),
      await s.t.query(api.products.list, { token }),
      await s.t.query(api.wishes.list, { token }),
      await s.t.query(api.templates.list, { token }),
      await s.t.query(api.stats.overview, { token, today: "2026-10-25" }),
      await s.t.query(api.homeStock.list, { token }),
      await s.t.query(api.onboarding.facts, { token }),
    ];
    // Each id of family A is looked for as it is, whatever its format
    const json = JSON.stringify(results);
    expect(own.length).toBeGreaterThan(200);
    expect(own.filter((id) => json.includes(id))).toEqual([]);
    // Family A sees its own data (the test would be blind otherwise)
    expect(
      (await s.t.query(api.meals.week, { token: s.a.token, start: DATE }))
        .length,
    ).toBeGreaterThan(0);
  });

  it("the password hash never reaches the app", async () => {
    const base = await s.t.query(api.catalog.base, { token: s.a.token });
    expect(JSON.stringify(base)).not.toContain("pbkdf2");
  });

  it("refuses an unknown or expired session", async () => {
    await expect(
      s.t.query(api.catalog.base, { token: "nope" }),
    ).rejects.toThrow("Session expirée");
  });

  it("a suspended family is signed out", async () => {
    await s.t.run((ctx) => ctx.db.patch(s.a.familyId, { suspended: true }));
    expect(await s.t.query(api.access.check, { token: s.a.token })).toBeNull();
    await expect(
      s.t.query(api.recipes.list, { token: s.a.token }),
    ).rejects.toThrow("Session expirée");
  });
});

describe("writes on another family's ids are refused", () => {
  // Each case is a call by family B aimed at family A's data
  const cases: [string, () => Promise<unknown>][] = [
    [
      "catalog.updateSettings",
      () =>
        s.t.mutation(api.catalog.updateSettings, {
          token: s.b.token,
          defaultStoreId: s.ids.store._id,
        }),
    ],
    [
      "catalog.updateMember",
      () =>
        s.t.mutation(api.catalog.updateMember, {
          token: s.b.token,
          id: s.a.memberId,
          name: "X",
          emoji: "🙂",
          color: "#000000",
        }),
    ],
    [
      "access.setUsername",
      () =>
        s.t.mutation(api.access.setUsername, {
          token: s.b.token,
          id: s.a.memberId,
          username: "pirate",
        }),
    ],
    [
      "meals.notCookedPreview",
      () => s.t.query(api.meals.notCookedPreview, { token: s.b.token, id: s.ids.mealId }),
    ],
    [
      "meals.markNotCooked",
      () => s.t.mutation(api.meals.markNotCooked, { token: s.b.token, id: s.ids.mealId, keep: [] }),
    ],
    [
      "meals.markNotCooked (keeps another family's ingredient)",
      async () => {
        const recipes = await s.t.query(api.recipes.list, { token: s.b.token });
        const own = await s.t.mutation(api.meals.add, {
          token: s.b.token,
          date: DATE,
          slot: "midi",
          recipeId: recipes[0]._id,
          persons: 2,
        });
        return s.t.mutation(api.meals.markNotCooked, {
          token: s.b.token,
          id: own,
          keep: [{ ingredientId: s.ids.ingredient._id, qty: 100, unit: "g" }],
        });
      },
    ],
    [
      "homeStock.remove",
      () => s.t.mutation(api.homeStock.remove, { token: s.b.token, id: s.ids.stockId }),
    ],
    [
      "access.setRole",
      () =>
        s.t.mutation(api.access.setRole, {
          token: s.b.token,
          id: s.a.memberId,
          role: "membre",
        }),
    ],
    [
      "access.setLang",
      () =>
        s.t.mutation(api.access.setLang, {
          token: s.b.token,
          id: s.a.memberId,
          lang: "de",
        }),
    ],
    [
      "access.resetLink",
      () =>
        s.t.mutation(api.access.resetLink, {
          token: s.b.token,
          id: s.a.memberId,
        }),
    ],
    // A family admin is not the super-admin: the whole space is refused
    ["superadmin.families", () => s.t.query(api.superadmin.families, { token: s.b.token })],
    [
      "superadmin.createOne",
      () => s.t.mutation(api.superadmin.createOne, { token: s.b.token, name: "Pirates", admin: "Jack" }),
    ],
    [
      "superadmin.adminLink",
      () => s.t.mutation(api.superadmin.adminLink, { token: s.b.token, memberId: s.a.memberId }),
    ],
    [
      "superadmin.setSuspended",
      () => s.t.mutation(api.superadmin.setSuspended, { token: s.b.token, familyId: s.a.familyId, suspended: true }),
    ],
    [
      "superadmin.setOffered",
      () => s.t.mutation(api.superadmin.setOffered, { token: s.b.token, familyId: s.a.familyId, offered: false }),
    ],
    [
      "superadmin.setAiCaps",
      () => s.t.mutation(api.superadmin.setAiCaps, { token: s.b.token, familyId: s.a.familyId, capUsd: 100, dictationCap: 1000 }),
    ],
    [
      "catalog.setMemberPhoto",
      () =>
        s.t.mutation(api.catalog.setMemberPhoto, {
          token: s.b.token,
          id: s.a.memberId,
          imageId: null,
        }),
    ],
    [
      "catalog.upsertIngredient (update)",
      () =>
        s.t.mutation(api.catalog.upsertIngredient, {
          token: s.b.token,
          id: s.ids.ingredient._id,
          name: "Pirate",
          aisleId: s.ids.aisle._id,
          unit: "g",
        }),
    ],
    [
      "catalog.upsertIngredient (aisle)",
      () =>
        s.t.mutation(api.catalog.upsertIngredient, {
          token: s.b.token,
          name: "Pirate",
          aisleId: s.ids.aisle._id,
          unit: "g",
        }),
    ],
    [
      "catalog.removeIngredient",
      () =>
        s.t.mutation(api.catalog.removeIngredient, {
          token: s.b.token,
          id: s.ids.ingredient._id,
        }),
    ],
    [
      "catalog.renameAisle",
      () =>
        s.t.mutation(api.catalog.renameAisle, {
          token: s.b.token,
          id: s.ids.aisle._id,
          name: "Pirate",
          emoji: "🏴",
        }),
    ],
    [
      "catalog.createStore (copy)",
      async () => {
        // Copying another family's store must not copy its aisles
        const id = await s.t.mutation(api.catalog.createStore, {
          token: s.b.token,
          chain: "Coop",
          name: "Copie",
          copyFrom: s.ids.store._id,
        });
        const store = await s.t.run((ctx) => ctx.db.get(id));
        const own = await idsOfA();
        if (store!.aisleOrder.some((x) => own.includes(x)))
          throw new Error("copied");
        throw new Error("ok: nothing copied");
      },
    ],
    [
      "catalog.updateStore",
      () =>
        s.t.mutation(api.catalog.updateStore, {
          token: s.b.token,
          id: s.ids.store._id,
          name: "Pirate",
        }),
    ],
    [
      "catalog.updateStore (aisles)",
      async () => {
        const own = (await s.t.query(api.catalog.base, { token: s.b.token }))
          .stores[0];
        return s.t.mutation(api.catalog.updateStore, {
          token: s.b.token,
          id: own._id,
          aisleOrder: [s.ids.aisle._id],
        });
      },
    ],
    [
      "catalog.setOverride",
      () =>
        s.t.mutation(api.catalog.setOverride, {
          token: s.b.token,
          storeId: s.ids.store._id,
          ingredientId: s.ids.ingredient._id,
          aisleId: null,
        }),
    ],
    [
      "meals.add (recipe)",
      () =>
        s.t.mutation(api.meals.add, {
          token: s.b.token,
          date: DATE,
          slot: "midi",
          recipeId: s.ids.recipe._id,
          persons: 2,
        }),
    ],
    [
      "meals.update",
      () =>
        s.t.mutation(api.meals.update, {
          token: s.b.token,
          id: s.ids.mealId,
          persons: 9,
        }),
    ],
    [
      "meals.setStatus",
      () =>
        s.t.mutation(api.meals.setStatus, {
          token: s.b.token,
          id: s.ids.mealId,
          status: "prévu",
        }),
    ],
    [
      "meals.remove",
      async () => {
        await s.t.mutation(api.meals.remove, {
          token: s.b.token,
          id: s.ids.mealId,
        });
        throw new Error("ok: silently ignored");
      },
    ],
    [
      "meals.planLeftover",
      () =>
        s.t.mutation(api.meals.planLeftover, {
          token: s.b.token,
          sourceId: s.ids.mealId,
          date: "2026-10-25",
          slot: "midi",
          persons: 1,
        }),
    ],
    [
      "meals.discardLeftover",
      () =>
        s.t.mutation(api.meals.discardLeftover, {
          token: s.b.token,
          id: s.ids.mealId,
        }),
    ],
    [
      "meals.addRecurring",
      () =>
        s.t.mutation(api.meals.addRecurring, {
          token: s.b.token,
          date: DATE,
          slot: "matin",
          recipeId: s.ids.recipe._id,
          persons: 1,
          weekdays: [1],
          weeks: 1,
        }),
    ],
    [
      "recipes.create (ingredient)",
      () =>
        s.t.mutation(api.recipes.create, {
          token: s.b.token,
          name: "Pirate",
          emoji: "🏴",
          tags: [],
          prepMinutes: 10,
          fridgeDays: 1,
          steps: [],
          items: [
            {
              ingredientId: s.ids.ingredient._id,
              qtyPerPerson: 1,
              unit: s.ids.ingredient.unit,
            },
          ],
        }),
    ],
    [
      "recipes.create (new ingredient in A's aisle)",
      () =>
        s.t.mutation(api.recipes.create, {
          token: s.b.token,
          name: "Pirate",
          emoji: "🏴",
          tags: [],
          prepMinutes: 10,
          fridgeDays: 1,
          steps: [],
          items: [
            {
              newIngredient: {
                name: "Truc",
                unit: "g",
                aisleId: s.ids.aisle._id,
              },
              qtyPerPerson: 1,
              unit: "g",
            },
          ],
        }),
    ],
    [
      "recipes.create (member)",
      () =>
        s.t.mutation(api.recipes.create, {
          token: s.b.token,
          memberId: s.a.memberId,
          name: "Pirate",
          emoji: "🏴",
          tags: [],
          prepMinutes: 10,
          fridgeDays: 1,
          steps: [],
          items: [],
        }),
    ],
    [
      "recipes.update",
      () =>
        s.t.mutation(api.recipes.update, {
          token: s.b.token,
          id: s.ids.recipe._id,
          name: "Pirate",
          emoji: "🏴",
          tags: [],
          prepMinutes: 10,
          fridgeDays: 1,
          steps: [],
          items: [],
        }),
    ],
    [
      "recipes.archive",
      () =>
        s.t.mutation(api.recipes.archive, {
          token: s.b.token,
          id: s.ids.recipe._id,
        }),
    ],
    [
      "recipes.setSaved",
      () =>
        s.t.mutation(api.recipes.setSaved, {
          token: s.b.token,
          id: s.ids.recipe._id,
          saved: false,
        }),
    ],
    [
      "recipes.toggleLike (recipe)",
      () =>
        s.t.mutation(api.recipes.toggleLike, {
          token: s.b.token,
          recipeId: s.ids.recipe._id,
          memberId: s.b.memberId,
        }),
    ],
    [
      "recipes.toggleLike (member)",
      async () => {
        const own = (
          await s.t.query(api.recipes.list, { token: s.b.token })
        )[0];
        return s.t.mutation(api.recipes.toggleLike, {
          token: s.b.token,
          recipeId: own._id,
          memberId: s.a.memberId,
        });
      },
    ],
    [
      "recipes.duplicate",
      () =>
        s.t.mutation(api.recipes.duplicate, {
          token: s.b.token,
          id: s.ids.recipe._id,
        }),
    ],
    [
      "shopping.toggle (member)",
      () =>
        s.t.mutation(api.shopping.toggle, {
          token: s.b.token,
          start: DATE,
          itemKey: "y",
          checked: true,
          memberId: s.a.memberId,
        }),
    ],
    [
      "shopping.addExtra (staple)",
      () =>
        s.t.mutation(api.shopping.addExtra, {
          token: s.b.token,
          start: DATE,
          label: "",
          stapleId: s.ids.staple._id,
        }),
    ],
    [
      "shopping.addExtra (aisle)",
      () =>
        s.t.mutation(api.shopping.addExtra, {
          token: s.b.token,
          start: DATE,
          label: "Pirate",
          aisleId: s.ids.aisle._id,
        }),
    ],
    [
      "shopping.removeExtra",
      () =>
        s.t.mutation(api.shopping.removeExtra, {
          token: s.b.token,
          id: s.ids.extraId,
        }),
    ],
    [
      "shopping.setExtraQty",
      () =>
        s.t.mutation(api.shopping.setExtraQty, {
          token: s.b.token,
          id: s.ids.extraId,
          qty: 9,
        }),
    ],
    [
      "staples.remove",
      () =>
        s.t.mutation(api.staples.remove, {
          token: s.b.token,
          id: s.ids.staple._id,
        }),
    ],
    [
      "staples.setAisle",
      () =>
        s.t.mutation(api.staples.setAisle, {
          token: s.b.token,
          id: s.ids.staple._id,
          aisleId: null,
          start: DATE,
        }),
    ],
    [
      "staples.update",
      () =>
        s.t.mutation(api.staples.update, {
          token: s.b.token,
          id: s.ids.staple._id,
          name: "Pirate",
          aisleId: null,
          priceChf: null,
          onlyChains: [],
          qty: null,
          imageId: null,
        }),
    ],
    [
      "templates.saveWeek (replace)",
      () =>
        s.t.mutation(api.templates.saveWeek, {
          token: s.b.token,
          name: "Pirate",
          start: DATE,
          replaceId: s.ids.templateId,
        }),
    ],
    [
      "templates.apply",
      () =>
        s.t.mutation(api.templates.apply, {
          token: s.b.token,
          id: s.ids.templateId,
          start: DATE,
          replace: true,
        }),
    ],
    [
      "templates.remove",
      () =>
        s.t.mutation(api.templates.remove, {
          token: s.b.token,
          id: s.ids.templateId,
        }),
    ],
    [
      "wishes.add (member)",
      () =>
        s.t.mutation(api.wishes.add, {
          token: s.b.token,
          memberId: s.a.memberId,
          text: "Pirate",
        }),
    ],
    [
      "wishes.add (recipe)",
      () =>
        s.t.mutation(api.wishes.add, {
          token: s.b.token,
          memberId: s.b.memberId,
          recipeId: s.ids.recipe._id,
        }),
    ],
    [
      "wishes.setDone",
      () =>
        s.t.mutation(api.wishes.setDone, {
          token: s.b.token,
          id: s.ids.wishId,
          done: true,
        }),
    ],
    [
      "wishes.remove",
      () =>
        s.t.mutation(api.wishes.remove, { token: s.b.token, id: s.ids.wishId }),
    ],
    [
      "receipts.save (target)",
      () =>
        s.t.mutation(api.receipts.save, {
          token: s.b.token,
          chain: "Coop",
          date: DATE,
          lines: [
            {
              label: "PIRATE",
              unitPrice: 1,
              weightKg: 0,
              pricePerKg: 0,
              target: { kind: "ingredient", id: s.ids.ingredient._id },
              packQty: null,
              newStapleName: null,
            },
          ],
        }),
    ],
    [
      "openFoodFacts.detach",
      () =>
        s.t.mutation(api.openFoodFacts.detach, {
          token: s.b.token,
          id: s.ids.ingredient._id,
        }),
    ],
    [
      "openFoodFacts.importProduct",
      () =>
        s.t.action(api.openFoodFacts.importProduct, {
          token: s.b.token,
          id: s.ids.ingredient._id,
          code: "7610000000000",
        }),
    ],
  ];

  it.each(cases)("%s", async (_name, call) => {
    const before = await snapshotA();
    // Every case must be refused (the few silent ones throw « ok: … » themselves),
    // and family A must be untouched
    const error = await call().then(
      () => null,
      (e: Error) => e,
    );
    expect(error, "the call went through").not.toBeNull();
    expect(String(error)).not.toBe("Error: copied");
    expect(await snapshotA()).toEqual(before);
  });

  it("refuses with an error, not only by luck", async () => {
    await expect(
      s.t.mutation(api.recipes.archive, {
        token: s.b.token,
        id: s.ids.recipe._id,
      }),
    ).rejects.toThrow("Introuvable");
    await expect(
      s.t.mutation(api.meals.update, {
        token: s.b.token,
        id: s.ids.mealId,
        persons: 9,
      }),
    ).rejects.toThrow("introuvable");
  });

  it("the guide switch and the end of the tour stay in the caller's family", async () => {
    const before = await snapshotA();
    await s.t.mutation(api.onboarding.setEnabled, { token: s.b.token, enabled: true });
    await s.t.mutation(api.onboarding.finish, { token: s.b.token });
    expect(await snapshotA()).toEqual(before);
    // Family A's members, likes, wishes, meals and checks are not counted for B's admin
    expect(await s.t.query(api.onboarding.facts, { token: s.b.token })).toEqual({
      hasEmail: false,
      family: { otherMembers: 0, othersJoined: 0, mealsPlanned: 0, itemsChecked: 0 },
      hasPhoto: false,
      likes: 0,
      wishes: 0,
      mealsAdded: 0,
      itemsChecked: 0,
      statusesSet: 0,
    });
  });

  // Public functions without a cross-family case, and why
  const noCase: Record<string, string> = {
    "access.login": "signs in by family link name, pseudo and password",
    "access.check":
      "reads only the session of its token (tested: suspended family)",
    "access.logout": "deletes only the session of its token",
    "access.family": "public name of a family link, by design",
    "access.inviteInfo": "reads only the invitation of its link",
    "access.activate": "uses only the invitation of its link",
    "families.rename": "renames the caller's own family only (tested in access.test.ts)",
    "catalog.base": "covered by the read test",
    "catalog.addMember": "inserts into the caller's family only",
    "catalog.addAisle":
      "inserts into the caller's family, updates its own stores",
    "catalog.createStore": "covered (copy case)",
    "meals.week": "covered by the read test",
    "meals.fridge": "covered by the read test",
    "meals.leftoversFor": "covered by the read test",
    "recipes.list": "covered by the read test",
    "recipes.get": "covered by the read test",
    "recipes.generateUploadUrl": "upload URL, no data",
    "shopping.list": "covered by the read test",
    "shopping.resetChecks": "period of the caller's family only",
    "shopping.setAtHome": "period of the caller's family only",
    "shopping.setOneAtHome": "period of the caller's family only",
    "staples.list": "covered by the read test",
    "staples.create": "inserts into the caller's family only",
    "products.list": "covered by the read test",
    "stats.overview": "covered by the read test",
    "templates.list": "covered by the read test",
    "wishes.list": "covered by the read test",
    "homeStock.list": "covered by the read test",
    "receipts.read":
      "reads a photo with Claude against the caller's catalog (family-scoped internal query)",
    "recipeImport.read":
      "external page or text, against the caller's catalog (family-scoped internal query)",
    "recipeImport.transcribe": "audio upload of the caller, deleted after use",
    "openFoodFacts.search": "public Open Food Facts search, no family data",
    "onboarding.facts": "covered by the read test",
    "onboarding.finish": "patches the caller only (covered: own family test)",
    "onboarding.setEnabled": "settings and members of the caller's family only (covered: own family test)",
    "catalogTranslate.missingCount": "counts the caller's family only, admins (catalogTranslate.test.ts)",
    "billing.nameAvailable": "public sign-up form: says whether a family name is free, nothing else",
    "superadmin.emailPreviews": "example e-mails for the super-admin, no family data (requireSuperadmin)",
    "billing.mine": "the caller's own family's subscription, admins only (billing.test.ts)",
    "stripeNode.startFamilyCheckout": "Checkout for the caller's own family, admins only, family from the session",
    "stripeNode.openPortal": "Stripe portal of the caller's own family's customer, admins only, family from the session",
    "account.mine": "the caller's own account only, from the session (account.test.ts)",
    "account.setEmail": "the caller's own profile only, from the session (account.test.ts)",
    "account.removeEmail": "the caller's own profile only, from the session (account.test.ts)",
    "account.confirmEmail": "uses only the profile of its link's token (account.test.ts)",
    "account.requestReset": "public form: e-mails a link to the address typed, same answer for everyone (account.test.ts)",
    "account.changePassword": "the caller's own password only, from the session (account.test.ts)",
    "account.signOutOthers": "the caller's own other sessions only (account.test.ts)",
    "familyData.exportAll": "the caller's own family only, admins only (account.test.ts)",
    "stripeNode.deleteFamily": "the caller's own family only, admins only, its name typed (account.test.ts)",
    "stripeNode.startCheckout": "public sign-up: opens a Stripe Checkout page, creates no family (billing.test.ts)",
    "stripeNode.claim":
      "return page: Stripe confirms the session, the link is given only within 48 hours and before the admin's first sign-in (billing.test.ts)",
    "catalogTranslate.translateNow":
      "fills the caller's family only: internal apply checks the family of each id (catalogTranslate.test.ts)",
  };

  it("every public function is covered or explained", async () => {
    const covered = new Set(cases.map(([name]) => name.split(" ")[0]));
    const missing: string[] = [];
    for (const [path, load] of Object.entries(modules)) {
      const module = path.replace(/^\.\//, "").replace(/\.ts$/, "");
      if (module.includes("/") || module.endsWith(".test")) continue;
      for (const [name, fn] of Object.entries(
        (await load()) as Record<string, unknown>,
      )) {
        const f = fn as {
          isPublic?: boolean;
          isQuery?: boolean;
          isMutation?: boolean;
          isAction?: boolean;
        };
        if (!f?.isPublic) continue;
        const key = `${module}.${name}`;
        if (!covered.has(key) && !noCase[key]) missing.push(key);
      }
    }
    expect(missing).toEqual([]);
  });
});

// Keeps the Id import used when the file is type-checked on its own
export type _Unused = Id<"families">;
