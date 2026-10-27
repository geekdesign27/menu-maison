/// <reference types="vite/client" />
// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { hashPassword } from "./domain/auth";

const modules = import.meta.glob("./**/*.ts");
const PASSWORD = "carottes-rapees";

async function setup() {
  const t = convexTest(schema, modules);
  // Few iterations: the stored hash says how many, the check stays fast in tests
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
    return {
      familyId,
      admin: await add("Ada", "ada", "admin"),
      kid: await add("Léo", "leo", "membre"),
    };
  });
  return { t, ...ids };
}

const login = (
  t: Awaited<ReturnType<typeof setup>>["t"],
  username: string,
  password: string,
) => t.action(api.access.login, { family: "test", username, password });

describe("sign-in", () => {
  it("signs in with the right password, whatever the case of the pseudo", async () => {
    const { t } = await setup();
    const res = await login(t, "ADA", PASSWORD);
    expect(res.ok).toBe(true);
    const me = await t.query(api.access.check, {
      token: res.ok ? res.token : "",
    });
    expect(me).toMatchObject({
      name: "Ada",
      role: "admin",
      family: { slug: "test" },
    });
  });

  it("gives the same answer for an unknown pseudo and a wrong password", async () => {
    const { t } = await setup();
    expect(await login(t, "personne", PASSWORD)).toEqual({
      ok: false,
      error: "Pseudo ou mot de passe incorrect.",
    });
    expect(await login(t, "ada", "pas-le-bon")).toEqual({
      ok: false,
      error: "Pseudo ou mot de passe incorrect.",
    });
  });

  it("parallel attempts cannot pass the limit, and the right password waits too", async () => {
    const { t } = await setup();
    const results = await Promise.all(
      Array.from({ length: 12 }, () => login(t, "ada", "pas-le-bon")),
    );
    const wrong = results.filter((r) => !r.ok && r.error.startsWith("Pseudo"));
    const blocked = results.filter(
      (r) => !r.ok && r.error.startsWith("Trop d'essais"),
    );
    expect(wrong.length).toBe(5);
    expect(blocked.length).toBe(7);
    // Locked: even the right password is refused until the pause ends
    expect((await login(t, "ada", PASSWORD)).ok).toBe(false);
    // Another pseudo of the family is not locked
    expect((await login(t, "leo", PASSWORD)).ok).toBe(true);
  });
});

describe("rights", () => {
  it("a member edits their own profile only, an admin all of them", async () => {
    const { t, admin, kid } = await setup();
    const kidLogin = await login(t, "leo", PASSWORD);
    const adminLogin = await login(t, "ada", PASSWORD);
    const kidToken = kidLogin.ok ? kidLogin.token : "";
    const adminToken = adminLogin.ok ? adminLogin.token : "";
    const profile = { name: "Léon", emoji: "🦊", color: "#CDB8E6" };
    await t.mutation(api.catalog.updateMember, {
      token: kidToken,
      id: kid,
      ...profile,
    });
    await expect(
      t.mutation(api.catalog.updateMember, {
        token: kidToken,
        id: admin,
        ...profile,
      }),
    ).rejects.toThrow("admins");
    await expect(
      t.mutation(api.catalog.addMember, { token: kidToken, ...profile }),
    ).rejects.toThrow("admins");
    await t.mutation(api.catalog.updateMember, {
      token: adminToken,
      id: kid,
      ...profile,
      name: "Léo",
    });
    await t.mutation(api.catalog.addMember, { token: adminToken, ...profile });
  });
});

describe("invitations", () => {
  it("sets pseudo and password once, signs out the member's other devices", async () => {
    const { t, kid } = await setup();
    const old = await login(t, "leo", PASSWORD);
    const link = await t.run(async (ctx) => {
      const { createInvite } = await import("./access");
      return createInvite(ctx, (await ctx.db.get(kid))!);
    });
    // The reset link already signed the member out
    expect(
      await t.query(api.access.check, { token: old.ok ? old.token : "" }),
    ).toBeNull();
    expect(await t.query(api.access.inviteInfo, { link })).toMatchObject({
      name: "Léo",
      username: "leo",
    });

    await expect(
      t.action(api.access.activate, {
        link,
        username: "leo",
        password: "leo-2015-x",
      }),
    ).rejects.toThrow("ni ton pseudo");
    const { token } = await t.action(api.access.activate, {
      link,
      username: "leo",
      password: "nouveau-secret",
    });
    expect(await t.query(api.access.check, { token })).toMatchObject({
      name: "Léo",
    });
    // Used once: the link is gone
    expect(await t.query(api.access.inviteInfo, { link })).toBeNull();
    await expect(
      t.action(api.access.activate, {
        link,
        username: "leo",
        password: "autre-secret",
      }),
    ).rejects.toThrow("plus valable");
    expect((await login(t, "leo", "nouveau-secret")).ok).toBe(true);
  });

  it("refuses a bogus link before hashing anything", async () => {
    const { t } = await setup();
    await expect(
      t.action(api.access.activate, {
        link: "0".repeat(64),
        username: "zoe",
        password: "nouveau-secret",
      }),
    ).rejects.toThrow("plus valable");
  });
});

describe("families", () => {
  it("creates a family with its catalog and an admin invitation", async () => {
    const { t } = await setup();
    const res = await t.mutation(internal.families.create, {
      name: "Famille Dupont",
      admin: "Marc",
    });
    expect(res.slug).toBe("dupont");
    expect(
      await t.query(api.access.inviteInfo, { link: res.invite }),
    ).toMatchObject({
      family: "Famille Dupont",
      name: "Marc",
      username: null,
    });
    await expect(
      t.mutation(internal.families.create, {
        name: "Famille Dupont",
        admin: "Léa",
      }),
    ).rejects.toThrow("déjà pris");
  });
});
