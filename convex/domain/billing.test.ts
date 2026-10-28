import { describe, expect, it } from "vitest";
import { accessOf, daysLeft, GRACE_DAYS, numberedFamilyName, signupProblem, statusFromStripe } from "./billing";
import { slugFromName } from "./auth";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 28, 12);

describe("subscription of a family", () => {
  it("maps Stripe statuses, unknown ones give no access", () => {
    expect(statusFromStripe("trialing")).toBe("trialing");
    expect(statusFromStripe("active")).toBe("active");
    expect(statusFromStripe("past_due")).toBe("past_due");
    expect(statusFromStripe("unpaid")).toBe("unpaid");
    for (const s of [
      "canceled",
      "incomplete",
      "incomplete_expired",
      "paused",
      "nouveau",
    ])
      expect(statusFromStripe(s)).toBe("canceled");
  });

  it("gives full access to offered, trial and paid families, and to the older ones", () => {
    expect(accessOf(undefined, NOW)).toBe("full");
    for (const status of ["comped", "trialing", "active"] as const)
      expect(accessOf({ status }, NOW)).toBe("full");
  });

  it("keeps access for a week after a failed renewal, then only reading", () => {
    expect(
      accessOf({ status: "past_due", pastDueSince: NOW - 2 * DAY }, NOW),
    ).toBe("grace");
    expect(
      accessOf(
        { status: "past_due", pastDueSince: NOW - GRACE_DAYS * DAY },
        NOW,
      ),
    ).toBe("readonly");
    expect(accessOf({ status: "canceled" }, NOW)).toBe("readonly");
    expect(accessOf({ status: "unpaid" }, NOW)).toBe("readonly");
  });

  it("counts the days left of a trial", () => {
    expect(daysLeft(NOW + 7 * DAY, NOW)).toBe(7);
    expect(daysLeft(NOW + 1, NOW)).toBe(1);
    expect(daysLeft(NOW - 1, NOW)).toBe(0);
    expect(daysLeft(undefined, NOW)).toBe(0);
  });

  it("checks the sign-up form", () => {
    expect(
      signupProblem({ familyName: "Dupont", adminName: "Marc" }),
    ).toBeNull();
    expect(signupProblem({ familyName: " ", adminName: "Marc" })).toMatch(
      /famille/,
    );
    expect(signupProblem({ familyName: "Dupont", adminName: "" })).toMatch(
      /prénom/,
    );
  });

  it("refuses before paying every name the family creation would refuse after", () => {
    expect(signupProblem({ familyName: "X", adminName: "Marc" })).toMatch(/lien/);
    expect(signupProblem({ familyName: "Жуков", adminName: "Marc" })).toMatch(/lien/);
    expect(signupProblem({ familyName: "D".repeat(41), adminName: "Marc" })).toBe("Nom trop long.");
    expect(signupProblem({ familyName: "Famille Müller-Schütz", adminName: "Anna" })).toBeNull();
  });

  it("numbers a taken name so that the sign-in link changes too", () => {
    expect(numberedFamilyName("Dupont", 1)).toBe("Dupont");
    expect(numberedFamilyName("Dupont", 2)).toBe("Dupont 2");
    const long = "Famille Rochat de Villars-sur-Glâne";
    for (const n of [2, 10, 99]) {
      const slug = slugFromName(numberedFamilyName(long, n));
      expect(slug.endsWith(`-${n}`), slug).toBe(true);
      expect(slug.length).toBeLessThanOrEqual(30);
    }
  });
});
