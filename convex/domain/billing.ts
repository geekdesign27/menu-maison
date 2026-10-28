// Subscription of a family: what Stripe says, and what the family may do.
// Pure functions, tested with Vitest; convex/billing.ts stores the state.
import { nameProblem, slugFromName, type Limit } from "./auth";

export const PRICE_LOOKUP_KEY = "menu-maison-annual-chf";
export const PRICE_CHF = 20;
export const TRIAL_DAYS = 7;
/** Days a family keeps full access after a failed renewal, to update its card. */
export const GRACE_DAYS = 7;

const DAY = 24 * 60 * 60 * 1000;

/** Stripe's state of a family's subscription (whether it is offered is kept apart). */
export type BillingStatus =
  | "trialing"
  | "active"
  | "past_due" // a renewal failed, Stripe retries
  | "canceled" // ended (resigned, or trial not converted)
  | "unpaid"; // Stripe gave up retrying

export interface Billing {
  status: BillingStatus;
  customerId?: string;
  subscriptionId?: string;
  email?: string;
  /** End of the trial or of the paid year, ms. */
  periodEnd?: number;
  cancelAtPeriodEnd?: boolean;
  /** When the status last changed to past_due, ms (start of the grace period). */
  pastDueSince?: number;
}

/** Stripe subscription status → ours. Unknown or incomplete ones give no access. */
export function statusFromStripe(stripeStatus: string): BillingStatus {
  switch (stripeStatus) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "unpaid":
      return "unpaid";
    default:
      // canceled, incomplete, incomplete_expired, paused
      return "canceled";
  }
}

export type Access = "full" | "grace" | "readonly";

export const READ_ONLY =
  "L'abonnement de ta famille est terminé : l'app est en lecture seule. L'admin peut le réactiver.";

/**
 * Whether PA offers the app to the family. `offered` true or false is his
 * choice in Super admin; unset, a family without subscription (created before
 * the subscription, or by PA) counts as offered.
 */
export function isOffered(family: { offered?: boolean; billing?: Billing }): boolean {
  return family.offered ?? !family.billing;
}

/** What a family may do now: everything, everything with a warning, or only read. */
export function accessOf(family: { offered?: boolean; billing?: Billing }, now: number): Access {
  if (isOffered(family)) return "full";
  const billing = family.billing;
  if (!billing) return "readonly";
  switch (billing.status) {
    case "trialing":
    case "active":
      return "full";
    case "past_due":
      // Without its start (never written by Stripe's updates), no grace
      return now - (billing.pastDueSince ?? 0) < GRACE_DAYS * DAY ? "grace" : "readonly";
    default:
      return "readonly";
  }
}

/** AI during the free trial: enough to try the receipts and an import, not to spend PA's keys. */
export const TRIAL_CAPS = { claudeUsd: 0.3, dictations: 10 } as const;

/** Whether the family is in its free trial (and not offered). */
export function inTrial(family: { offered?: boolean; billing?: Billing }): boolean {
  return !isOffered(family) && family.billing?.status === "trialing";
}

/** Whole days left before `periodEnd` (rounded up), 0 when it is past. */
export function daysLeft(periodEnd: number | undefined, now: number): number {
  if (!periodEnd || periodEnd <= now) return 0;
  return Math.ceil((periodEnd - now) / DAY);
}

/** Marks Menu Maison's sessions and subscriptions: the Stripe account also sells other products. */
export const APP_METADATA = { app: "menu-maison" } as const;

/** Sign-ups opened from the whole site: 30 an hour, then a quarter of an hour of pause. */
export const CHECKOUT_LIMIT: Limit = { max: 30, windowMs: 60 * 60_000, lockMs: 15 * 60_000 };
/** Return pages checked with Stripe: 60 in 10 minutes. */
export const CLAIM_LIMIT: Limit = { max: 60, windowMs: 10 * 60_000, lockMs: 10 * 60_000 };

/** The family name as createFamily keeps it (40 characters, single spaces). */
export function cleanFamilyName(name: string): string {
  return name.trim().replace(/\s+/g, " ").slice(0, 40);
}

/**
 * Checks the sign-up form before going to Stripe, with the very rules used to
 * create the family after paying (a name refused then would charge a family
 * that does not exist). Returns the problem or null.
 */
export function signupProblem(input: { familyName: string; adminName: string }): string | null {
  const name = cleanFamilyName(input.familyName);
  if (!name) return "Le nom de la famille est obligatoire.";
  if (!input.adminName.trim()) return "Le prénom de l'admin est obligatoire.";
  if (input.familyName.trim().length > 40 || input.adminName.trim().length > 40) return "Nom trop long.";
  const problem = nameProblem(slugFromName(name), "Le nom du lien");
  return problem ? `Ce nom ne donne pas un lien valable : ${problem.toLowerCase()}` : null;
}

/**
 * « Dupont », then « Dupont 2 », « Dupont 3 »… The base is shortened so that the
 * number still changes the sign-in link (links stop at 30 characters).
 */
export function numberedFamilyName(name: string, n: number): string {
  let base = cleanFamilyName(name);
  if (n === 1) return base;
  while (slugFromName(base).length > 27) base = base.slice(0, -1).trim();
  return `${base} ${n}`;
}
