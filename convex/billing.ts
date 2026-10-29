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
import { createInvite, reserve } from "./access";
import { createFamily } from "./families";
import { assertAdmin, requireMember, sha256 } from "./lib";
import { sendOnce, siteUrl } from "./email";
import { formatDayWithYear } from "./domain/dates";
import type { EmailData, EmailKind } from "./domain/emails";
import type { Lang } from "./domain/lang";
import { slugFromName } from "./domain/auth";
import {
  CHECKOUT_LIMIT,
  CLAIM_LIMIT,
  GRACE_DAYS,
  FAMILY_CHECKOUT_LIMIT,
  isOffered,
  numberedFamilyName,
  signupOpen,
  signupProblem,
  statusFromStripe,
} from "./domain/billing";

// How long the return page may still hand out the admin's first link (a Checkout page lasts 24 h)
const CLAIM_HOURS = 24;
const EMAIL_LINK_HOURS = 7 * 24;
const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

const langValidator = v.union(v.literal("fr"), v.literal("de"));

/** Whether the sign-up form may open Stripe (« #/essai », before anyone is signed in). */
export const signupStatus = query({
  args: {},
  handler: async () => ({ open: signupOpen(process.env.SIGNUP_OPEN) }),
});

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
    // An existing family subscribing (Gestion, Abonnement): no new family is created
    familyId: v.optional(v.id("families")),
  },
  handler: async (ctx, args) => {
    const problem = args.familyId ? null : signupProblem(args);
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
  const billing: NonNullable<Doc<"families">["billing"]> = {
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
  };
  await ctx.db.patch(family._id, { billing });
  await notifyChange(ctx, family, before, billing);
}

/** The family's admin (name, language) for its e-mails. */
async function familyContact(ctx: MutationCtx, familyId: Id<"families">) {
  const admin = await ctx.db
    .query("members")
    .withIndex("by_family", (q) => q.eq("familyId", familyId))
    .filter((q) => q.eq(q.field("role"), "admin"))
    .first();
  return { adminName: admin?.name ?? "", lang: admin?.lang ?? ("fr" as const) };
}

const dayIn = (ms: number | undefined, lang: Lang) =>
  ms ? formatDayWithYear(new Date(ms).toISOString().slice(0, 10), lang) : "";

/**
 * E-mails on a change of subscription, to the family and to PA: paid after the
 * trial, payment refused, resigned. Each one once (key per subscription and event).
 */
async function notifyChange(
  ctx: MutationCtx,
  family: Doc<"families">,
  before: Doc<"families">["billing"],
  after: NonNullable<Doc<"families">["billing"]>,
) {
  const { adminName, lang } = await familyContact(ctx, family._id);
  const site = siteUrl();
  const base = { familyName: family.name, adminName, email: after.email, lang };
  const send = async (kind: EmailKind, adminKind: EmailKind, key: string, data: Partial<EmailData>) => {
    await sendOnce(ctx, { kind, key: `${kind}:${key}`, to: after.email, lang, data: { ...base, ...data }, familyId: family._id });
    await sendOnce(ctx, {
      kind: adminKind,
      key: `${adminKind}:${key}`,
      lang: "fr",
      data: { ...base, ...data, date: dayIn(adminKind === "adminPaymentFailed" ? graceEnd(after) : after.periodEnd, "fr") },
      familyId: family._id,
    });
  };
  const sub = after.subscriptionId ?? "none";
  // Paid after the trial, or a subscription taken again without trial
  if (after.status === "active" && (!before || before.status === "trialing" || before.status === "canceled")) {
    const subscribers = (await ctx.db.query("families").collect()).filter((f) => f.billing?.status === "active").length;
    await send("confirmed", "adminConverted", sub, { date: dayIn(after.periodEnd, lang), link: `${site}/#/`, subscribers });
  }
  if (after.status === "past_due" && before?.status !== "past_due")
    await send("paymentFailed", "adminPaymentFailed", `${sub}:${after.pastDueSince}`, {
      date: dayIn(graceEnd(after), lang),
      link: `${site}/#/reglages`,
    });
  const resigned =
    (after.cancelAtPeriodEnd && !before?.cancelAtPeriodEnd) ||
    (after.status === "canceled" && !!before && before.status !== "canceled" && !before.cancelAtPeriodEnd);
  if (resigned) await send("canceled", "adminCanceled", sub, { date: dayIn(after.periodEnd, lang), link: `${site}/#/reglages` });
}

