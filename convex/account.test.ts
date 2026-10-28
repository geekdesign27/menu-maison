/// <reference types="vite/client" />
// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { hashPassword } from "./domain/auth";

const modules = import.meta.glob("./**/*.ts");
const PASSWORD = "carottes-rapees";
const NEW_PASSWORD = "poireaux-vinaigrette";

async function setup() {
  const t = convexTest(schema, modules);
  const passwordHash = await hashPassword(PASSWORD, 1000);
  const ids = await t.run(async (ctx) => {
    const familyId = await ctx.db.insert("families", {
      name: "Famille Test",
      slug: "test",
      suspended: false,
      createdAt: 0,
    });
    const add = (name: string, username: string, role: "admin" | "membre") =>
      ctx.db.insert("members", {
        familyId,
        name,
        emoji: "🙂",
        color: "#A8C8E8",
        order: 0,
        username,
        passwordHash,
        role,
      });
    const admin = await add("Ada", "ada", "admin");
    const kid = await add("Léo", "leo", "membre");
    await ctx.db.insert("recipes", {
      familyId,
      name: "Lasagnes",
      emoji: "🍝",
      tags: [],
      prepMinutes: 30,
      fridgeDays: 3,
      items: [],
      steps: [],
      saved: true,
      archived: false,
    });
    return { familyId, admin, kid };
  });
  return { t, ...ids };
}

type T = Awaited<ReturnType<typeof setup>>["t"];

async function signIn(t: T, username = "ada", password = PASSWORD) {
  const res = await t.action(api.access.login, {
    family: "test",
    username,
    password,
  });
  if (!res.ok) throw new Error(res.error);
  return res.token;
}

/** The link of the last e-mail of this kind, read from the scheduled sending. */
async function lastLink(t: T, kind: string) {
  return t.run(async (ctx) => {
    const jobs = await ctx.db.system.query("_scheduled_functions").collect();
    const mail = jobs
      .map(
        (j) =>
          j.args[0] as { kind?: string; to?: string; data?: { link?: string } },
      )
      .filter((a) => a.kind === kind)
      .at(-1);
    return { to: mail?.to, link: mail?.data?.link?.split("/").at(-1) ?? "" };
  });
}

const sessionsOf = (t: T, memberId: unknown) =>
  t.run(
    async (ctx) =>
      (await ctx.db.query("sessions").collect()).filter(
        (s) => s.memberId === memberId,
      ).length,
  );

describe("e-mail of a profile", () => {
  it("counts only once confirmed by its link, from any phone", async () => {
    const { t } = await setup();
    const token = await signIn(t);
    await t.action(api.account.setEmail, { token, email: " Ada@Example.CH ", password: PASSWORD });
    expect(await t.query(api.account.mine, { token })).toMatchObject({
      email: null,
      pendingEmail: "ada@example.ch",
    });
    const mail = await lastLink(t, "emailConfirm");
    expect(mail.to).toBe("ada@example.ch");
    expect(
      await t.mutation(api.account.confirmEmail, { link: "f".repeat(64) }),
    ).toEqual({ ok: false });
    expect(
      await t.mutation(api.account.confirmEmail, { link: mail.link }),
    ).toEqual({
      ok: true,
      email: "ada@example.ch",
    });
    // Used once only
    expect(
      await t.mutation(api.account.confirmEmail, { link: mail.link }),
    ).toEqual({ ok: false });
    expect(await t.query(api.account.mine, { token })).toMatchObject({
      email: "ada@example.ch",
    });
  });

  it("needs the member's password, and stays out of what the family sees", async () => {
    const { t } = await setup();
    const token = await signIn(t);
    await expect(
      t.action(api.account.setEmail, { token, email: "ada@example.ch", password: "pas-le-bon" }),
    ).rejects.toThrow(/actuel incorrect/);
    await withEmail(t, token);
    // Léo's phone loads the family's profiles: never Ada's address
    const base = await t.query(api.catalog.base, { token: await signIn(t, "leo") });
    expect(JSON.stringify(base)).not.toMatch(/ada@example|email|emailTokenHash/);
  });

  it("refuses an address that is not one", async () => {
    const { t } = await setup();
    const token = await signIn(t);
    await expect(
      t.action(api.account.setEmail, { token, email: "ada@", password: PASSWORD }),
    ).rejects.toThrow(/pas valable/);
  });
});

