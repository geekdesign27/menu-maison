/// <reference types="vite/client" />
// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { sha256 } from "./lib";
import { seedFamily } from "./seed";
import { ONBOARDING_HABITUAL } from "./domain/onboarding";

const modules = import.meta.glob("./**/*.ts");
const DATE = "2026-10-24";

async function setup() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const familyId = await ctx.db.insert("families", {
      name: "Démo",
      slug: "demo",
      suspended: false,
      createdAt: 0,
    });
    await seedFamily(ctx, familyId);
    const add = async (
      name: string,
      role: "admin" | "membre",
      account: boolean,
    ) => {
      const memberId = await ctx.db.insert("members", {
        familyId,
        name,
        emoji: "🙂",
        color: "#A8C8E8",
        order: 0,
        role,
        ...(account
          ? {
              username: name.toLowerCase(),
              passwordHash: "pbkdf2-sha256$1$00$00",
            }
          : {}),
      });
      if (account)
        await ctx.db.insert("sessions", {
          token: await sha256(`token-${name}`),
          memberId,
          familyId,
          createdAt: 0,
          expiresAt: Date.now() + 3_600_000,
        });
      return memberId;
    };
    return {
      familyId,
      admin: await add("Ada", "admin", true),
      member: await add("Max", "membre", true),
      kid: await add("Bébé", "membre", false),
    };
  });
  return { t, ...ids };
}

const member = (t: Awaited<ReturnType<typeof setup>>["t"], id: string) =>
  t.run((ctx) => ctx.db.get(id as never)) as Promise<{
    onboardingDoneAt?: number;
  } | null>;

describe("onboarding switch", () => {
  it("is on for a new family", async () => {
    const t = convexTest(schema, modules);
    const { familyId } = await t.mutation(internal.families.create, {
      name: "Neuve",
      admin: "Lia",
    });
    const settings = await t.run((ctx) =>
      ctx.db
        .query("settings")
        .withIndex("by_family", (q) => q.eq("familyId", familyId))
        .first(),
    );
    expect(settings?.onboarding).toBe(true);
  });

  it("is for the admins only", async () => {
    const { t } = await setup();
    await expect(
      t.mutation(api.onboarding.setEnabled, {
        token: "token-Max",
        enabled: false,
      }),
    ).rejects.toThrow("Réservé aux admins");
  });

  it("marks the accounts already in use as habitués, not the profiles without account", async () => {
    const { t, admin, member: max, kid } = await setup();
    await t.mutation(api.onboarding.setEnabled, {
      token: "token-Ada",
      enabled: true,
    });
    expect((await member(t, admin))?.onboardingDoneAt).toBe(
      ONBOARDING_HABITUAL,
    );
    expect((await member(t, max))?.onboardingDoneAt).toBe(ONBOARDING_HABITUAL);
    expect((await member(t, kid))?.onboardingDoneAt).toBeUndefined();
    const base = await t.query(api.catalog.base, { token: "token-Ada" });
    expect(base.settings.onboarding).toBe(true);
  });

  it("switched off, leaves the members as they are", async () => {
    const { t, admin } = await setup();
    await t.mutation(api.onboarding.setEnabled, {
      token: "token-Ada",
      enabled: false,
    });
    expect((await member(t, admin))?.onboardingDoneAt).toBeUndefined();
    const base = await t.query(api.catalog.base, { token: "token-Ada" });
    expect(base.settings.onboarding).toBe(false);
  });
});

describe("end of the tour", () => {
  it("dates the end of the tour of the caller only", async () => {
    const { t, admin, member: max } = await setup();
    await t.mutation(api.onboarding.finish, { token: "token-Max" });
    expect((await member(t, max))?.onboardingDoneAt).toBeGreaterThan(0);
    expect((await member(t, admin))?.onboardingDoneAt).toBeUndefined();
  });

  it("keeps a habitué a habitué when the guide is replayed", async () => {
    const { t, admin } = await setup();
    await t.mutation(api.onboarding.setEnabled, {
      token: "token-Ada",
      enabled: true,
    });
    await t.mutation(api.onboarding.finish, { token: "token-Ada" });
    expect((await member(t, admin))?.onboardingDoneAt).toBe(
      ONBOARDING_HABITUAL,
    );
  });
});

