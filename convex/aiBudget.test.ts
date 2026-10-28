/// <reference types="vite/client" />
// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { hashPassword } from "./domain/auth";
import { budgetMonth, CLAUDE_BUDGET_REACHED, DICTATIONS_REACHED } from "./domain/aiBudget";

const currentMonth = () => budgetMonth(Date.now());

const modules = import.meta.glob("./**/*.ts");
const PASSWORD = "carottes-rapees";

/** PA's family (super-admin) and a friend's family, both signed in. */
async function setup() {
  const t = convexTest(schema, modules);
  const passwordHash = await hashPassword(PASSWORD, 1000);
  const home = await t.mutation(internal.families.create, { name: "Schütz", admin: "Pierre-Alain", username: "pa" });
  const friend = await t.mutation(internal.families.create, { name: "Dupont", admin: "Marc" });
  await t.run(async (ctx) => {
    for (const m of await ctx.db.query("members").collect())
      await ctx.db.patch(m._id, { passwordHash, superadmin: m.username === "pa" ? true : undefined });
  });
  const login = async (family: string, username: string) => {
    const r = await t.action(api.access.login, { family, username, password: PASSWORD });
    if (!r.ok) throw new Error(r.error);
    return r.token;
  };
  return { t, home: home.familyId, friend: friend.familyId, pa: await login("schutz", "pa"), marc: await login("dupont", "marc") };
}

describe("monthly AI budget", () => {
  it("counts each call and refuses new ones at the default caps", async () => {
    const { t, friend } = await setup();
    const problem = (kind: "claude" | "dictation") => t.query(internal.aiBudget.problem, { familyId: friend, kind });
    const reserve = (kind: "claude" | "dictation") => t.mutation(internal.aiBudget.reserve, { familyId: friend, kind });
    const settle = (usd: number) => t.mutation(internal.aiBudget.settle, { familyId: friend, usd });
    expect(await problem("claude")).toBeNull();
    expect(await reserve("claude")).toBeNull();
    await settle(1.5);
    expect(await problem("claude")).toBeNull();
    // The call that crosses the cap is counted; the next one is refused
    expect(await reserve("claude")).toBeNull();
    await settle(0.6);
    expect(await reserve("claude")).toBe(CLAUDE_BUDGET_REACHED);
    expect(await problem("dictation")).toBeNull();
    for (let n = 0; n < 60; n++) expect(await reserve("dictation")).toBeNull();
    expect(await reserve("dictation")).toBe(DICTATIONS_REACHED);
    const rows = await t.run((ctx) => ctx.db.query("aiUsage").collect());
    expect(rows).toEqual([expect.objectContaining({ familyId: friend, claudeCalls: 2, dictations: 60 })]);
    expect(rows[0].claudeUsd).toBeCloseTo(2.1, 6);
  });

  it("reserves before the answer: parallel calls cannot all pass under the cap", async () => {
    const { t, friend } = await setup();
    // 1.95 USD used: one reservation (0.10) still fits, the next ones are refused at once
    await t.run((ctx) =>
      ctx.db.insert("aiUsage", { familyId: friend, month: currentMonth(), claudeUsd: 1.95, claudeCalls: 5, dictations: 0 }),
    );
    const results = await Promise.all(
      Array.from({ length: 5 }, () => t.mutation(internal.aiBudget.reserve, { familyId: friend, kind: "claude" })),
    );
    expect(results.filter((r) => r === null)).toHaveLength(1);
    // A cost that cannot be read is counted high, never as NaN
    await t.mutation(internal.aiBudget.settle, { familyId: friend, usd: NaN });
    const row = await t.run(async (ctx) => (await ctx.db.query("aiUsage").collect())[0]);
    expect(row.claudeUsd).toBeCloseTo(2.45, 6);
  });

  it("never blocks the super-admin's family, and starts again each month", async () => {
    const { t, home, friend } = await setup();
    await t.mutation(internal.aiBudget.reserve, { familyId: home, kind: "claude" });
    await t.mutation(internal.aiBudget.settle, { familyId: home, usd: 50 });
    expect(await t.query(internal.aiBudget.problem, { familyId: home, kind: "claude" })).toBeNull();
    // Last month's spending does not count this month
    await t.run((ctx) =>
      ctx.db.insert("aiUsage", { familyId: friend, month: "2020-01", claudeUsd: 99, claudeCalls: 9, dictations: 999 }),
    );
    expect(await t.query(internal.aiBudget.problem, { familyId: friend, kind: "claude" })).toBeNull();
    expect(await t.query(internal.aiBudget.problem, { familyId: friend, kind: "dictation" })).toBeNull();
  });

  it("lets the super-admin see the use and set the caps, nobody else", async () => {
    const { t, pa, marc, friend } = await setup();
    await expect(
      t.mutation(api.superadmin.setAiCaps, { token: marc, familyId: friend, capUsd: 100, dictationCap: 1000 }),
    ).rejects.toThrow("super-admin");
    await t.mutation(internal.aiBudget.reserve, { familyId: friend, kind: "claude" });
    await t.mutation(internal.aiBudget.settle, { familyId: friend, usd: 0.5 });
    await t.mutation(api.superadmin.setAiCaps, { token: pa, familyId: friend, capUsd: 0.4, dictationCap: 5 });
    expect(await t.query(internal.aiBudget.problem, { familyId: friend, kind: "claude" })).toBe(CLAUDE_BUDGET_REACHED);
    const list = await t.query(api.superadmin.families, { token: pa });
    expect(list.find((f) => f._id === friend)!.ai).toEqual({
      claudeUsd: 0.5,
      claudeCalls: 1,
      dictations: 0,
      capUsd: 0.4,
      dictationCap: 5,
      customCaps: true,
    });
    expect(list.find((f) => f.isMine)!.ai).toMatchObject({ capUsd: null, dictationCap: null });
    // Back to the defaults
    await t.mutation(api.superadmin.setAiCaps, { token: pa, familyId: friend, capUsd: null, dictationCap: null });
    expect((await t.query(api.superadmin.families, { token: pa })).find((f) => f._id === friend)!.ai).toMatchObject({
      capUsd: 2,
      dictationCap: 60,
      customCaps: false,
    });
    await expect(
      t.mutation(api.superadmin.setAiCaps, { token: pa, familyId: friend, capUsd: -1, dictationCap: null }),
    ).rejects.toThrow("valeur invalide");
  });
});
