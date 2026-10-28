// Subscriptions: sign-ups through Stripe Checkout and the family's billing
// state, kept up to date by Stripe's webhook (convex/http.ts). Stripe calls
// themselves live in convex/stripeNode.ts (Node runtime).
import {
  internalMutation,
  internalQuery,
  query,
  type MutationCtx,
} from "./_generated/server";
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { accessLink, reserve } from "./access";
import { createFamily } from "./families";
import { sha256 } from "./lib";
import { slugFromName } from "./domain/auth";
import {
  CHECKOUT_LIMIT,
  CLAIM_LIMIT,
  numberedFamilyName,
  signupProblem,
  statusFromStripe,
} from "./domain/billing";

// How long the return page may still hand out the admin's first link (a Checkout page lasts 24 h)
const CLAIM_HOURS = 24;
const HOUR = 3600 * 1000;

const langValidator = v.union(v.literal("fr"), v.literal("de"));

/** Whether a family name is still free (sign-up form, before paying). */
export const nameAvailable = query({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const slug = slugFromName(name.trim());
    if (!slug) return false;
    const taken = await ctx.db
      .query("families")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    return taken === null;
  },
});

/** The name asked for, or « Dupont 2 », « Dupont 3 »… when another family took it meanwhile. */
async function freeName(ctx: MutationCtx, name: string) {
  for (let n = 1; n < 100; n++) {
    const candidate = numberedFamilyName(name, n);
    const taken = await ctx.db
      .query("families")
      .withIndex("by_slug", (q) => q.eq("slug", slugFromName(candidate)))
      .unique();
    if (!taken) return candidate;
  }
  throw new ConvexError("Le nom de la famille est obligatoire.");
}

/** Books a sign-up or a return-page check under the site-wide limits; false when over them. */
export const allowAttempt = internalMutation({
  args: { kind: v.union(v.literal("checkout"), v.literal("claim")) },
  handler: async (ctx, { kind }) => {
    const r = await reserve(
      ctx,
      `billing:${kind}`,
      kind === "checkout" ? CHECKOUT_LIMIT : CLAIM_LIMIT,
      Date.now(),
    );
    return r.allowed;
  },
});

/** Remembers a sign-up before sending the person to Stripe Checkout. */
export const recordSignup = internalMutation({
  args: {
    sessionId: v.string(),
    familyName: v.string(),
    adminName: v.string(),
    lang: langValidator,
    claimHash: v.string(),
  },
  handler: async (ctx, args) => {
    const problem = signupProblem(args);
    if (problem) throw new ConvexError(problem);
    await ctx.db.insert("signups", {
      ...args,
      familyName: args.familyName.trim(),
      adminName: args.adminName.trim(),
      createdAt: Date.now(),
    });
  },
});

const subscriptionArgs = {
  customerId: v.string(),
  subscriptionId: v.string(),
  email: v.optional(v.string()),
  stripeStatus: v.string(),
  periodEnd: v.optional(v.number()),
  cancelAtPeriodEnd: v.optional(v.boolean()),
};

interface StripeSubscription {
  customerId: string;
  subscriptionId: string;
  email?: string;
  stripeStatus: string;
  periodEnd?: number;
  cancelAtPeriodEnd?: boolean;
}

/** Writes Stripe's state on a family (an offered family keeps its access whatever Stripe says). */
async function applySubscription(
  ctx: MutationCtx,
  family: Doc<"families">,
  sub: StripeSubscription,
) {
  const before = family.billing;
  const status = statusFromStripe(sub.stripeStatus);
  await ctx.db.patch(family._id, {
    billing: {
      status,
      customerId: sub.customerId,
      subscriptionId: sub.subscriptionId,
      email: (sub.email ?? before?.email)?.slice(0, 200),
      periodEnd: sub.periodEnd,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      // The grace period starts at the first failed renewal, not at each retry
      pastDueSince:
        status === "past_due"
          ? before?.status === "past_due"
            ? before.pastDueSince
            : Date.now()
          : undefined,
    },
  });
}

/**
 * Stripe confirmed a sign-up: creates the family (catalogue, admin) once, or
 * updates it when the webhook and the return page both arrive.
 */
