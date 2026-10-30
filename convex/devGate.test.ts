/// <reference types="vite/client" />
// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { afterEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { DEV_GATE_LIMIT, sameText } from "./domain/devGate";

const modules = import.meta.glob("./**/*.ts");
const PASSWORD = "une longue phrase de test pour la dev";

afterEach(() => {
  delete process.env.DEV_SITE_PASSWORD;
});

describe("entry password of the test site", () => {
  it("stays shut without DEV_SITE_PASSWORD, as in production", async () => {
    const t = convexTest(schema, modules);
    expect(await t.mutation(api.devGate.enter, { password: "" })).toEqual({
      ok: false,
      reason: "closed",
    });
    expect(await t.mutation(api.devGate.enter, { password: PASSWORD })).toEqual(
      { ok: false, reason: "closed" },
    );
    expect(await t.query(api.devGate.check, { ticket: "" })).toBe(false);
  });

  it("gives a ticket for the right password only, and the ticket opens the site", async () => {
    process.env.DEV_SITE_PASSWORD = PASSWORD;
    const t = convexTest(schema, modules);
    expect(
      await t.mutation(api.devGate.enter, { password: "mauvais" }),
    ).toEqual({ ok: false, reason: "wrong" });
    expect(
      await t.mutation(api.devGate.enter, { password: `${PASSWORD} ` }),
    ).toEqual({ ok: false, reason: "wrong" });
    const res = await t.mutation(api.devGate.enter, { password: PASSWORD });
    if (!res.ok) throw new Error(res.reason);
    // The ticket is not the password itself
    expect(res.ticket).not.toContain(PASSWORD);
    expect(await t.query(api.devGate.check, { ticket: res.ticket })).toBe(true);
    expect(await t.query(api.devGate.check, { ticket: "x".repeat(64) })).toBe(
      false,
    );
  });

  it("voids every ticket when the password changes", async () => {
    process.env.DEV_SITE_PASSWORD = PASSWORD;
    const t = convexTest(schema, modules);
    const res = await t.mutation(api.devGate.enter, { password: PASSWORD });
    if (!res.ok) throw new Error(res.reason);
    process.env.DEV_SITE_PASSWORD = "un tout autre mot de passe";
    expect(await t.query(api.devGate.check, { ticket: res.ticket })).toBe(
      false,
    );
  });

  it("locks after too many tries, even the right password", async () => {
    process.env.DEV_SITE_PASSWORD = PASSWORD;
    const t = convexTest(schema, modules);
    for (let i = 0; i < DEV_GATE_LIMIT.max; i++)
      expect(
        await t.mutation(api.devGate.enter, { password: `essai ${i}` }),
      ).toEqual({ ok: false, reason: "wrong" });
    const locked = await t.mutation(api.devGate.enter, { password: PASSWORD });
    expect(locked).toMatchObject({ ok: false, reason: "locked" });
  });

  it("refuses an oversized password before any work", async () => {
    process.env.DEV_SITE_PASSWORD = PASSWORD;
    const t = convexTest(schema, modules);
    expect(
      await t.mutation(api.devGate.enter, { password: "a".repeat(201) }),
    ).toEqual({ ok: false, reason: "wrong" });
  });

  it("compares texts of different lengths or content as different", () => {
    expect(sameText("abc", "abc")).toBe(true);
    expect(sameText("abc", "abd")).toBe(false);
    expect(sameText("abc", "abcd")).toBe(false);
  });
});
