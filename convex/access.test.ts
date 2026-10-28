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
  it("chooses a password once with the pseudo set by the admin, signs out the other devices", async () => {
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
      t.action(api.access.activate, { link, password: "leo-2015-x" }),
    ).rejects.toThrow("ni ton pseudo");
    const { token } = await t.action(api.access.activate, {
      link,
      password: "nouveau-secret",
    });
    expect(await t.query(api.access.check, { token })).toMatchObject({
      name: "Léo",
      username: "leo",
    });
    // Used once: the link is gone
    expect(await t.query(api.access.inviteInfo, { link })).toBeNull();
    await expect(
      t.action(api.access.activate, { link, password: "autre-secret" }),
    ).rejects.toThrow("plus valable");
    expect((await login(t, "leo", "nouveau-secret")).ok).toBe(true);
  });

  it("refuses a bogus link before hashing anything", async () => {
    const { t } = await setup();
    await expect(
      t.action(api.access.activate, {
        link: "0".repeat(64),
        password: "nouveau-secret",
      }),
    ).rejects.toThrow("plus valable");
  });
});

async function tokens(t: Awaited<ReturnType<typeof setup>>["t"]) {
  const a = await login(t, "ada", PASSWORD);
  const k = await login(t, "leo", PASSWORD);
  return { admin: a.ok ? a.token : "", kid: k.ok ? k.token : "" };
}

describe("admin manages access", () => {
  it("sends a new link for a forgotten password", async () => {
    const { t, admin, kid } = await setup();
    const tk = await tokens(t);
    await expect(
      t.mutation(api.access.resetLink, { token: tk.kid, id: admin }),
    ).rejects.toThrow("admins");
    // Not for oneself: this phone would be signed out
    await expect(
      t.mutation(api.access.resetLink, { token: tk.admin, id: admin }),
    ).rejects.toThrow("autre admin");
    const link = await t.mutation(api.access.resetLink, { token: tk.admin, id: kid });
    // The kid's phones are signed out, the old password is still there until the link is used
    expect(await t.query(api.access.check, { token: tk.kid })).toBeNull();
    await t.action(api.access.activate, { link, password: "tout-neuf-42" });
    expect((await login(t, "leo", "tout-neuf-42")).ok).toBe(true);
    expect((await login(t, "leo", PASSWORD)).ok).toBe(false);
  });

  it("a reset link lasts 48 hours, a first link 14 days", async () => {
    const { t, kid } = await setup();
    const tk = await tokens(t);
    const newcomer = await t.mutation(api.catalog.addMember, { token: tk.admin, name: "Zoé", emoji: "🦊", color: "#CDB8E6" });
    await t.mutation(api.access.setUsername, { token: tk.admin, id: newcomer, username: "zoe" });
    await t.mutation(api.access.resetLink, { token: tk.admin, id: kid });
    await t.mutation(api.access.resetLink, { token: tk.admin, id: newcomer });
    const days = await t.run(async (ctx) =>
      Object.fromEntries(
        (await ctx.db.query("invites").collect()).map((i) => [i.memberId, Math.round((i.expiresAt - Date.now()) / 86_400_000)]),
      ),
    );
    expect(days[kid]).toBe(2);
    expect(days[newcomer]).toBe(14);
  });

  it("only the super-admin manages the super-admin's access", async () => {
    const { t, admin, kid } = await setup();
    await t.run(async (ctx) => {
      await ctx.db.patch(admin, { superadmin: true });
      await ctx.db.patch(kid, { role: "admin" });
    });
    const tk = await tokens(t);
    await expect(
      t.mutation(api.access.resetLink, { token: tk.kid, id: admin }),
    ).rejects.toThrow("super-admin");
    await expect(
      t.mutation(api.access.setUsername, { token: tk.kid, id: admin, username: "pirate" }),
    ).rejects.toThrow("super-admin");
    // The super-admin still manages the other admins
    await t.mutation(api.access.resetLink, { token: tk.admin, id: kid });
  });

  it("sets a pseudo, unique in the family, needed for a link", async () => {
    const { t, kid } = await setup();
    const tk = await tokens(t);
    const newcomer = await t.mutation(api.catalog.addMember, {
      token: tk.admin,
      name: "Zoé",
      emoji: "🦊",
      color: "#CDB8E6",
    });
    await expect(
      t.mutation(api.access.resetLink, { token: tk.admin, id: newcomer }),
    ).rejects.toThrow("pseudo");
    await expect(
      t.mutation(api.access.setUsername, { token: tk.kid, id: kid, username: "leon" }),
    ).rejects.toThrow("admins");
    await expect(
      t.mutation(api.access.setUsername, { token: tk.admin, id: newcomer, username: "Léo" }),
    ).rejects.toThrow("déjà pris");
    await expect(
      t.mutation(api.access.setUsername, { token: tk.admin, id: newcomer, username: "zoé petit" }),
    ).rejects.toThrow("sans accent");
    expect(
      await t.mutation(api.access.setUsername, { token: tk.admin, id: newcomer, username: "Zoé" }),
    ).toBe("zoe");
    const link = await t.mutation(api.access.resetLink, { token: tk.admin, id: newcomer });
    expect(await t.query(api.access.inviteInfo, { link })).toMatchObject({ username: "zoe" });
    await t.action(api.access.activate, { link, password: "girafe-bleue" });
    // A renamed pseudo signs in under its new name
    await t.mutation(api.access.setUsername, { token: tk.admin, id: kid, username: "leon" });
    expect((await login(t, "leon", PASSWORD)).ok).toBe(true);
    expect((await login(t, "zoe", "girafe-bleue")).ok).toBe(true);
  });
});

