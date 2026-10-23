import { describe, expect, it } from "vitest";
import type { MealLite } from "./stats";
import { forgottenRecipes, lastEatenBefore, recipeStats } from "./stats";

const today = "2026-10-23";

function meal(
  recipeId: string,
  date: string,
  extra: Partial<MealLite> = {},
): MealLite {
  return { recipeId, date, cookedOn: date, status: "mangé", ...extra };
}

describe("recipeStats", () => {
  it("counts a dish once per cooking (tonight + tomorrow lunch)", () => {
    const stats = recipeStats(
      [
        meal("curry", "2026-10-20"),
        meal("curry", "2026-10-21", { cookedOn: "2026-10-20" }),
        meal("curry", "2026-10-22"),
      ],
      today,
    );
    expect(stats).toEqual([
      {
        recipeId: "curry",
        count4w: 2,
        count12w: 2,
        countAll: 2,
        lastDate: "2026-10-22",
      },
    ]);
  });

  it("ignores uneaten, leftover, free-text and future meals", () => {
    const stats = recipeStats(
      [
        meal("curry", "2026-10-10", { status: "pas mangé" }),
        meal("curry", "2026-10-12", { fromLeftoverOf: "m1" }),
        meal("curry", "2026-10-30", { status: "prévu" }),
        { date: "2026-10-15", cookedOn: "2026-10-15", status: "mangé" },
      ],
      today,
    );
    expect(stats).toEqual([]);
  });

  it("splits 4-week, 12-week and all-time windows", () => {
    const stats = recipeStats(
      [
        meal("soupe", today), // age 0
        meal("soupe", "2026-09-26"), // age 27, inside 4 weeks
        meal("soupe", "2026-09-25"), // age 28, outside 4 weeks
        meal("soupe", "2026-07-31"), // age 84, outside 12 weeks
      ],
      today,
    );
    expect(stats[0]).toMatchObject({
      count4w: 2,
      count12w: 3,
      countAll: 4,
      lastDate: today,
    });
  });

  it("sorts by count then most recent", () => {
    const stats = recipeStats(
      [
        meal("a", "2026-10-01"),
        meal("b", "2026-10-02"),
        meal("b", "2026-10-09"),
        meal("c", "2026-10-15"),
      ],
      today,
    );
    expect(stats.map((s) => s.recipeId)).toEqual(["b", "c", "a"]);
  });
});

describe("lastEatenBefore", () => {
  const meals = [
    meal("curry", "2026-10-18"),
    meal("curry", "2026-10-20"),
    meal("curry", "2026-10-23"),
    meal("curry", "2026-10-29", { status: "prévu" }),
    meal("curry", "2026-10-21", { status: "pas mangé" }),
    meal("pizza", "2026-10-22"),
  ];

  it("returns the most recent date in the window, the date itself excluded", () => {
    expect(lastEatenBefore(meals, "curry", "2026-10-23")).toBe("2026-10-29");
    expect(lastEatenBefore(meals, "curry", "2026-10-23", 3)).toBe("2026-10-20");
  });

  it("returns null when nothing is close", () => {
    expect(lastEatenBefore(meals, "curry", "2026-12-01")).toBeNull();
    expect(lastEatenBefore(meals, "soupe", "2026-10-23")).toBeNull();
  });
});

describe("forgottenRecipes", () => {
  it("lists never eaten first, then the oldest", () => {
    const stats = recipeStats(
      [
        meal("recent", "2026-10-20"),
        meal("old", "2026-09-01"),
        meal("older", "2026-06-01"),
        meal("limit", "2026-09-23"), // exactly 30 days ago: not forgotten
      ],
      today,
    );
    expect(
      forgottenRecipes(
        ["recent", "old", "never", "older", "limit"],
        stats,
        today,
      ),
    ).toEqual(["never", "older", "old"]);
  });
});
