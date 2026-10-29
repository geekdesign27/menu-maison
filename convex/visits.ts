// Visit statistics: counters only, written by the /stats HTTP route (browser
// events) and by the billing code (Stripe opened, trial started, paid).
import { internalMutation, query, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { reserve } from "./access";
import { requireSuperadmin } from "./superadmin";
import { addDays, zurichToday } from "./domain/dates";
import { sha256 } from "./lib";
import { sendOnce } from "./email";
import {
  CLIENT_EVENTS,
  familyCounts,
  MAX_VISIT_ROWS,
  OTHER_SOURCE,
  STATS_LIMIT,
  reportWeeks,
  summarize,
  weeklyReport,
  type StatEvent,
} from "./domain/visits";

type Keys = { day: string; event: StatEvent; source: string; lang: string; device: string };

function rowOf(ctx: MutationCtx, key: Keys) {
  return ctx.db
    .query("visitStats")
    .withIndex("by_key", (q) =>
      q.eq("day", key.day).eq("event", key.event).eq("source", key.source).eq("lang", key.lang).eq("device", key.device),
    )
    .unique();
}

/**
 * Adds 1 to today's counter of `event`. Only visits keep their source,
 * language and device; once a day has MAX_VISIT_ROWS rows of visits, a new
 * source is counted as « autre ».
 */
export async function bump(
  ctx: MutationCtx,
  event: StatEvent,
  dims: { source: string; lang: string; device: string } = { source: "", lang: "", device: "" },
) {
  const key: Keys = { day: zurichToday(), event, ...(event === "visit" ? dims : { source: "", lang: "", device: "" }) };
  let row = await rowOf(ctx, key);
  if (!row && event === "visit" && key.source !== OTHER_SOURCE) {
    const rows = await ctx.db
      .query("visitStats")
      .withIndex("by_key", (q) => q.eq("day", key.day).eq("event", "visit"))
      .take(MAX_VISIT_ROWS);
    if (rows.length >= MAX_VISIT_ROWS) {
      key.source = OTHER_SOURCE;
      row = await rowOf(ctx, key);
    }
  }
  if (row) await ctx.db.patch(row._id, { count: row.count + 1 });
  else await ctx.db.insert("visitStats", { ...key, count: 1 });
}

/**
 * Adds 1 the first time only for `id` (a subscription paid, whatever the events
 * replayed). Only its hash is kept: no Stripe id in the statistics.
 */
export async function bumpOnce(ctx: MutationCtx, event: StatEvent, id: string) {
  const key = await sha256(`${event}:${id}`);
  const seen = await ctx.db
    .query("visitOnce")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  if (seen) return;
  await ctx.db.insert("visitOnce", { key });
  await bump(ctx, event);
}

/** One browser event, already checked by the HTTP route; dropped once the deployment's limit is reached. */
export const record = internalMutation({
  args: {
    event: v.union(...CLIENT_EVENTS.map((e) => v.literal(e))),
    source: v.string(),
    lang: v.union(v.literal("fr"), v.literal("de")),
    device: v.union(v.literal("mobile"), v.literal("desktop")),
  },
  handler: async (ctx, { event, ...dims }) => {
    const slot = await reserve(ctx, "stats:*", STATS_LIMIT, Date.now());
    if (!slot.allowed) return;
    await bump(ctx, event, dims);
  },
});

/** Super admin, Statistiques: the last 7, 30 or 365 days. */
export const summary = query({
  args: { token: v.string(), days: v.union(v.literal(7), v.literal(30), v.literal(365)) },
  handler: async (ctx, { token, days }) => {
    await requireSuperadmin(ctx, token);
    const today = zurichToday();
    const first = addDays(today, 1 - days);
    const rows = await ctx.db
      .query("visitStats")
      .withIndex("by_day", (q) => q.gte("day", first).lte("day", today))
      .collect();
    const range = Array.from({ length: days }, (_, i) => addDays(first, i));
    return summarize(rows, range);
  },
});

/** Every Monday morning (crons.ts): last week's report to PA, once per week. */
export const sendWeeklyReport = internalMutation({
  args: {},
  handler: async (ctx) => {
    const today = zurichToday();
    const { week, previous } = reportWeeks(today);
    const rows = await ctx.db
      .query("visitStats")
      .withIndex("by_day", (q) => q.gte("day", previous[0]).lte("day", week[6]))
      .collect();
    const families = familyCounts(await ctx.db.query("families").collect());
    const { range, ...report } = weeklyReport(rows, today, families);
    await sendOnce(ctx, {
      kind: "adminWeekly",
      key: `weekly:${week[0]}`,
      lang: "fr",
      data: { familyName: "", adminName: "", date: range, report },
    });
  },
});
