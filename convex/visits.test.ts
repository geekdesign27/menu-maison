/// <reference types="vite/client" />
// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { hashPassword } from "./domain/auth";
import { MAX_VISIT_ROWS, reportWeeks, STATS_LIMIT } from "./domain/visits";
import { zurichToday } from "./domain/dates";

const modules = import.meta.glob("./**/*.ts");
const PASSWORD = "carottes-rapees";
const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148 Safari/604.1";

async function setup() {
  const t = convexTest(schema, modules);
  const passwordHash = await hashPassword(PASSWORD, 1000);
  await t.mutation(internal.families.create, {
    name: "Schütz",
    admin: "Pierre-Alain",
    username: "pa",
  });
  await t.mutation(internal.families.create, { name: "Dupont", admin: "Marc" });
  await t.run(async (ctx) => {
    for (const m of await ctx.db.query("members").collect())
      await ctx.db.patch(m._id, {
        passwordHash,
        superadmin: m.username === "pa" ? true : undefined,
      });
  });
  const login = async (family: string, username: string) => {
    const r = await t.action(api.access.login, {
      family,
      username,
      password: PASSWORD,
    });
    if (!r.ok) throw new Error(r.error);
    return r.token;
  };
  return {
    t,
    pa: await login("schutz", "pa"),
    marc: await login("dupont", "marc"),
  };
}

const beacon = (body: unknown, userAgent: string | null = IPHONE): RequestInit => {
  const headers: Record<string, string> = { "content-type": "text/plain" };
  if (userAgent) headers["user-agent"] = userAgent;
  return { method: "POST", headers, body: typeof body === "string" ? body : JSON.stringify(body) };
};

const rows = (t: Awaited<ReturnType<typeof setup>>["t"]) =>
  t.run(async (ctx) =>
    (await ctx.db.query("visitStats").collect()).map(
      ({ event, source, lang, device, count }) => ({
        event,
        source,
        lang,
        device,
        count,
      }),
    ),
  );

describe("/stats", () => {
  it("counts a browser's events, one counter per day and keys", async () => {
    const { t } = await setup();
    for (let i = 0; i < 2; i++) {
      const r = await t.fetch(
        "/stats",
        beacon({ event: "visit", lang: "fr", ref: "www.google.ch", utm: "" }),
      );
      expect(r.status).toBe(204);
    }
    await t.fetch(
      "/stats",
      beacon({ event: "trial", lang: "de", ref: "", utm: "Flyer" }),
    );
    expect(await rows(t)).toEqual([
      {
        event: "visit",
        source: "google",
        lang: "fr",
        device: "mobile",
        count: 2,
      },
      // A click is counted alone: only visits keep their source, language and device
      { event: "trial", source: "", lang: "", device: "", count: 1 },
    ]);
  });

  it("counts new sources as « autre » once a day has its rows of visits", async () => {
    const { t } = await setup();
    for (let i = 0; i < MAX_VISIT_ROWS + 3; i++)
      await t.mutation(internal.visits.record, { event: "visit", source: `utm:c${i}`, lang: "fr", device: "mobile" });
    const all = await rows(t);
    expect(all).toHaveLength(MAX_VISIT_ROWS + 1);
    expect(all.find((r) => r.source === "autre")?.count).toBe(3);
    // A source already counted today keeps its own row
    await t.mutation(internal.visits.record, { event: "visit", source: "utm:c0", lang: "fr", device: "mobile" });
    expect((await rows(t)).find((r) => r.source === "utm:c0")?.count).toBe(2);
  });

  it("ignores robots and refuses what is not one of its events", async () => {
    const { t } = await setup();
    expect(
      (
        await t.fetch(
          "/stats",
          beacon({ event: "visit", lang: "fr" }, "Googlebot/2.1"),
        )
      ).status,
    ).toBe(204);
    expect(
      (await t.fetch("/stats", beacon({ event: "visit", lang: "fr" }, null)))
        .status,
    ).toBe(204);
    expect(
      (await t.fetch("/stats", beacon({ event: "paid", lang: "fr" }))).status,
    ).toBe(400);
    expect(
      (await t.fetch("/stats", beacon({ event: "visit", lang: "it" }))).status,
    ).toBe(400);
    expect((await t.fetch("/stats", beacon("not json"))).status).toBe(400);
    expect((await t.fetch("/stats", beacon("x".repeat(2000)))).status).toBe(
      413,
    );
    expect(await rows(t)).toEqual([]);
  });

  it("stops writing once the deployment's limit is reached", async () => {
    const { t } = await setup();
    for (let i = 0; i < STATS_LIMIT.max + 5; i++)
      await t.mutation(internal.visits.record, {
        event: "visit",
        source: "direct",
        lang: "fr",
        device: "mobile",
      });
    expect((await rows(t))[0].count).toBe(STATS_LIMIT.max);
  });
});

describe("visits.summary", () => {
  it("is for the super-admin only", async () => {
    const { t, pa, marc } = await setup();
    await expect(
      t.query(api.visits.summary, { token: marc, days: 7 }),
    ).rejects.toThrow("super-admin");
    await t.fetch(
      "/stats",
      beacon({ event: "visit", lang: "fr", ref: "", utm: "" }),
    );
    const s = await t.query(api.visits.summary, { token: pa, days: 7 });
    expect(s.visitsByDay).toHaveLength(7);
    expect(s.funnel[0]).toEqual({ event: "visit", count: 1, rate: null });
    expect(s.sources).toEqual([{ key: "direct", count: 1 }]);
  });
});

describe("visits.sendWeeklyReport", () => {
  it("sends last week's report to PA once, however many times it runs", async () => {
    const { t } = await setup();
    process.env.ADMIN_ALERT_EMAIL = "pa@example.ch";
    const { week } = reportWeeks(zurichToday());
    await t.run((ctx) =>
      ctx.db.insert("visitStats", { day: week[2], event: "visit", source: "direct", lang: "fr", device: "mobile", count: 4 }),
    );
    await t.mutation(internal.visits.sendWeeklyReport, {});
    await t.mutation(internal.visits.sendWeeklyReport, {});
    const sent = await t.run((ctx) => ctx.db.query("emailLog").collect());
    delete process.env.ADMIN_ALERT_EMAIL;
    expect(sent.map((m) => [m.kind, m.key])).toEqual([["adminWeekly", `weekly:${week[0]}`]]);
  });
});