export const completeSignup = internalMutation({
  args: { sessionId: v.string(), ...subscriptionArgs },
  handler: async (
    ctx,
    { sessionId, ...sub },
  ): Promise<Id<"families"> | null> => {
    const signup = await ctx.db
      .query("signups")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .unique();
    if (!signup) return null;
    if (signup.familyId) {
      const family = await ctx.db.get(signup.familyId);
      if (family) await applySubscription(ctx, family, sub);
      return signup.familyId;
    }
    const { familyId } = await createFamily(ctx, {
      name: await freeName(ctx, signup.familyName),
      admin: signup.adminName,
    });
    await applySubscription(ctx, (await ctx.db.get(familyId))!, sub);
    // The family speaks the language chosen on the form
    if (signup.lang === "de") {
      const admin = await ctx.db
        .query("members")
        .withIndex("by_family", (q) => q.eq("familyId", familyId))
        .first();
      if (admin) await ctx.db.patch(admin._id, { lang: "de" });
    }
    await ctx.db.patch(signup._id, { familyId });
    return familyId;
  },
});

/** A change of the subscription (renewal, failed payment, resignation…), from the webhook. */
export const updateSubscription = internalMutation({
  args: subscriptionArgs,
  handler: async (ctx, sub) => {
    const family = await ctx.db
      .query("families")
      .withIndex("by_subscription", (q) =>
        q.eq("billing.subscriptionId", sub.subscriptionId),
      )
      .unique();
    // Not one of ours yet: the sign-up completes it with the same values
    if (!family) return false;
    await applySubscription(ctx, family, sub);
    return true;
  },
});

/** Whether a Stripe event was already handled (Stripe may send one twice). */
export const seenEvent = internalQuery({
  args: { eventId: v.string() },
  handler: async (ctx, { eventId }) =>
    (await ctx.db
      .query("stripeEvents")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .unique()) !== null,
});

/** Records an event once handled: a failure leaves it unrecorded, Stripe sends it again. */
export const markEvent = internalMutation({
  args: { eventId: v.string(), type: v.string() },
  handler: async (ctx, { eventId, type }) => {
    const seen = await ctx.db
      .query("stripeEvents")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .unique();
    if (!seen)
      await ctx.db.insert("stripeEvents", { eventId, type, at: Date.now() });
  },
});

/**
 * Return page after paying: the admin's link to choose a password, only for
 * the browser that started the sign-up (its secret), for a day, and only until
 * the admin has signed in.
 */
export const firstLink = internalMutation({
  args: { sessionId: v.string(), claimSecret: v.string() },
  handler: async (ctx, { sessionId, claimSecret }) => {
    const signup = await ctx.db
      .query("signups")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .unique();
    if (!signup?.familyId || signup.claimHash !== (await sha256(claimSecret)))
      return null;
    const family = await ctx.db.get(signup.familyId);
    if (!family) return null;
    if (Date.now() - signup.createdAt > CLAIM_HOURS * HOUR)
      return { slug: family.slug, invite: null };
    const admin = await ctx.db
      .query("members")
      .withIndex("by_family", (q) => q.eq("familyId", family._id))
      .filter((q) => q.eq(q.field("role"), "admin"))
      .first();
    if (!admin || admin.passwordHash)
      return { slug: family.slug, invite: null };
    return { slug: family.slug, invite: await accessLink(ctx, admin) };
  },
});

/**
 * Nightly: forgets sign-ups never paid (2 days), finished ones (30 days) and
 * handled Stripe events (30 days). Names are personal data, kept no longer than needed.
 */
export const purgeStale = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let removed = 0;
    for (const s of await ctx.db.query("signups").collect()) {
      const age = now - s.createdAt;
      if ((!s.familyId && age > 48 * HOUR) || age > 30 * 24 * HOUR) {
        await ctx.db.delete(s._id);
        removed++;
      }
    }
    for (const e of await ctx.db.query("stripeEvents").collect()) {
      if (now - e.at > 30 * 24 * HOUR) {
        await ctx.db.delete(e._id);
        removed++;
      }
    }
    return { removed };
  },
});