/** Last day of full access after a failed renewal. */
const graceEnd = (b: { pastDueSince?: number }) => (b.pastDueSince ?? Date.now()) + GRACE_DAYS * DAY;

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
      if (family && !family.deleting) await applySubscription(ctx, family, sub);
      return signup.familyId;
    }
    const { familyId } = await createFamily(ctx, {
      name: await freeName(ctx, signup.familyName),
      admin: signup.adminName,
    });
    // The family speaks the language chosen on the form (before its first e-mails)
    if (signup.lang === "de") {
      const admin = await ctx.db
        .query("members")
        .withIndex("by_family", (q) => q.eq("familyId", familyId))
        .first();
      if (admin) await ctx.db.patch(admin._id, { lang: "de" });
    }
    await applySubscription(ctx, (await ctx.db.get(familyId))!, sub);
    // Welcome e-mail: its own link to the admin's first password, for 7 days
    const emailToken = randomHex();
    await ctx.db.patch(signup._id, { familyId, emailHash: await sha256(emailToken) });
    const family = (await ctx.db.get(familyId))!;
    const site = siteUrl();
    const data = {
      familyName: family.name,
      adminName: signup.adminName,
      date: dayIn(sub.periodEnd, signup.lang),
      link: `${site}/#/bienvenue?session_id=${sessionId}&k=${emailToken}`,
      loginLink: `${site}/#/f/${family.slug}`,
      email: sub.email,
      lang: signup.lang,
    };
    await sendOnce(ctx, { kind: "welcome", key: `welcome:${sessionId}`, to: sub.email, lang: signup.lang, data, familyId });
    await sendOnce(ctx, {
      kind: "adminSignup",
      key: `adminSignup:${sessionId}`,
      lang: "fr",
      data: { ...data, date: dayIn(sub.periodEnd, "fr"), link: undefined },
      familyId,
    });
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
    // Being deleted: its subscription is stopped on purpose, no e-mail about it
    if (family.deleting) return true;
    await applySubscription(ctx, family, sub);
    return true;
  },
});

/** A Checkout of an existing family paid after that family was deleted: nobody to serve. */
export const orphanSignup = internalQuery({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) => {
    const signup = await ctx.db
      .query("signups")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .unique();
    if (!signup?.familyId) return false;
    const family = await ctx.db.get(signup.familyId);
    return !family || family.deleting === true;
  },
});

/** The customer's e-mail changed at Stripe (portal): the family's copy follows. */
export const updateCustomerEmail = internalMutation({
  args: { customerId: v.string(), email: v.optional(v.string()) },
  handler: async (ctx, { customerId, email }) => {
    // Few families: a scan is enough, and customers of other products match none
    const family = (await ctx.db.query("families").collect()).find(
      (f) => f.billing?.customerId === customerId,
    );
    if (!family?.billing || family.deleting || !email) return false;
    await ctx.db.patch(family._id, { billing: { ...family.billing, email: email.slice(0, 200) } });
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
    if (!signup?.familyId) return null;
    const hash = await sha256(claimSecret);
    // The browser that signed up: a day; the welcome e-mail's link: 7 days
    const hours =
      hash === signup.claimHash ? CLAIM_HOURS : hash === signup.emailHash ? EMAIL_LINK_HOURS : null;
    if (hours === null) return null;
    const family = await ctx.db.get(signup.familyId);
    if (!family) return null;
    if (Date.now() - signup.createdAt > hours * HOUR)
      return { slug: family.slug, invite: null };
    const admin = await ctx.db
      .query("members")
      .withIndex("by_family", (q) => q.eq("familyId", family._id))
      .filter((q) => q.eq(q.field("role"), "admin"))
      .first();
    if (!admin || admin.passwordHash)
      return { slug: family.slug, invite: null };
    // Used at once by the return page: a day is enough, never longer than the link
    return { slug: family.slug, invite: await createInvite(ctx, admin, 1) };
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
    // E-mails sent: kept 13 months (a year of subscription and its renewal), no longer
    for (const e of await ctx.db.query("emailLog").collect()) {
      if (now - e.at > 395 * 24 * HOUR) {
        await ctx.db.delete(e._id);
        removed++;
      }
    }
    return { removed };
  },
});

