/// <reference types="vite/client" />
// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { sha256 } from "./lib";

const modules = import.meta.glob("./**/*.ts");
const DAY = 24 * 60 * 60 * 1000;
// The secret kept by the browser that signed up
const SECRET = "a".repeat(64);

const sub = (
  over: Partial<{
    stripeStatus: string;
    periodEnd: number;
    cancelAtPeriodEnd: boolean;
  }> = {},
) => ({
  customerId: "cus_123",
  subscriptionId: "sub_123",
  email: "marc@example.ch",
  stripeStatus: "trialing",
  periodEnd: Date.now() + 7 * DAY,
  ...over,
});

async function signedUp(lang: "fr" | "de" = "fr") {
  const t = convexTest(schema, modules);
  await t.mutation(internal.billing.recordSignup, {
    sessionId: "cs_test_abc",
    familyName: "Dupont",
    adminName: "Marc",
    lang,
    claimHash: await sha256(SECRET),
  });
  return t;
}

const complete = (t: Awaited<ReturnType<typeof signedUp>>, over = {}) =>
  t.mutation(internal.billing.completeSignup, {
    sessionId: "cs_test_abc",
    ...sub(over),
  });

const familyOf = (t: Awaited<ReturnType<typeof signedUp>>) =>
  t.run(async (ctx) => (await ctx.db.query("families").collect())[0]);

const firstLink = (
  t: Awaited<ReturnType<typeof signedUp>>,
  claimSecret = SECRET,
) =>
  t.mutation(internal.billing.firstLink, {
    sessionId: "cs_test_abc",
    claimSecret,
  });

describe("sign-up through Stripe", () => {
  it("creates the family once, whether the webhook or the return page comes first", async () => {
    const t = await signedUp();
    const first = await complete(t);
    const second = await complete(t);
    expect(second).toBe(first);
    const families = await t.run((ctx) => ctx.db.query("families").collect());
    expect(families).toHaveLength(1);
    expect(families[0]).toMatchObject({
      name: "Dupont",
      billing: {
        status: "trialing",
        customerId: "cus_123",
        email: "marc@example.ch",
      },
    });
    // With its starter catalogue and its admin
    const counts = await t.run(async (ctx) => ({
      recipes: (await ctx.db.query("recipes").collect()).length,
      admins: (await ctx.db.query("members").collect())
        .filter((m) => m.role === "admin")
        .map((m) => m.name),
    }));
    expect(counts.recipes).toBeGreaterThan(10);
    expect(counts.admins).toEqual(["Marc"]);
  });

  it("does nothing for an unknown session, and takes « Dupont 2 » when the name is gone", async () => {
    const t = await signedUp();
    expect(
      await t.mutation(internal.billing.completeSignup, {
        sessionId: "cs_test_other",
        ...sub(),
      }),
    ).toBeNull();
    await t.mutation(internal.families.create, {
      name: "Dupont",
      admin: "Anne",
    });
    await complete(t);
    const slugs = await t.run(async (ctx) =>
      (await ctx.db.query("families").collect()).map((f) => f.slug).sort(),
    );
    expect(slugs).toEqual(["dupont", "dupont-2"]);
    expect(await t.query(api.billing.nameAvailable, { name: "Dupont" })).toBe(
      false,
    );
    expect(await t.query(api.billing.nameAvailable, { name: "Martin" })).toBe(
      true,
    );
  });

  it("speaks German when the form was filled in German", async () => {
    const t = await signedUp("de");
    await complete(t);
    const admin = await t.run(
      async (ctx) => (await ctx.db.query("members").collect())[0],
    );
    expect(admin.lang).toBe("de");
  });

  it("hands the admin's first link to the browser that signed up, until it is used", async () => {
    const t = await signedUp();
    expect(await firstLink(t)).toBeNull();
    await complete(t);
    // Another browser with the session id only gets nothing
    expect(await firstLink(t, "b".repeat(64))).toBeNull();
    const link = await firstLink(t);
    expect(link).toMatchObject({ slug: "dupont" });
    expect(link?.invite).toMatch(/^[0-9a-f]{64}$/);
    await t.run(async (ctx) => {
      const admin = (await ctx.db.query("members").collect())[0];
      await ctx.db.patch(admin._id, { passwordHash: "set" });
    });
    expect(await firstLink(t)).toEqual({ slug: "dupont", invite: null });
  });

  it("refuses a sign-up form without names", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(internal.billing.recordSignup, {
        sessionId: "cs_test_x",
        familyName: " ",
        adminName: "Marc",
        lang: "fr",
        claimHash: "x",
      }),
    ).rejects.toThrow("famille");
  });

  it("forgets unpaid sign-ups after two days, keeps recent ones", async () => {
    const t = await signedUp();
    await t.run((ctx) =>
      ctx.db.insert("signups", {
        sessionId: "cs_test_old",
        familyName: "Martin",
        adminName: "Léa",
        lang: "fr",
        claimHash: "x",
        createdAt: Date.now() - 3 * DAY,
      }),
    );
    expect(await t.mutation(internal.billing.purgeStale, {})).toEqual({
      removed: 1,
    });
    const left = await t.run(async (ctx) =>
      (await ctx.db.query("signups").collect()).map((s) => s.sessionId),
    );
    expect(left).toEqual(["cs_test_abc"]);
  });
});

