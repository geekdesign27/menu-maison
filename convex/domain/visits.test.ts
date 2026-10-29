import { describe, expect, it } from "vitest";
import {
  deviceOf,
  isBot,
  isClientEvent,
  sourceOf,
  statsUrlOf,
  summarize,
  type StatRow,
} from "./visits";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1";
const MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/145.0 Safari/537.36";

describe("isBot", () => {
  it("lets browsers through and stops robots and link previews", () => {
    expect(isBot(IPHONE)).toBe(false);
    expect(isBot(MAC)).toBe(false);
    expect(isBot("Mozilla/5.0 (Linux; Android 13; Cubot P80) Mobile Safari/537.36")).toBe(false);
    expect(isBot("Mozilla/5.0 (compatible; bingbot/2.0)")).toBe(true);
    for (const ua of [
      "Googlebot/2.1 (+http://www.google.com/bot.html)",
      "facebookexternalhit/1.1",
      "WhatsApp/2.23.20.0",
      "Mozilla/5.0 HeadlessChrome/120.0",
      "curl/8.4.0",
      null,
      "",
    ])
      expect(isBot(ua), String(ua)).toBe(true);
  });
});

describe("deviceOf", () => {
  it("tells a phone from a computer", () => {
    expect(deviceOf(IPHONE)).toBe("mobile");
    expect(deviceOf("Mozilla/5.0 (Linux; Android 14) Mobile Safari")).toBe(
      "mobile",
    );
    expect(deviceOf(MAC)).toBe("desktop");
  });
});

describe("sourceOf", () => {
  it("prefers a campaign's utm_source, cleaned", () => {
    expect(sourceOf("www.google.com", "Newsletter_Oct")).toBe(
      "utm:newsletter_oct",
    );
    expect(sourceOf(null, "<script>")).toBe("utm:script");
  });

  it("names the known sites, « autre » for the others", () => {
    expect(sourceOf("www.google.ch", null)).toBe("google");
    expect(sourceOf("l.facebook.com", null)).toBe("facebook");
    expect(sourceOf("t.co", null)).toBe("x");
    expect(sourceOf("www.securtec.ch", null)).toBe("autre");
  });

  it("is direct without referrer, from the site itself, or with junk", () => {
    expect(sourceOf("", "")).toBe("direct");
    expect(sourceOf("menumaison.ch", null)).toBe("direct");
    expect(sourceOf("localhost", null)).toBe("direct");
    expect(sourceOf("bad host/with spaces", null)).toBe("direct");
  });
});

describe("isClientEvent", () => {
  it("accepts only the browser's events", () => {
    expect(isClientEvent("visit")).toBe(true);
    expect(isClientEvent("paid")).toBe(false);
    expect(isClientEvent("anything")).toBe(false);
    expect(isClientEvent(3)).toBe(false);
  });
});

describe("statsUrlOf", () => {
  it("finds the HTTP site of a cloud or local deployment", () => {
    expect(
      statsUrlOf("https://resolute-squid-776.eu-west-1.convex.cloud"),
    ).toBe("https://resolute-squid-776.eu-west-1.convex.site/stats");
    expect(statsUrlOf("http://127.0.0.1:3211")).toBe(
      "http://127.0.0.1:3212/stats",
    );
    expect(statsUrlOf(undefined)).toBeNull();
    expect(statsUrlOf("https://example.com")).toBeNull();
  });
});

describe("summarize", () => {
  const row = (
    day: string,
    event: string,
    count: number,
    source = "",
    lang = "",
    device = "",
  ): StatRow => ({
    day,
    event,
    source,
    lang,
    device,
    count,
  });

  it("adds up the counters and gives each funnel step its rate", () => {
    const s = summarize(
      [
        row("2026-10-28", "visit", 60, "google", "fr", "mobile"),
        row("2026-10-29", "visit", 30, "direct", "de", "desktop"),
        row("2026-10-29", "visit", 10, "google", "fr", "desktop"),
        row("2026-10-29", "trial", 20, "google", "fr", "mobile"),
        row("2026-10-29", "checkout", 10),
        row("2026-10-29", "trialStarted", 8),
        row("2026-10-27", "visit", 99, "old", "fr", "mobile"), // outside the days asked
      ],
      ["2026-10-28", "2026-10-29"],
    );
    expect(s.visitsByDay).toEqual([
      { day: "2026-10-28", count: 60 },
      { day: "2026-10-29", count: 40 },
    ]);
    expect(s.funnel).toEqual([
      { event: "visit", count: 100, rate: null },
      { event: "trial", count: 20, rate: 20 },
      { event: "checkout", count: 10, rate: 50 },
      { event: "trialStarted", count: 8, rate: 80 },
      { event: "paid", count: 0, rate: 0 },
    ]);
    expect(s.sources[0]).toEqual({ key: "google", count: 70 });
    expect(s.langs).toEqual([
      { key: "fr", count: 70 },
      { key: "de", count: 30 },
    ]);
  });

  it("has no rate after an empty step", () => {
    const s = summarize([row("2026-10-29", "trial", 2)], ["2026-10-29"]);
    expect(s.funnel[1]).toEqual({ event: "trial", count: 2, rate: null });
  });
});
