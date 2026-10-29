// Visit statistics without cookie or personal data: one counter per day and
// event; visits also by source, language and kind of device. Nothing identifies
// a visitor (no IP, no id), and a known list of sources keeps the table small.
import type { Limit } from "./auth";

/** Sent by the landing page. */
export const CLIENT_EVENTS = [
  "visit",
  "trial",
  "login",
  "contact",
  "lang",
  "pricing",
] as const;
/** Counted by the server, from the real sign-ups and payments. */
export const SERVER_EVENTS = ["checkout", "trialStarted", "paid"] as const;

export type ClientEvent = (typeof CLIENT_EVENTS)[number];
export type StatEvent = ClientEvent | (typeof SERVER_EVENTS)[number];
export type Device = "mobile" | "desktop";

/** The conversion steps, in order: visit, « Essayer » clicked, Stripe opened, trial, paid. */
export const FUNNEL = [
  "visit",
  "trial",
  "checkout",
  "trialStarted",
  "paid",
] as const satisfies readonly StatEvent[];

/**
 * Rows of visits per day at most (sources × languages × devices): past it, a
 * new source counts as « autre ». With the other events, a year stays well
 * under what one query may read.
 */
export const MAX_VISIT_ROWS = 24;
export const OTHER_SOURCE = "autre";

/** Writes allowed for the whole deployment: enough for a busy day, not for a flood. */
export const STATS_LIMIT: Limit = {
  max: 600,
  windowMs: 10 * 60_000,
  lockMs: 10 * 60_000,
};

export function isClientEvent(value: unknown): value is ClientEvent {
  return (
    typeof value === "string" &&
    (CLIENT_EVENTS as readonly string[]).includes(value)
  );
}

const BOT =
  /\bbot\b|bot\/|bot;|\+https?:|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|whatsapp|telegram|curl|wget|python|httpclient|okhttp|java\//i;

/** Robots and link previews are not visitors (no user agent either). */
export function isBot(userAgent: string | null): boolean {
  return !userAgent || BOT.test(userAgent);
}

export function deviceOf(userAgent: string | null): Device {
  return userAgent && /Mobi|Android|iPhone|iPad|iPod/i.test(userAgent)
    ? "mobile"
    : "desktop";
}

const KNOWN: [RegExp, string][] = [
  [/(^|\.)google\./, "google"],
  [/(^|\.)bing\.com$/, "bing"],
  [/(^|\.)duckduckgo\.com$/, "duckduckgo"],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me)$/, "facebook"],
  [/(^|\.)instagram\.com$/, "instagram"],
  [/(^|\.)(linkedin\.com|lnkd\.in)$/, "linkedin"],
  [/(^|\.)(t\.co|twitter\.com|x\.com)$/, "x"],
  [/(^|\.)whatsapp\.(com|net)$/, "whatsapp"],
];

/**
 * Where a visit comes from: a campaign's utm_source first, then the referring
 * site among the known ones, « direct » without one, « autre » for the rest.
 * No other site's name is kept: forged referrers cannot fill the table, and a
 * rare site (a company's intranet) tells nothing about its visitor.
 */
export function sourceOf(
  referrerHost: string | null | undefined,
  utmSource: string | null | undefined,
  ownHost = "menumaison.ch",
): string {
  const utm = (utmSource ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 20);
  if (utm) return `utm:${utm}`;
  const host = (referrerHost ?? "").toLowerCase().replace(/^www\./, "");
  if (!host || !/^[a-z0-9.-]{1,60}$/.test(host)) return "direct";
  if (
    host === ownHost ||
    host.endsWith(`.${ownHost}`) ||
    host === "localhost" ||
    host === "127.0.0.1"
  )
    return "direct";
  for (const [pattern, name] of KNOWN) if (pattern.test(host)) return name;
  return OTHER_SOURCE;
}

/** The HTTP site of a deployment (where /stats listens), from its client URL. */
export function statsUrlOf(convexUrl: string | undefined): string | null {
  if (!convexUrl) return null;
  if (/\.convex\.cloud\/?$/.test(convexUrl))
    return convexUrl.replace(/\.convex\.cloud\/?$/, ".convex.site") + "/stats";
  // Local backend: the HTTP site listens on the next port
  const local = convexUrl.match(
    /^(https?:\/\/(?:127\.0\.0\.1|localhost)):(\d+)\/?$/,
  );
  return local ? [local[1], Number(local[2]) + 1].join(":") + "/stats" : null;
}

export interface StatRow {
  day: string;
  event: string;
  source: string;
  lang: string;
  device: string;
  count: number;
}

const tally = (map: Map<string, number>, key: string, n: number) =>
  map.set(key, (map.get(key) ?? 0) + n);
const sorted = (map: Map<string, number>) =>
  [...map]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));

/** Totals, visits per day, sources, languages, devices and the funnel with each step's rate. */
export function summarize(rows: StatRow[], days: string[]) {
  const totals = new Map<string, number>();
  const visitsByDay = new Map<string, number>(days.map((d) => [d, 0]));
  const sources = new Map<string, number>();
  const langs = new Map<string, number>();
  const devices = new Map<string, number>();
  const inRange = new Set(days);
  for (const row of rows) {
    if (!inRange.has(row.day)) continue;
    tally(totals, row.event, row.count);
    if (row.event !== "visit") continue;
    tally(visitsByDay, row.day, row.count);
    tally(sources, row.source, row.count);
    tally(langs, row.lang, row.count);
    tally(devices, row.device, row.count);
  }
  const funnel = FUNNEL.map((event, i) => {
    const count = totals.get(event) ?? 0;
    const previous = i === 0 ? null : (totals.get(FUNNEL[i - 1]) ?? 0);
    // Share of the previous step that went on; null when there was nobody before
    const rate = previous ? Math.round((count / previous) * 1000) / 10 : null;
    return { event, count, rate };
  });
  return {
    totals: Object.fromEntries(totals) as Partial<Record<StatEvent, number>>,
    visitsByDay: days.map((day) => ({ day, count: visitsByDay.get(day) ?? 0 })),
    sources: sorted(sources),
    langs: sorted(langs),
    devices: sorted(devices),
    funnel,
  };
}