describe("subscription updates from Stripe", () => {
  it("follows renewals, failed payments and resignations", async () => {
    const t = await signedUp();
    await complete(t);
    await t.mutation(
      internal.billing.updateSubscription,
      sub({ stripeStatus: "active" }),
    );
    expect((await familyOf(t)).billing?.status).toBe("active");

    await t.mutation(
      internal.billing.updateSubscription,
      sub({ stripeStatus: "past_due" }),
    );
    const since = (await familyOf(t)).billing?.pastDueSince;
    expect(since).toBeTypeOf("number");
    // A second retry keeps the start of the grace period
    await t.mutation(
      internal.billing.updateSubscription,
      sub({ stripeStatus: "past_due" }),
    );
    expect((await familyOf(t)).billing?.pastDueSince).toBe(since);

    await t.mutation(
      internal.billing.updateSubscription,
      sub({ stripeStatus: "canceled" }),
    );
    expect((await familyOf(t)).billing).toMatchObject({
      status: "canceled",
      email: "marc@example.ch",
    });
    // A subscription we do not know
    expect(
      await t.mutation(internal.billing.updateSubscription, {
        ...sub(),
        subscriptionId: "sub_other",
      }),
    ).toBe(false);
  });

  it("keeps an offered family offered, from the webhook and from the return page", async () => {
    const t = await signedUp();
    await complete(t);
    await t.run(async (ctx) => {
      const f = (await ctx.db.query("families").collect())[0];
      await ctx.db.patch(f._id, {
        billing: { ...f.billing!, status: "comped" },
      });
    });
    await t.mutation(
      internal.billing.updateSubscription,
      sub({ stripeStatus: "unpaid" }),
    );
    await complete(t, { stripeStatus: "canceled" });
    expect((await familyOf(t)).billing?.status).toBe("comped");
  });

  it("records each Stripe event once handled", async () => {
    const t = convexTest(schema, modules);
    expect(
      await t.query(internal.billing.seenEvent, { eventId: "evt_1" }),
    ).toBe(false);
    await t.mutation(internal.billing.markEvent, {
      eventId: "evt_1",
      type: "x",
    });
    await t.mutation(internal.billing.markEvent, {
      eventId: "evt_1",
      type: "x",
    });
    expect(
      await t.query(internal.billing.seenEvent, { eventId: "evt_1" }),
    ).toBe(true);
    expect(
      await t.run((ctx) => ctx.db.query("stripeEvents").collect()),
    ).toHaveLength(1);
  });
});