/** The admin's family, for a Checkout or the Stripe portal; read-only families may reactivate. */
export const familyForBilling = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const me = await requireMember(ctx, token);
    assertAdmin(me);
    return {
      familyId: me.familyId,
      familyName: me.family.name,
      adminName: me.member.name,
      lang: me.member.lang ?? ("fr" as const),
      customerId: me.family.billing?.customerId ?? null,
      status: me.family.billing?.status ?? null,
      // The free trial is for the first subscription only
      hadSubscription: !!me.family.billing,
      // Offered without PA ever choosing: subscribing must not take the gift away
      offeredImplicitly: me.family.offered === undefined && !me.family.billing,
    };
  },
});

/** An offered family that subscribes anyway stays offered (its access never depends on paying). */
export const keepOffered = internalMutation({
  args: { familyId: v.id("families") },
  handler: async (ctx, { familyId }) => {
    const family = await ctx.db.get(familyId);
    if (family && family.offered === undefined && !family.billing) await ctx.db.patch(familyId, { offered: true });
  },
});

/** A family's own Checkout pages: a few an hour, so one family cannot use up the site's limit. */
export const allowFamilyCheckout = internalMutation({
  args: { familyId: v.id("families") },
  handler: async (ctx, { familyId }) =>
    (await reserve(ctx, `billing:family:${familyId}`, FAMILY_CHECKOUT_LIMIT, Date.now())).allowed,
});

/** Gestion, Abonnement: the family's subscription, for its admins. */
export const mine = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const me = await requireMember(ctx, token);
    assertAdmin(me);
    const billing = me.family.billing;
    return {
      offered: isOffered(me.family),
      status: billing?.status ?? null,
      periodEnd: billing?.periodEnd ?? null,
      cancelAtPeriodEnd: billing?.cancelAtPeriodEnd ?? false,
      pastDueSince: billing?.pastDueSince ?? null,
      email: billing?.email ?? null,
      hasCustomer: !!billing?.customerId,
    };
  },
});

/** A random secret for a link (hexadecimal, 32 bytes). */
function randomHex() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Daily: the e-mail 2 to 3 days before the end of a free trial (Stripe sends none
 * for so short a trial), once per subscription.
 */
export const trialReminders = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const site = siteUrl();
    let queued = 0;
    for (const family of await ctx.db.query("families").collect()) {
      const b = family.billing;
      if (b?.status !== "trialing" || b.cancelAtPeriodEnd || !b.periodEnd) continue;
      const left = b.periodEnd - now;
      if (left <= 0 || left > 3 * DAY) continue;
      const { adminName, lang } = await familyContact(ctx, family._id);
      await sendOnce(ctx, {
        kind: "trialEnding",
        key: `trialEnding:${b.subscriptionId ?? family._id}`,
        to: b.email,
        lang,
        data: { familyName: family.name, adminName, date: dayIn(b.periodEnd, lang), link: `${site}/#/reglages` },
        familyId: family._id,
      });
      queued++;
    }
    return { queued };
  },
});