describe("roles and look", () => {
  it("an admin makes a member admin and back, never changes their own role", async () => {
    const { t, admin, kid } = await setup();
    const tk = await tokens(t);
    await expect(
      t.mutation(api.access.setRole, { token: tk.kid, id: kid, role: "admin" }),
    ).rejects.toThrow("admins");
    await expect(
      t.mutation(api.access.setRole, { token: tk.admin, id: admin, role: "membre" }),
    ).rejects.toThrow("propre rôle");
    await t.mutation(api.access.setRole, { token: tk.admin, id: kid, role: "admin" });
    expect(await t.query(api.access.check, { token: tk.kid })).toMatchObject({ role: "admin" });
    // The new admin manages accounts too, but not the super-admin
    await t.run((ctx) => ctx.db.patch(admin, { superadmin: true }));
    await expect(
      t.mutation(api.access.setRole, { token: tk.kid, id: admin, role: "membre" }),
    ).rejects.toThrow("super-admin");
    await t.mutation(api.access.setRole, { token: tk.admin, id: kid, role: "membre" });
    expect(await t.query(api.access.check, { token: tk.kid })).toMatchObject({ role: "membre" });
  });

  it("the family look is chosen by an admin and reaches every phone", async () => {
    const { t } = await setup();
    const tk = await tokens(t);
    expect(await t.query(api.access.check, { token: tk.kid })).toMatchObject({
      look: { theme: "carotte", font: "nunito" },
    });
    await expect(
      t.mutation(api.catalog.updateSettings, { token: tk.kid, theme: "sauge" }),
    ).rejects.toThrow("admins");
    await expect(
      t.mutation(api.catalog.updateSettings, { token: tk.kid, font: "lexend" }),
    ).rejects.toThrow("admins");
    // Other settings stay open to every member
    await t.mutation(api.catalog.updateSettings, { token: tk.kid, defaultPersons: 4 });
    await t.mutation(api.catalog.updateSettings, { token: tk.admin, theme: "myrtille", font: "atkinson" });
    expect(await t.query(api.access.check, { token: tk.kid })).toMatchObject({
      look: { theme: "myrtille", font: "atkinson" },
    });
  });
});

describe("families", () => {
  it("creates a family with its catalog and an admin invitation", async () => {
    const { t } = await setup();
    const res = await t.mutation(internal.families.create, {
      name: "Dupont",
      admin: "Marc-Henri",
    });
    expect(res.slug).toBe("dupont");
    expect(
      await t.query(api.access.inviteInfo, { link: res.invite }),
    ).toMatchObject({
      family: "Dupont",
      name: "Marc-Henri",
      username: "marc-henri",
    });
    await expect(
      t.mutation(internal.families.create, {
        name: "Famille Dupont",
        admin: "Léa",
      }),
    ).rejects.toThrow("déjà pris");
  });

  it("the family name typed by hand signs in like the link", async () => {
    const { t } = await setup();
    for (const family of ["Test", "Famille Test", " TEST "]) {
      const res = await t.action(api.access.login, { family, username: "ada", password: PASSWORD });
      expect(res).toMatchObject({ ok: true, slug: "test" });
    }
  });

  it("the admin renames the family, which moves its sign-in link", async () => {
    const { t } = await setup();
    const tk = await tokens(t);
    await t.mutation(internal.families.create, { name: "Dupont", admin: "Marc" });
    await expect(
      t.mutation(api.families.rename, { token: tk.kid, name: "Les Martin" }),
    ).rejects.toThrow("admins");
    await expect(
      t.mutation(api.families.rename, { token: tk.admin, name: "Famille Dupont" }),
    ).rejects.toThrow("déjà pris");
    expect(
      await t.mutation(api.families.rename, { token: tk.admin, name: "  Schütz  " }),
    ).toEqual({ name: "Schütz", slug: "schutz" });
    expect(await t.query(api.access.family, { slug: "schutz" })).toEqual({ name: "Schütz", slug: "schutz" });
    expect(await t.query(api.access.family, { slug: "test" })).toBeNull();
    // Signed-in phones stay signed in, and learn the new link
    expect(await t.query(api.access.check, { token: tk.admin })).toMatchObject({
      family: { name: "Schütz", slug: "schutz" },
    });
    expect((await login(t, "ada", PASSWORD)).ok).toBe(false); // the old link name
    expect(
      (await t.action(api.access.login, { family: "Schütz", username: "ada", password: PASSWORD })).ok,
    ).toBe(true);
  });
});
