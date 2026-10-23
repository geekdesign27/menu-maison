import { describe, expect, it } from "vitest";
import { leftoverStatus } from "./leftovers";

describe("leftoverStatus", () => {
  it("is good before the limit", () => {
    expect(leftoverStatus("2026-10-24", 3, "2026-10-25")).toEqual({
      until: "2026-10-27",
      daysLeft: 2,
      state: "bon",
    });
  });

  it("must be eaten today on the limit day", () => {
    expect(leftoverStatus("2026-10-24", 3, "2026-10-27")).toEqual({
      until: "2026-10-27",
      daysLeft: 0,
      state: "aujourd'hui",
    });
  });

  it("is expired after the limit, across a month change", () => {
    expect(leftoverStatus("2026-10-30", 2, "2026-11-03")).toEqual({
      until: "2026-11-01",
      daysLeft: -2,
      state: "périmé",
    });
  });
});
