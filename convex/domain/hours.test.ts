import { describe, expect, it } from "vitest";
import {
  formatRange,
  formatTime,
  normalizeHours,
  openState,
  summarizeHours,
  zurichClock,
} from "./hours";

const NBSP = " ";
const sp = (s: string) => s.replace(/ /g, NBSP);

// Marché de Fribourg: Wednesday and Saturday mornings
const MARKET = [
  { day: 6, open: "07:00", close: "12:00" },
  { day: 3, open: "07:00", close: "12:00" },
];

describe("normalizeHours", () => {
  it("sorts slots Monday first, Sunday last", () => {
    expect(
      normalizeHours([
        { day: 0, open: "09:00", close: "12:00" },
        ...MARKET,
        { day: 3, open: "14:00", close: "18:00" },
      ]).map((s) => `${s.day} ${s.open}`),
    ).toEqual(["3 07:00", "3 14:00", "6 07:00", "0 09:00"]);
  });

  it("refuses bad times, reversed or overlapping slots", () => {
    expect(() =>
      normalizeHours([{ day: 3, open: "7:00", close: "12:00" }]),
    ).toThrow("Heure invalide.");
    expect(() =>
      normalizeHours([{ day: 3, open: "24:00", close: "12:00" }]),
    ).toThrow("Heure invalide.");
    expect(() =>
      normalizeHours([{ day: 7, open: "07:00", close: "12:00" }]),
    ).toThrow("Jour invalide.");
    expect(() =>
      normalizeHours([{ day: 3, open: "12:00", close: "12:00" }]),
    ).toThrow("L'heure de fin doit suivre l'heure de début.");
    expect(() =>
      normalizeHours([
        { day: 3, open: "07:00", close: "12:00" },
        { day: 3, open: "11:30", close: "14:00" },
      ]),
    ).toThrow("Deux horaires se chevauchent.");
    expect(() =>
      normalizeHours(Array.from({ length: 22 }, () => MARKET[0])),
    ).toThrow("Trop d'horaires.");
  });
});

describe("formats", () => {
  it("writes times the Swiss way, in French and in German", () => {
    expect(formatTime("07:00")).toBe(sp("7 h"));
    expect(formatTime("07:30")).toBe(sp("7 h 30"));
    expect(formatTime("07:30", "de")).toBe("7.30");
    expect(formatRange({ open: "07:00", close: "12:30" })).toBe(
      `${sp("7 h")} à ${sp("12 h 30")}`,
    );
    expect(formatRange({ open: "07:30", close: "12:00" }, "de")).toBe(
      `7.30 bis 12${NBSP}Uhr`,
    );
  });

  it("groups days that share the same hours", () => {
    expect(summarizeHours(MARKET)).toBe(
      `mer. et sam., ${sp("7 h")} à ${sp("12 h")}`,
    );
    expect(summarizeHours(MARKET, "de")).toBe(
      `Mi. und Sa., 7 bis 12${NBSP}Uhr`,
    );
    expect(summarizeHours([])).toBe("");
  });

  it("reads three days in a row as a span", () => {
    const week = [1, 2, 3, 4, 5].map((day) => ({
      day,
      open: "08:00",
      close: "18:30",
    }));
    expect(
      summarizeHours([...week, { day: 6, open: "08:00", close: "16:00" }]),
    ).toBe(
      `lun. au ven., ${sp("8 h")} à ${sp("18 h 30")} · sam., ${sp("8 h")} à ${sp("16 h")}`,
    );
  });

  it("lists two slots of the same day together", () => {
    expect(
      summarizeHours([
        { day: 2, open: "14:00", close: "18:00" },
        { day: 2, open: "08:00", close: "12:00" },
      ]),
    ).toBe(
      `mar., ${sp("8 h")} à ${sp("12 h")} et ${sp("14 h")} à ${sp("18 h")}`,
    );
  });
});

describe("openState", () => {
  const at = (h: number, m = 0) => h * 60 + m;

  it("tells whether the market is open now, later today or another day", () => {
    expect(openState(MARKET, 6, at(9))).toEqual({
      kind: "open",
      until: "12:00",
    });
    expect(openState(MARKET, 6, at(6, 30))).toEqual({
      kind: "later",
      from: "07:00",
    });
    // Saturday at noon: closed, next on Wednesday
    expect(openState(MARKET, 6, at(12))).toEqual({
      kind: "next",
      day: 3,
      inDays: 4,
      from: "07:00",
    });
    // Tuesday evening: tomorrow
    expect(openState(MARKET, 2, at(20))).toEqual({
      kind: "next",
      day: 3,
      inDays: 1,
      from: "07:00",
    });
    // Only on Wednesdays, asked on a Wednesday afternoon: next week
    expect(openState([MARKET[1]], 3, at(15))).toEqual({
      kind: "next",
      day: 3,
      inDays: 7,
      from: "07:00",
    });
    expect(openState([], 6, at(9))).toEqual({ kind: "none" });
  });

  it("reads the Swiss clock whatever the device's time zone", () => {
    // Saturday 31 October 2026, 08:15 in Zurich (UTC+1 once summer time ends)
    expect(zurichClock(new Date("2026-10-31T07:15:00Z"))).toEqual({
      weekday: 6,
      minutes: 8 * 60 + 15,
    });
  });
});
