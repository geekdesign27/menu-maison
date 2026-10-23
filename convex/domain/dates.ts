// Calendar helpers on plain "YYYY-MM-DD" strings, computed in UTC on the date only.

const DAY_MS = 86_400_000;

export const DAY_NAMES = [
  "dimanche",
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
];
export const DAY_SHORT = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
const MONTH_NAMES = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

/** Parses "YYYY-MM-DD" into UTC milliseconds at midnight. */
function toUtcMs(date: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match)
    throw new Error(`Date invalide : « ${date} » (format attendu AAAA-MM-JJ)`);
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function fromUtcMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function parts(date: string): { year: number; month: number; day: number } {
  const d = new Date(toUtcMs(date));
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth(),
    day: d.getUTCDate(),
  };
}

// French ordinal for the first day of the month: « 1er novembre ».
function dayNumber(day: number): string {
  return day === 1 ? "1er" : String(day);
}

export function addDays(date: string, n: number): string {
  return fromUtcMs(toUtcMs(date) + n * DAY_MS);
}

/** 0 = Sunday … 6 = Saturday. */
export function dayOfWeek(date: string): number {
  return new Date(toUtcMs(date)).getUTCDay();
}

/** Most recent day (date included) falling on `shoppingDay`. */
export function weekStart(date: string, shoppingDay: number): string {
  const offset = (dayOfWeek(date) - shoppingDay + 7) % 7;
  return addDays(date, -offset);
}

/** The 7 consecutive dates starting at `start`. */
export function weekDays(start: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Today's date in Europe/Zurich, whatever the device or server time zone. */
export function zurichToday(now: Date = new Date()): string {
  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Zurich",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) =>
    formatted.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Number of days from `a` to `b` (positive when b is later). */
export function daysBetween(a: string, b: string): number {
  return Math.round((toUtcMs(b) - toUtcMs(a)) / DAY_MS);
}

/** « samedi 24 octobre » */
export function formatDayLong(date: string): string {
  const { month, day } = parts(date);
  return `${DAY_NAMES[dayOfWeek(date)]} ${dayNumber(day)} ${MONTH_NAMES[month]}`;
}

/** « sam. 24 » */
export function formatDayShort(date: string): string {
  return `${DAY_SHORT[dayOfWeek(date)]} ${dayNumber(parts(date).day)}`;
}

/** « 24 au 30 octobre », « 31 octobre au 6 novembre », years added only when they differ. */
export function formatDateRange(start: string, end: string): string {
  const s = parts(start);
  const e = parts(end);
  const endText = `${dayNumber(e.day)} ${MONTH_NAMES[e.month]}`;
  if (s.year !== e.year) {
    return `${dayNumber(s.day)} ${MONTH_NAMES[s.month]} ${s.year} au ${endText} ${e.year}`;
  }
  if (s.month !== e.month)
    return `${dayNumber(s.day)} ${MONTH_NAMES[s.month]} au ${endText}`;
  return `${dayNumber(s.day)} au ${endText}`;
}
