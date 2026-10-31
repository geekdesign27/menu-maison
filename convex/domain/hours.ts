// Opening hours of a market or a small shop: a few time slots per weekday.
// Weekdays follow Date.getDay() (0 = Sunday), times are "HH:MM".
import type { Lang } from "./lang";
import { dayShortName } from "./dates";

export interface OpeningSlot {
  day: number;
  open: string;
  close: string;
}

export const MAX_SLOTS = 21;
const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;
// Monday first, as on a Swiss calendar
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function toMinutes(time: string): number {
  const m = TIME.exec(time);
  if (!m) throw new Error("Heure invalide.");
  return Number(m[1]) * 60 + Number(m[2]);
}

const weekRank = (day: number) => WEEK_ORDER.indexOf(day);
const bySlot = (a: OpeningSlot, b: OpeningSlot) =>
  weekRank(a.day) - weekRank(b.day) || toMinutes(a.open) - toMinutes(b.open);

/** Checked and sorted slots, Monday first. Throws a French message on bad input. */
export function normalizeHours(slots: OpeningSlot[]): OpeningSlot[] {
  if (slots.length > MAX_SLOTS) throw new Error("Trop d'horaires.");
  const clean = slots.map(({ day, open, close }) => {
    if (!Number.isInteger(day) || day < 0 || day > 6)
      throw new Error("Jour invalide.");
    if (toMinutes(close) <= toMinutes(open))
      throw new Error("L'heure de fin doit suivre l'heure de début.");
    return { day, open, close };
  });
  clean.sort(bySlot);
  for (let i = 1; i < clean.length; i++) {
    const prev = clean[i - 1];
    if (
      prev.day === clean[i].day &&
      toMinutes(clean[i].open) < toMinutes(prev.close)
    )
      throw new Error("Deux horaires se chevauchent.");
  }
  return clean;
}

const NBSP = " ";

/** « 7 h », « 7 h 30 » in French; « 7 », « 7.30 » in German (« Uhr » follows the range). */
export function formatTime(time: string, lang: Lang = "fr"): string {
  const minutes = toMinutes(time);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const mm = String(m).padStart(2, "0");
  if (lang === "de") return m ? `${h}.${mm}` : String(h);
  return m ? `${h}${NBSP}h${NBSP}${mm}` : `${h}${NBSP}h`;
}

/** One time on its own: « 7 h 30 », « 7.30 Uhr ». */
export function formatClock(time: string, lang: Lang = "fr"): string {
  return lang === "de" ? `${formatTime(time, "de")}${NBSP}Uhr` : formatTime(time);
}

/** « 7 h à 12 h », « 7.30 bis 12 Uhr ». */
export function formatRange(
  slot: { open: string; close: string },
  lang: Lang = "fr",
): string {
  const open = formatTime(slot.open, lang);
  const close = formatTime(slot.close, lang);
  return lang === "de"
    ? `${open} bis ${close}${NBSP}Uhr`
    : `${open} à ${close}`;
}

/** « a, b et c » / « a, b und c ». */
function joinList(parts: string[], lang: Lang): string {
  const and = lang === "de" ? " und " : " et ";
  return parts.length < 2
    ? parts.join("")
    : parts.slice(0, -1).join(", ") + and + parts[parts.length - 1];
}

/** « mer. et sam. », « lun. au ven. »: three days in a row or more read as a span. */
function daysText(days: number[], lang: Lang): string {
  const ranks = days.map(weekRank).sort((a, b) => a - b);
  const parts: string[] = [];
  for (let i = 0; i < ranks.length;) {
    let j = i;
    while (j + 1 < ranks.length && ranks[j + 1] === ranks[j] + 1) j++;
    const first = dayShortName(WEEK_ORDER[ranks[i]], lang);
    if (j - i >= 2) {
      const last = dayShortName(WEEK_ORDER[ranks[j]], lang);
      parts.push(first + (lang === "de" ? " bis " : " au ") + last);
    } else {
      for (let k = i; k <= j; k++)
        parts.push(dayShortName(WEEK_ORDER[ranks[k]], lang));
    }
    i = j + 1;
  }
  return joinList(parts, lang);
}

/**
 * One line for the store list: « mer. et sam., 7 h à 12 h », days sharing the
 * same hours grouped together; "" when no hours are set.
 */
export function summarizeHours(
  slots: OpeningSlot[],
  lang: Lang = "fr",
): string {
  const rangesByDay = new Map<number, string>();
  for (const s of [...slots].sort(bySlot)) {
    const range = formatRange(s, lang);
    const before = rangesByDay.get(s.day);
    rangesByDay.set(s.day, before ? joinList([before, range], lang) : range);
  }
  const daysByRanges = new Map<string, number[]>();
  for (const [day, ranges] of rangesByDay)
    daysByRanges.set(ranges, [...(daysByRanges.get(ranges) ?? []), day]);
  return [...daysByRanges]
    .map(([ranges, days]) => daysText(days, lang) + ", " + ranges)
    .join(" · ");
}

export type OpenState =
  | { kind: "none" } // no hours set
  | { kind: "open"; until: string } // open now
  | { kind: "later"; from: string } // opens later today
  | { kind: "next"; day: number; inDays: number; from: string }; // closed for today

/** Where a market stands at `weekday` and `minutes` past midnight (Swiss time). */
export function openState(
  slots: OpeningSlot[],
  weekday: number,
  minutes: number,
): OpenState {
  if (slots.length === 0) return { kind: "none" };
  const today = slots
    .filter((s) => s.day === weekday)
    .sort((a, b) => toMinutes(a.open) - toMinutes(b.open));
  const current = today.find(
    (s) => toMinutes(s.open) <= minutes && minutes < toMinutes(s.close),
  );
  if (current) return { kind: "open", until: current.close };
  const later = today.find((s) => toMinutes(s.open) > minutes);
  if (later) return { kind: "later", from: later.open };
  for (let inDays = 1; inDays <= 7; inDays++) {
    const day = (weekday + inDays) % 7;
    const first = slots
      .filter((s) => s.day === day)
      .sort((a, b) => toMinutes(a.open) - toMinutes(b.open))[0];
    if (first) return { kind: "next", day, inDays, from: first.open };
  }
  return { kind: "none" };
}

/** Weekday and minutes past midnight in Switzerland, whatever the device's time zone. */
export function zurichClock(now: Date = new Date()): { weekday: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Zurich",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { weekday, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}
