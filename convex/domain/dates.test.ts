import { describe, expect, it } from "vitest";
import {
  addDays,
  dayOfWeek,
  daysBetween,
  formatDateRange,
  formatDayLong,
  formatDayWithYear,
  formatDayShort,
  weekDays,
  weekStart,
  zurichToday,
} from "./dates";

describe("addDays", () => {
  it("crosses month and year boundaries", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
  });

  it("is not affected by daylight saving changes", () => {
    // Europe switches to winter time on 2026-10-25
    expect(addDays("2026-10-24", 2)).toBe("2026-10-26");
  });
});

describe("dayOfWeek / weekStart", () => {
  it("knows weekdays", () => {
    expect(dayOfWeek("2026-10-24")).toBe(6); // Saturday
    expect(dayOfWeek("2026-10-25")).toBe(0); // Sunday
  });

  it("starts the planning week on Saturday", () => {
    expect(weekStart("2026-10-24", 6)).toBe("2026-10-24");
    expect(weekStart("2026-10-23", 6)).toBe("2026-10-17");
    expect(weekStart("2026-10-30", 6)).toBe("2026-10-24");
    expect(weekStart("2026-10-31", 6)).toBe("2026-10-31");
  });

  it("supports another shopping day", () => {
    expect(weekStart("2026-10-24", 1)).toBe("2026-10-19"); // Monday
  });
});

describe("weekDays", () => {
  it("returns 7 days across a month change", () => {
    expect(weekDays("2026-10-31")).toEqual([
      "2026-10-31",
      "2026-11-01",
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
      "2026-11-05",
      "2026-11-06",
    ]);
  });
});

describe("zurichToday", () => {
  it("uses the Zurich date, not UTC", () => {
    // 23:30 UTC in summer = 01:30 next day in Zurich
    expect(zurichToday(new Date("2026-07-14T23:30:00Z"))).toBe("2026-07-15");
    // 22:30 UTC in winter = 23:30 same day in Zurich
    expect(zurichToday(new Date("2026-01-14T22:30:00Z"))).toBe("2026-01-14");
  });
});

describe("daysBetween", () => {
  it("counts b - a", () => {
    expect(daysBetween("2026-10-24", "2026-10-30")).toBe(6);
    expect(daysBetween("2026-10-30", "2026-10-24")).toBe(-6);
    expect(daysBetween("2026-10-24", "2026-10-26")).toBe(2);
  });
});

describe("day formats, French and German", () => {
  it("formats long and short days", () => {
    expect(formatDayLong("2026-10-24")).toBe("samedi 24 octobre");
    expect(formatDayLong("2026-11-01")).toBe("dimanche 1er novembre");
    expect(formatDayShort("2026-10-24")).toBe("sam. 24");
    expect(formatDayLong("2026-10-24", "de")).toBe("Samstag, 24. Oktober");
    expect(formatDayLong("2026-11-01", "de")).toBe("Sonntag, 1. November");
    expect(formatDayShort("2026-10-24", "de")).toBe("Sa. 24.");
    expect(formatDateRange("2026-10-24", "2026-10-30", "de")).toBe("24. bis 30. Oktober");
    expect(formatDateRange("2026-10-31", "2026-11-06", "de")).toBe("31. Oktober bis 6. November");
    expect(formatDateRange("2026-12-26", "2027-01-01", "de")).toBe("26. Dezember 2026 bis 1. Januar 2027");
  });

  it("formats ranges", () => {
    expect(formatDateRange("2026-10-24", "2026-10-30")).toBe(
      "24 au 30 octobre",
    );
    expect(formatDateRange("2026-10-31", "2026-11-06")).toBe(
      "31 octobre au 6 novembre",
    );
    expect(formatDateRange("2026-12-26", "2027-01-01")).toBe(
      "26 décembre 2026 au 1er janvier 2027",
    );
  });

  it("never uses en or em dashes", () => {
    const text =
      formatDateRange("2026-10-31", "2026-11-06") + formatDayLong("2026-10-24");
    const dashes = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`);
    expect(text).not.toMatch(dashes);
  });
});

describe("formatDayWithYear", () => {
  it("writes the year, for billing dates a year away", () => {
    expect(formatDayWithYear("2027-10-29")).toBe("vendredi 29 octobre 2027");
    expect(formatDayWithYear("2027-11-01")).toBe("lundi 1er novembre 2027");
    expect(formatDayWithYear("2027-10-29", "de")).toBe("Freitag, 29. Oktober 2027");
  });
});
