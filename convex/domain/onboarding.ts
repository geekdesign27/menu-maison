// Onboarding of new members: when to offer the tour, and the "Premiers pas"
// checklist, worked out from what the member already did in the app.

/**
 * `members.onboardingDoneAt` value of a "habitué": no welcome, no checklist.
 * Accounts already in use when the family switched the guide on, and members
 * who completed « Premiers pas ».
 */
export const ONBOARDING_HABITUAL = 0;

/** Likes asked by the checklist (« Like 5 recettes »). */
export const LIKES_GOAL = 5;

/** Dishes planned by the family for the admin's « première semaine ». */
export const WEEK_GOAL = 3;

export type FirstStepId =
  | "homeScreen"
  | "email"
  | "photo"
  | "likes"
  | "wish"
  | "meal"
  | "check"
  | "status"
  | "members"
  | "joined"
  | "week"
  | "list";

/** What the whole family did, for the admin who sets it up. */
export interface FamilyFacts {
  /** Profiles besides the admin, with or without an account. */
  otherMembers: number;
  /** Other members who signed in at least once (their link reached them). */
  othersJoined: number;
  mealsPlanned: number;
  itemsChecked: number;
}

/** What the member did, counted on the server (except the home screen). */
export interface OnboardingFacts {
  /** Confirmed address, for a forgotten password. */
  hasEmail: boolean;
  hasPhoto: boolean;
  likes: number;
  wishes: number;
  mealsAdded: number;
  itemsChecked: number;
  statusesSet: number;
  /** Admins only: they get the family set-up checklist instead. */
  family?: FamilyFacts;
}

export interface FirstStep {
  id: FirstStepId;
  done: boolean;
  /** Progress towards the goal, only for steps counted in several actions */
  progress?: { count: number; goal: number };
}

/**
 * The checklist, in its order: setting the family up for an admin (facts with
 * `family`), the member tutorial otherwise. `homeScreen` is known on the
 * device only: "n/a" (a computer) leaves that step out.
 */
export function firstSteps(
  facts: OnboardingFacts,
  homeScreen: "done" | "todo" | "n/a",
): FirstStep[] {
  const steps: FirstStep[] = [];
  if (homeScreen !== "n/a")
    steps.push({ id: "homeScreen", done: homeScreen === "done" });
  steps.push({ id: "email", done: facts.hasEmail });
  const { family } = facts;
  if (family) {
    steps.push(
      { id: "members", done: family.otherMembers > 0 },
      { id: "joined", done: family.othersJoined > 0 },
      {
        id: "week",
        done: family.mealsPlanned >= WEEK_GOAL,
        progress: {
          count: Math.min(family.mealsPlanned, WEEK_GOAL),
          goal: WEEK_GOAL,
        },
      },
      { id: "list", done: family.itemsChecked > 0 },
    );
    return steps;
  }
  steps.push(
    { id: "photo", done: facts.hasPhoto },
    {
      id: "likes",
      done: facts.likes >= LIKES_GOAL,
      progress: { count: Math.min(facts.likes, LIKES_GOAL), goal: LIKES_GOAL },
    },
    { id: "wish", done: facts.wishes > 0 },
    { id: "meal", done: facts.mealsAdded > 0 },
    { id: "check", done: facts.itemsChecked > 0 },
    { id: "status", done: facts.statusesSet > 0 },
  );
  return steps;
}

/** The welcome card shows once: guide on, and the member never finished nor skipped it. */
export function shouldWelcome(
  enabled: boolean | undefined,
  doneAt: number | undefined,
) {
  return enabled === true && doneAt === undefined;
}

/** "Premiers pas" stays in Plus until complete, never for the habitués. */
export function showChecklist(
  enabled: boolean | undefined,
  doneAt: number | undefined,
  steps: FirstStep[],
) {
  return (
    enabled === true &&
    doneAt !== ONBOARDING_HABITUAL &&
    steps.some((s) => !s.done)
  );
}

/**
 * Members to mark as habitués when the guide is switched on: accounts already
 * activated that have no onboarding date yet. New accounts keep the tour.
 */
export function habitualsToStamp<
  T extends { hasPassword: boolean; onboardingDoneAt?: number },
>(members: T[]): T[] {
  return members.filter(
    (m) => m.hasPassword && m.onboardingDoneAt === undefined,
  );
}