async function withEmail(t: T, token: string, email = "ada@example.ch") {
  await t.action(api.account.setEmail, { token, email, password: PASSWORD });
  await t.mutation(api.account.confirmEmail, {
    link: (await lastLink(t, "emailConfirm")).link,
  });
}

describe("forgotten password", () => {
  it("answers the same for an unknown address, and sends nothing", async () => {
    const { t } = await setup();
    expect(
      await t.mutation(api.account.requestReset, {
        email: "personne@example.ch",
        lang: "fr",
      }),
    ).toEqual({ ok: true });
    expect((await lastLink(t, "passwordReset")).link).toBe("");
  });

  it("sends a link that sets a new password and signs the other phones out", async () => {
    const { t, admin } = await setup();
    const token = await signIn(t);
    await withEmail(t, token);
    await t.mutation(api.account.requestReset, {
      email: "ADA@example.ch",
      lang: "fr",
    });
    // Asking does not sign anybody out: anybody may type an address
    expect(await sessionsOf(t, admin)).toBe(1);
    const { link } = await lastLink(t, "passwordReset");
    expect(link).toMatch(/^[0-9a-f]{64}$/);
    await t.action(api.access.activate, { link, password: NEW_PASSWORD });
    expect(await t.query(api.access.check, { token })).toBeNull();
    expect(await signIn(t, "ada", NEW_PASSWORD)).toBeTruthy();
    await expect(signIn(t)).rejects.toThrow();
  });

  it("sends 3 links an hour per address at most", async () => {
    const { t } = await setup();
    await withEmail(t, await signIn(t));
    for (let i = 0; i < 5; i++)
      await t.mutation(api.account.requestReset, {
        email: "ada@example.ch",
        lang: "fr",
      });
    const sent = await t.run(async (ctx) =>
      (await ctx.db.query("emailLog").collect()).filter(
        (e) => e.kind === "passwordReset",
      ),
    );
    expect(sent).toHaveLength(3);
  });
});

describe("password and devices", () => {
  it("changes the password with the current one, keeps this phone only", async () => {
    const { t, admin } = await setup();
    const token = await signIn(t);
    const other = await signIn(t);
    await withEmail(t, token);
    await t.mutation(api.account.requestReset, { email: "ada@example.ch", lang: "fr" });
    expect(await t.run(async (ctx) => (await ctx.db.query("invites").collect()).length)).toBe(1);
    await expect(
      t.action(api.account.changePassword, {
        token,
        current: "faux-mot-de-passe",
        next: NEW_PASSWORD,
      }),
    ).rejects.toThrow(/actuel incorrect/);
    await t.action(api.account.changePassword, {
      token,
      current: PASSWORD,
      next: NEW_PASSWORD,
    });
    // A reset link asked before the change no longer works
    expect(await t.run(async (ctx) => (await ctx.db.query("invites").collect()).length)).toBe(0);
    expect(await t.query(api.access.check, { token })).not.toBeNull();
    expect(await t.query(api.access.check, { token: other })).toBeNull();
    expect(await sessionsOf(t, admin)).toBe(1);
  });

  it("signs the other devices out, never another member's", async () => {
    const { t, kid } = await setup();
    const token = await signIn(t);
    await signIn(t);
    await signIn(t, "leo");
    expect(await t.query(api.account.mine, { token })).toMatchObject({
      otherDevices: 1,
    });
    expect(await t.mutation(api.account.signOutOthers, { token })).toBe(1);
    expect(await t.query(api.account.mine, { token })).toMatchObject({
      otherDevices: 0,
    });
    expect(await sessionsOf(t, kid)).toBe(1);
  });
});

