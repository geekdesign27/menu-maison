/// <reference types="vite/client" />
// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { sha256 } from "./lib";
import { hashPassword } from "./domain/auth";
import { accessOf } from "./domain/billing";

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

  it("keeps an offered family's access, whatever Stripe says", async () => {
    const t = await signedUp();
    await complete(t);
    await t.run(async (ctx) => {
      const f = (await ctx.db.query("families").collect())[0];
      await ctx.db.patch(f._id, { offered: true });
    });
    await t.mutation(internal.billing.updateSubscription, sub({ stripeStatus: "unpaid" }));
    await complete(t, { stripeStatus: "canceled" });
    const family = await familyOf(t);
    expect(family.billing?.status).toBe("canceled");
    expect(accessOf(family, Date.now())).toBe("full");
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

describe("what a family may do according to its subscription", () => {
  async function signedIn() {
    const t = convexTest(schema, modules);
    const { familyId } = await t.mutation(internal.families.create, { name: "Dupont", admin: "Marc" });
    const { hashPassword } = await import("./domain/auth");
    const passwordHash = await hashPassword("carottes-rapees", 1000);
    await t.run(async (ctx) => {
      for (const m of await ctx.db.query("members").collect()) await ctx.db.patch(m._id, { passwordHash });
    });
    const r = await t.action(api.access.login, { family: "dupont", username: "marc", password: "carottes-rapees" });
    if (!r.ok) throw new Error(r.error);
    const me = await t.query(api.access.check, { token: r.token });
    return { t, familyId, token: r.token, memberId: me!.memberId };
  }

  it("lets an ended family read and manage its accounts, not write nor use the AI", async () => {
    const { t, familyId, token, memberId } = await signedIn();
    const setFamily = (patch: object) => t.run((ctx) => ctx.db.patch(familyId, patch));
    await t.mutation(api.staples.create, { token, name: "Bougies" });

    await setFamily({ billing: { status: "canceled" } });
    await expect(t.mutation(api.staples.create, { token, name: "Allumettes" })).rejects.toThrow("lecture seule");
    expect(await t.query(internal.aiBudget.problem, { familyId, kind: "claude" })).toMatch(/lecture seule/);
    // Reading and the account itself stay possible
    expect((await t.query(api.staples.list, { token, start: "2026-10-24" })).map((s) => s.name)).toContain("Bougies");
    await t.mutation(api.access.setLang, { token, id: memberId, lang: "de" });

    // Offered again by PA: everything works
    await setFamily({ offered: true });
    await t.mutation(api.staples.create, { token, name: "Allumettes" });
  });

  it("gives a smaller AI budget during the free trial", async () => {
    const { t, familyId } = await signedIn();
    await t.run((ctx) => ctx.db.patch(familyId, { billing: { status: "trialing" } }));
    const reserve = () => t.mutation(internal.aiBudget.reserve, { familyId, kind: "claude" });
    // 0.30 USD: three reservations of 0.10, then refused
    for (let n = 0; n < 3; n++) expect(await reserve()).toBeNull();
    expect(await reserve()).toMatch(/budget IA/);
    // Paid: the normal budget
    await t.run((ctx) => ctx.db.patch(familyId, { billing: { status: "active" } }));
    expect(await reserve()).toBeNull();
  });
});

describe("an existing family subscribing", () => {
  it("attaches the subscription to the family, without creating another one", async () => {
    const t = convexTest(schema, modules);
    const { familyId } = await t.mutation(internal.families.create, { name: "Martin", admin: "Léa" });
    await t.mutation(internal.billing.recordSignup, {
      sessionId: "cs_test_martin",
      familyName: "Martin",
      adminName: "Léa",
      lang: "fr",
      claimHash: "x",
      familyId,
    });
    expect(await t.mutation(internal.billing.completeSignup, { sessionId: "cs_test_martin", ...sub({ stripeStatus: "active" }) })).toBe(familyId);
    const families = await t.run((ctx) => ctx.db.query("families").collect());
    expect(families).toHaveLength(1);
    expect(families[0].billing).toMatchObject({ status: "active", customerId: "cus_123" });
  });

  it("shows the subscription to the family's admins only", async () => {
    const t = convexTest(schema, modules);
    const { familyId } = await t.mutation(internal.families.create, { name: "Martin", admin: "Léa" });
    const { hashPassword } = await import("./domain/auth");
    const passwordHash = await hashPassword("carottes-rapees", 1000);
    await t.run(async (ctx) => {
      const lea = (await ctx.db.query("members").collect())[0];
      await ctx.db.patch(lea._id, { passwordHash });
      await ctx.db.insert("members", { familyId, name: "Tom", emoji: "🙂", color: "#A8C8E8", order: 1, role: "membre", username: "tom", passwordHash });
    });
    const login = async (username: string) => {
      const r = await t.action(api.access.login, { family: "martin", username, password: "carottes-rapees" });
      if (!r.ok) throw new Error(r.error);
      return r.token;
    };
    expect(await t.query(api.billing.mine, { token: await login("lea") })).toMatchObject({ offered: true, status: null, hasCustomer: false });
    await expect(t.query(api.billing.mine, { token: await login("tom") })).rejects.toThrow("admins");
    // A first subscription gets the free trial, a later one does not
    expect(await t.query(internal.billing.familyForBilling, { token: await login("lea") })).toMatchObject({ hadSubscription: false });
  });
});

describe("one subscription per family, and an offer that stays", () => {
  it("keeps an offered family offered when it subscribes anyway, not a family PA set as paying", async () => {
    const t = convexTest(schema, modules);
    const { familyId } = await t.mutation(internal.families.create, { name: "Martin", admin: "Léa" });
    await t.mutation(internal.billing.keepOffered, { familyId });
    expect((await t.run((ctx) => ctx.db.get(familyId)))?.offered).toBe(true);
    await t.run((ctx) => ctx.db.patch(familyId, { offered: false }));
    await t.mutation(internal.billing.keepOffered, { familyId });
    expect((await t.run((ctx) => ctx.db.get(familyId)))?.offered).toBe(false);
  });

  it("limits a family's own Checkout pages", async () => {
    const t = convexTest(schema, modules);
    const { familyId } = await t.mutation(internal.families.create, { name: "Martin", admin: "Léa" });
    const results = [];
    for (let n = 0; n < 6; n++) results.push(await t.mutation(internal.billing.allowFamilyCheckout, { familyId }));
    expect(results).toEqual([true, true, true, true, true, false]);
  });
});

describe("e-mails of the subscription", () => {
  const kinds = (t: Awaited<ReturnType<typeof signedUp>>) =>
    t.run(async (ctx) => (await ctx.db.query("emailLog").collect()).map((e) => e.kind).sort());

  it("welcomes the family and alerts PA once, then follows each change once", async () => {
    process.env.ADMIN_ALERT_EMAIL = "pa@example.ch";
    const t = await signedUp();
    await complete(t);
    await complete(t);
    expect(await kinds(t)).toEqual(["adminSignup", "welcome"]);

    await t.mutation(internal.billing.updateSubscription, sub({ stripeStatus: "active" }));
    await t.mutation(internal.billing.updateSubscription, sub({ stripeStatus: "active" }));
    expect(await kinds(t)).toEqual(["adminConverted", "adminSignup", "confirmed", "welcome"]);

    await t.mutation(internal.billing.updateSubscription, sub({ stripeStatus: "active", cancelAtPeriodEnd: true }));
    await t.mutation(internal.billing.updateSubscription, sub({ stripeStatus: "canceled", cancelAtPeriodEnd: true }));
    const after = await kinds(t);
    expect(after.filter((k) => k === "canceled")).toHaveLength(1);
    expect(after.filter((k) => k === "adminCanceled")).toHaveLength(1);
  });

  it("tells a failed payment once per failure", async () => {
    process.env.ADMIN_ALERT_EMAIL = "pa@example.ch";
    const t = await signedUp();
    await complete(t, { stripeStatus: "active" });
    await t.mutation(internal.billing.updateSubscription, sub({ stripeStatus: "past_due" }));
    await t.mutation(internal.billing.updateSubscription, sub({ stripeStatus: "past_due" }));
    const all = await kinds(t);
    expect(all.filter((k) => k === "paymentFailed")).toHaveLength(1);
    expect(all.filter((k) => k === "adminPaymentFailed")).toHaveLength(1);
  });

  it("opens the admin's first link from the welcome e-mail for 7 days", async () => {
    const t = await signedUp();
    await complete(t);
    // The e-mail's secret is only known through its hash: replace it by a known one
    const token = "c".repeat(64);
    await t.run(async (ctx) => {
      const s = (await ctx.db.query("signups").collect())[0];
      await ctx.db.patch(s._id, { emailHash: await sha256(token), createdAt: Date.now() - 3 * DAY });
    });
    // 3 days later: too late for the browser's secret, still fine for the e-mail
    expect(await firstLink(t)).toMatchObject({ invite: null });
    expect((await firstLink(t, token))?.invite).toMatch(/^[0-9a-f]{64}$/);
  });

  it("reminds 2 days before the end of the trial, once", async () => {
    const t = await signedUp();
    await complete(t, { periodEnd: Date.now() + 2 * DAY });
    await t.mutation(internal.billing.trialReminders, {});
    await t.mutation(internal.billing.trialReminders, {});
    expect((await kinds(t)).filter((k) => k === "trialEnding")).toHaveLength(1);
  });
});

describe("closed sign-ups and payments (no SIGNUP_OPEN)", () => {
  it("refuses a new sign-up before calling Stripe", async () => {
    delete process.env.SIGNUP_OPEN;
    const t = convexTest(schema, modules);
    expect(await t.query(api.billing.signupStatus, {})).toEqual({ open: false });
    await expect(
      t.action(api.stripeNode.startCheckout, { familyName: "Dupont", adminName: "Marc", lang: "fr" }),
    ).rejects.toThrow("Les inscriptions ouvrent bientôt.");
    expect(await t.run((ctx) => ctx.db.query("signups").collect())).toHaveLength(0);
  });

  it("refuses an existing family's subscription", async () => {
    delete process.env.SIGNUP_OPEN;
    const t = convexTest(schema, modules);
    const passwordHash = await hashPassword("carottes-rapees", 1000);
    await t.run(async (ctx) => {
      const familyId = await ctx.db.insert("families", { name: "Famille Test", slug: "test", suspended: false, createdAt: 0 });
      await ctx.db.insert("members", {
        familyId, name: "Ada", emoji: "🙂", color: "#A8C8E8", order: 0, username: "ada", passwordHash, role: "admin",
      });
    });
    const res = await t.action(api.access.login, { family: "test", username: "ada", password: "carottes-rapees" });
    if (!res.ok) throw new Error(res.error);
    await expect(t.action(api.stripeNode.startFamilyCheckout, { token: res.token })).rejects.toThrow(
      "Le paiement en ligne ouvre bientôt.",
    );
  });

  it("opens with SIGNUP_OPEN=1", async () => {
    process.env.SIGNUP_OPEN = "1";
    const t = convexTest(schema, modules);
    expect(await t.query(api.billing.signupStatus, {})).toEqual({ open: true });
    delete process.env.SIGNUP_OPEN;
  });
});