describe("completed checklist", () => {
  it("makes the member a habitué for good", async () => {
    const { t, member: max } = await setup();
    await t.mutation(api.onboarding.finish, { token: "token-Max", checklistDone: true });
    expect((await member(t, max))?.onboardingDoneAt).toBe(ONBOARDING_HABITUAL);
    // Replaying the guide afterwards keeps it that way
    await t.mutation(api.onboarding.finish, { token: "token-Max" });
    expect((await member(t, max))?.onboardingDoneAt).toBe(ONBOARDING_HABITUAL);
  });
});

describe("facts for the « Premiers pas » checklist", () => {
  it("counts the member's own actions only", async () => {
    const { t, admin, member: max } = await setup();
    const recipes = await t.query(api.recipes.list, { token: "token-Max" });
    // Ada plans and eats a dish: nothing for Max
    const adaMeal = await t.mutation(api.meals.add, {
      token: "token-Ada",
      date: DATE,
      slot: "soir",
      recipeId: recipes[0]._id,
      persons: 3,
    });
    await t.mutation(api.meals.setStatus, {
      token: "token-Ada",
      id: adaMeal,
      status: "mangé",
    });
    await t.mutation(api.recipes.toggleLike, {
      token: "token-Ada",
      recipeId: recipes[0]._id,
      memberId: admin,
    });
    expect(await t.query(api.onboarding.facts, { token: "token-Max" })).toEqual(
      {
        hasPhoto: false,
        likes: 0,
        wishes: 0,
        mealsAdded: 0,
        itemsChecked: 0,
        statusesSet: 0,
      },
    );

    // Max does each step once
    const maxMeal = await t.mutation(api.meals.add, {
      token: "token-Max",
      date: DATE,
      slot: "midi",
      recipeId: recipes[1]._id,
      persons: 2,
    });
    await t.mutation(api.meals.setStatus, {
      token: "token-Max",
      id: maxMeal,
      status: "pas mangé",
    });
    for (const r of recipes.slice(0, 2))
      await t.mutation(api.recipes.toggleLike, {
        token: "token-Max",
        recipeId: r._id,
        memberId: max,
      });
    await t.mutation(api.wishes.add, {
      token: "token-Max",
      memberId: max,
      text: "Raclette",
    });
    await t.mutation(api.shopping.toggle, {
      token: "token-Max",
      start: DATE,
      itemKey: "x",
      checked: true,
      memberId: max,
    });
    expect(await t.query(api.onboarding.facts, { token: "token-Max" })).toEqual(
      {
        hasPhoto: false,
        likes: 2,
        wishes: 1,
        mealsAdded: 1,
        itemsChecked: 1,
        statusesSet: 1,
      },
    );
  });

  it("counts the dishes put on the week from a usual week", async () => {
    const { t } = await setup();
    const recipes = await t.query(api.recipes.list, { token: "token-Ada" });
    await t.mutation(api.meals.add, {
      token: "token-Ada",
      date: DATE,
      slot: "soir",
      recipeId: recipes[0]._id,
      persons: 3,
    });
    const id = await t.mutation(api.templates.saveWeek, { token: "token-Ada", name: "Semaine A", start: DATE });
    await t.mutation(api.templates.apply, { token: "token-Max", id, start: "2026-10-31", replace: false });
    expect((await t.query(api.onboarding.facts, { token: "token-Max" })).mealsAdded).toBe(1);
  });

  it("does not count a dish put back to « prévu »", async () => {
    const { t } = await setup();
    const recipes = await t.query(api.recipes.list, { token: "token-Max" });
    const id = await t.mutation(api.meals.add, {
      token: "token-Ada",
      date: DATE,
      slot: "soir",
      recipeId: recipes[0]._id,
      persons: 3,
    });
    await t.mutation(api.meals.setStatus, {
      token: "token-Max",
      id,
      status: "prévu",
    });
    expect(
      (await t.query(api.onboarding.facts, { token: "token-Max" })).statusesSet,
    ).toBe(0);
  });
});
