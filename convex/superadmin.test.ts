/// <reference types="vite/client" />
// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { hashPassword } from "./domain/auth";

const modules = import.meta.glob("./**/*.ts");
const PASSWORD = "carottes-rapees";

/** PA's family (super-admin) and a friend's family, both signed in. */
async function setup() {
  const t = convexTest(schema, modules);
  const passwordHash = await hashPassword(PASSWORD, 1000);
  const home = await t.mutation(internal.families.create, { name: "Schütz", admin: "Pierre-Alain", username: "pa" });
  const friend = await t.mutation(internal.families.create, { name: "Dupont", admin: "Marc" });
  // Both admins have chosen their password
  await t.run(async (ctx) => {
    for (const m of await ctx.db.query("members").collect())
      await ctx.db.patch(m._id, { passwordHash, superadmin: m.username === "pa" ? true : undefined });
  });
  const login = async (family: string, username: string, password = PASSWORD) => {
    const r = await t.action(api.access.login, { family, username, password });
    if (!r.ok) throw new Error(r.error);
    return r.token;
  };
  return { t, home, friend, pa: await login("schutz", "pa"), marc: await login("dupont", "marc"), login };
}

describe("super-admin space", () => {
  it("is refused to a family admin", async () => {
    const { t, marc, home } = await setup();
    await expect(t.query(api.superadmin.families, { token: marc })).rejects.toThrow("super-admin");
    await expect(t.mutation(api.superadmin.createOne, { token: marc, name: "Pirates", admin: "Jack" })).rejects.toThrow("super-admin");
    await expect(t.mutation(api.superadmin.setSuspended, { token: marc, familyId: home.familyId, suspended: true })).rejects.toThrow("super-admin");
    const paId = await t.run(async (ctx) => (await ctx.db.query("members").collect()).find((m) => m.username === "pa")!._id);
    await expect(t.mutation(api.superadmin.adminLink, { token: marc, memberId: paId })).rejects.toThrow("super-admin");
  });

  it("lists every family with counts only", async () => {
    const { t, pa } = await setup();
    const list = await t.query(api.superadmin.families, { token: pa });
    expect(list.map((f) => [f.name, f.slug, f.isMine])).toEqual([
      ["Schütz", "schutz", true],
      ["Dupont", "dupont", false],
    ]);
    const dupont = list[1];
    expect(dupont.members).toEqual([expect.objectContaining({ name: "Marc", username: "marc", admin: true, activated: true })]);
    expect(dupont.recipes).toBeGreaterThan(0);
    expect(dupont.lastSignIn).toBeTypeOf("number");
    // Figures, never a family's content or a password hash
    expect(Object.keys(dupont).sort()).toEqual(
      ["_id", "ai", "createdAt", "isMine", "lastSignIn", "members", "name", "recipes", "slug", "subscription", "suspended"].sort(),
    );
    expect(JSON.stringify(list)).not.toContain("pbkdf2");
  });

  it("creates a family whose admin activates with the link", async () => {
    const { t, pa, login } = await setup();
    const res = await t.mutation(api.superadmin.createOne, { token: pa, name: "Les Martin", admin: "Léa" });
    expect(res).toMatchObject({ slug: "les-martin", username: "lea" });
    await t.action(api.access.activate, { link: res.invite, password: "tomates-cerises" });
    expect(await t.query(api.access.check, { token: await login("Les Martin", "lea", "tomates-cerises") })).toMatchObject({ role: "admin" });
    await expect(t.mutation(api.superadmin.createOne, { token: pa, name: "Famille Martin ", admin: "X" })).resolves.toBeTruthy();
    await expect(t.mutation(api.superadmin.createOne, { token: pa, name: "les martin", admin: "X" })).rejects.toThrow("déjà pris");
  });

  it("sends a new link to another family's admin, not within its own family", async () => {
    const { t, pa, marc, login } = await setup();
    const members = await t.run((ctx) => ctx.db.query("members").collect());
    const marcId = members.find((m) => m.username === "marc")!._id;
    const paId = members.find((m) => m.username === "pa")!._id;
    const link = await t.mutation(api.superadmin.adminLink, { token: pa, memberId: marcId });
    expect(await t.query(api.access.check, { token: marc })).toBeNull(); // signed out
    const days = await t.run(async (ctx) => {
      const i = (await ctx.db.query("invites").collect()).find((x) => x.memberId === marcId)!;
      return Math.round((i.expiresAt - Date.now()) / 86_400_000);
    });
    expect(days).toBe(2); // a reset: Marc had a password
    await t.action(api.access.activate, { link, password: "nouveau-depart" });
    await expect(login("dupont", "marc")).rejects.toThrow(); // old password gone
    await expect(t.mutation(api.superadmin.adminLink, { token: pa, memberId: paId })).rejects.toThrow("Réglages");
    // Neither a plain member nor another super-admin
    const kid = await t.run(async (ctx) =>
      ctx.db.insert("members", { familyId: members.find((m) => m.username === "marc")!.familyId, name: "Léo", emoji: "🙂", color: "#A8C8E8", order: 1, username: "leo", role: "membre" }),
    );
    await expect(t.mutation(api.superadmin.adminLink, { token: pa, memberId: kid })).rejects.toThrow("introuvable");
    await t.run((ctx) => ctx.db.patch(marcId, { superadmin: true }));
    await expect(t.mutation(api.superadmin.adminLink, { token: pa, memberId: marcId })).rejects.toThrow("introuvable");
  });

  it("suspends a family and lifts it, never its own", async () => {
    const { t, pa, marc, home, friend, login } = await setup();
    await expect(t.mutation(api.superadmin.setSuspended, { token: pa, familyId: home.familyId, suspended: true })).rejects.toThrow("propre famille");
    await t.mutation(api.superadmin.setSuspended, { token: pa, familyId: friend.familyId, suspended: true });
    expect(await t.query(api.access.check, { token: marc })).toBeNull();
    await expect(login("dupont", "marc")).rejects.toThrow();
    expect(await t.query(api.access.family, { slug: "dupont" })).toBeNull();
    const marcId = await t.run(async (ctx) => (await ctx.db.query("members").collect()).find((m) => m.username === "marc")!._id);
    await expect(t.mutation(api.superadmin.adminLink, { token: pa, memberId: marcId })).rejects.toThrow("Réactive");
    await t.mutation(api.superadmin.setSuspended, { token: pa, familyId: friend.familyId, suspended: false });
    // Old sessions stay revoked (stolen phone), the data and the password are kept
    expect(await t.query(api.access.check, { token: marc })).toBeNull();
    const again = await login("dupont", "marc");
    expect(await t.query(api.access.check, { token: again })).toMatchObject({ username: "marc" });
    expect((await t.query(api.superadmin.families, { token: pa }))[1].recipes).toBeGreaterThan(0);
  });

  it("offers the app to a family or withdraws the offer, never for PA's own family", async () => {
    const { t, pa, home, friend } = await setup();
    const status = async () =>
      (await t.query(api.superadmin.families, { token: pa })).find((f) => f._id === friend.familyId)!.subscription;
    // Created by PA: offered
    expect(await status()).toMatchObject({ offered: true, access: "full" });
    await t.mutation(api.superadmin.setOffered, { token: pa, familyId: friend.familyId, offered: false });
    expect(await status()).toMatchObject({ offered: false, access: "readonly" });
    await t.mutation(api.superadmin.setOffered, { token: pa, familyId: friend.familyId, offered: true });
    expect(await status()).toMatchObject({ offered: true, access: "full" });
    await expect(
      t.mutation(api.superadmin.setOffered, { token: pa, familyId: home.familyId, offered: false }),
    ).rejects.toThrow("reste offerte");
  });
});