describe("the family's data", () => {
  it("exports everything for an admin, without passwords", async () => {
    const { t } = await setup();
    // Another family with its own recipe
    await t.run(async (ctx) => {
      const other = await ctx.db.insert("families", { name: "Autre famille", slug: "autre", suspended: false, createdAt: 0 });
      await ctx.db.insert("recipes", {
        familyId: other, name: "Soupe", emoji: "🥣", tags: [], prepMinutes: 10, fridgeDays: 2, items: [], steps: [], saved: true, archived: false,
      });
    });
    const data = await t.query(api.familyData.exportAll, {
      token: await signIn(t),
    });
    expect(data.tables.recipes).toHaveLength(1);
    expect(data.tables.members.map((m) => m.name)).toEqual(["Ada", "Léo"]);
    expect(JSON.stringify(data)).not.toMatch(/passwordHash|pbkdf2|familyId/);
    expect(JSON.stringify(data)).not.toMatch(/Autre famille|Soupe/);
    await expect(
      t.query(api.familyData.exportAll, { token: await signIn(t, "leo") }),
    ).rejects.toThrow(/admins/);
  });

  it("deletes the family only with its name typed, then everything goes", async () => {
    const { t, familyId } = await setup();
    const token = await signIn(t);
    await expect(
      t.action(api.stripeNode.deleteFamily, { token, confirmName: "Autre", password: PASSWORD }),
    ).rejects.toThrow(/ne correspond pas/);
    await expect(
      t.action(api.stripeNode.deleteFamily, { token, confirmName: "Famille Test", password: "pas-le-bon" }),
    ).rejects.toThrow(/actuel incorrect/);
    await expect(
      t.action(api.stripeNode.deleteFamily, {
        token: await signIn(t, "leo"),
        confirmName: "Famille Test", password: PASSWORD }),
    ).rejects.toThrow(/admins/);
    await t.action(api.stripeNode.deleteFamily, {
      token,
      confirmName: "famille test", password: PASSWORD });
    expect(await t.query(api.access.check, { token })).toBeNull();
    await t.mutation(internal.familyData.purgeFamily, { familyId });
    const left = await t.run(async (ctx) => ({
      family: await ctx.db.get(familyId),
      members: (await ctx.db.query("members").collect()).length,
      recipes: (await ctx.db.query("recipes").collect()).length,
      sessions: (await ctx.db.query("sessions").collect()).length,
    }));
    expect(left).toEqual({ family: null, members: 0, recipes: 0, sessions: 0 });
  });

  it("never deletes PA's own family from the app", async () => {
    const { t, admin } = await setup();
    await t.run((ctx) => ctx.db.patch(admin, { superadmin: true }));
    await expect(
      t.action(api.stripeNode.deleteFamily, {
        token: await signIn(t),
        confirmName: "Famille Test", password: PASSWORD }),
    ).rejects.toThrow(/gère Menu Maison/);
  });
});

describe("a deletion under way", () => {
  it("is never undone once the family is closed", async () => {
    const { t, familyId } = await setup();
    await t.mutation(internal.familyData.finishDeletion, { familyId, adminName: "Ada" });
    // A second request failing at Stripe tries to undo it
    await t.mutation(internal.familyData.markDeleting, { familyId, deleting: false });
    const family = await t.run((ctx) => ctx.db.get(familyId));
    expect(family).toMatchObject({ suspended: true, deleting: true });
  });

  it("marks a Checkout paid for a family being deleted as an orphan", async () => {
    const { t, familyId } = await setup();
    await t.run((ctx) =>
      ctx.db.insert("signups", {
        sessionId: "cs_test_late",
        familyName: "Famille Test",
        adminName: "Ada",
        lang: "fr",
        claimHash: "0".repeat(64),
        createdAt: Date.now(),
        familyId,
      }),
    );
    expect(await t.query(internal.billing.orphanSignup, { sessionId: "cs_test_late" })).toBe(false);
    await t.mutation(internal.familyData.markDeleting, { familyId, deleting: true });
    expect(await t.query(internal.billing.orphanSignup, { sessionId: "cs_test_late" })).toBe(true);
  });
});

describe("Stripe customer e-mail", () => {
  it("follows the e-mail changed in Stripe's portal, for our customers only", async () => {
    const { t, familyId } = await setup();
    await t.run((ctx) =>
      ctx.db.patch(familyId, {
        billing: {
          status: "active",
          customerId: "cus_1",
          email: "old@example.ch",
        },
      }),
    );
    expect(
      await t.mutation(internal.billing.updateCustomerEmail, {
        customerId: "cus_other",
        email: "x@example.ch",
      }),
    ).toBe(false);
    expect(
      await t.mutation(internal.billing.updateCustomerEmail, {
        customerId: "cus_1",
        email: "new@example.ch",
      }),
    ).toBe(true);
    const family = await t.run((ctx) => ctx.db.get(familyId));
    expect(family?.billing?.email).toBe("new@example.ch");
  });
});
