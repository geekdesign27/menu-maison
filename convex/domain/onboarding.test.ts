import { describe, expect, it } from "vitest";
import type { OnboardingFacts } from "./onboarding";
import {
  firstSteps,
  habitualsToStamp,
  LIKES_GOAL,
  ONBOARDING_HABITUAL,
  shouldWelcome,
  showChecklist,
} from "./onboarding";

const nothing: OnboardingFacts = {
  hasPhoto: false,
  likes: 0,
  wishes: 0,
  mealsAdded: 0,
  itemsChecked: 0,
  statusesSet: 0,
};
const everything: OnboardingFacts = {
  hasPhoto: true,
  likes: 7,
  wishes: 1,
  mealsAdded: 2,
  itemsChecked: 3,
  statusesSet: 1,
};

describe("firstSteps", () => {
  it("follows the member tutorial order, nothing done at first", () => {
    const steps = firstSteps(nothing, "todo");
    expect(steps.map((s) => s.id)).toEqual([
      "homeScreen",
      "photo",
      "likes",
      "wish",
      "meal",
      "check",
      "status",
    ]);
    expect(steps.every((s) => !s.done)).toBe(true);
  });

  it("leaves the home screen out on a computer", () => {
    expect(firstSteps(nothing, "n/a").map((s) => s.id)).not.toContain(
      "homeScreen",
    );
  });

  it("ticks each step from the member's own data", () => {
    const steps = firstSteps(everything, "done");
    expect(steps.every((s) => s.done)).toBe(true);
  });

  it("needs five likes, and shows the progress capped at the goal", () => {
    const four = firstSteps({ ...nothing, likes: 4 }, "n/a").find(
      (s) => s.id === "likes",
    );
    expect(four).toEqual({
      id: "likes",
      done: false,
      progress: { count: 4, goal: LIKES_GOAL },
    });
    const nine = firstSteps({ ...nothing, likes: 9 }, "n/a").find(
      (s) => s.id === "likes",
    );
    expect(nine).toEqual({
      id: "likes",
      done: true,
      progress: { count: 5, goal: LIKES_GOAL },
    });
  });
});

describe("shouldWelcome", () => {
  it("welcomes a new member once the family guide is on", () => {
    expect(shouldWelcome(true, undefined)).toBe(true);
  });

  it("stays quiet when the guide is off or already seen", () => {
    expect(shouldWelcome(undefined, undefined)).toBe(false);
    expect(shouldWelcome(false, undefined)).toBe(false);
    expect(shouldWelcome(true, 1_700_000_000_000)).toBe(false);
    expect(shouldWelcome(true, ONBOARDING_HABITUAL)).toBe(false);
  });
});

describe("showChecklist", () => {
  const todo = firstSteps(nothing, "n/a");
  const done = firstSteps(everything, "n/a");

  it("shows while something is left, before and after the tour", () => {
    expect(showChecklist(true, undefined, todo)).toBe(true);
    expect(showChecklist(true, 1_700_000_000_000, todo)).toBe(true);
  });

  it("disappears once complete, for habitués, or when the guide is off", () => {
    expect(showChecklist(true, undefined, done)).toBe(false);
    expect(showChecklist(true, ONBOARDING_HABITUAL, todo)).toBe(false);
    expect(showChecklist(false, undefined, todo)).toBe(false);
    expect(showChecklist(undefined, undefined, todo)).toBe(false);
  });
});

describe("habitualsToStamp", () => {
  it("marks activated accounts without a date, nobody else", () => {
    const members = [
      { name: "PA", hasPassword: true },
      { name: "Clara", hasPassword: true, onboardingDoneAt: 1_700_000_000_000 },
      { name: "Bébé", hasPassword: false },
      {
        name: "Patricia",
        hasPassword: true,
        onboardingDoneAt: ONBOARDING_HABITUAL,
      },
    ];
    expect(habitualsToStamp(members).map((m) => m.name)).toEqual(["PA"]);
  });
});
