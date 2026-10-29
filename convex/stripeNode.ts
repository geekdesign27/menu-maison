"use node";
// Every call to Stripe: the price, Checkout, the return page and the webhook.
// Keys only from Convex's environment (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
// SITE_URL, optional STRIPE_PRICE_ID), never in the code. Billing state is
// written by convex/billing.ts. The Stripe account also sells other products:
// only sessions and subscriptions marked « menu-maison » are ours.
import { createHash, randomBytes } from "node:crypto";
import Stripe from "stripe";
import { action, internalAction, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { ConvexError, v } from "convex/values";
import {
  APP_METADATA,
  LIVE_STRIPE_STATUSES,
  PRICE_CHF,
  PRICE_LOOKUP_KEY,
  PAYMENTS_CLOSED,
  SIGNUP_CLOSED,
  signupOpen,
  signupProblem,
  TRIAL_DAYS,
} from "./domain/billing";
import { deleteConfirmMatches } from "./domain/account";
import { checkPassword } from "./passwordCheck";

const NOT_CONFIGURED = "Le paiement n'est pas encore configuré.";
const BUSY =
  "Trop d'inscriptions en même temps. Réessaie dans quelques minutes.";
const INVALID_LINK = "Lien invalide.";
const ALREADY_SUBSCRIBED = "Un abonnement existe déjà : gère-le avec « Gérer mon abonnement ».";
const CHECKOUT_FAILED = "La page de paiement n'a pas pu s'ouvrir. Réessaie dans un moment.";
// A Checkout page left open longer is closed by Stripe (30 minutes is its minimum)
const CHECKOUT_MINUTES = 30;

function stripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new ConvexError(NOT_CONFIGURED);
  return new Stripe(key);
}

/** The app's address for Stripe's return links; required, so a test deployment never sends to production. */
function siteUrl() {
  const url = process.env.SITE_URL;
  if (!url) throw new ConvexError(NOT_CONFIGURED);
  return url.replace(/\/+$/, "");
}

const isOurs = (metadata: Stripe.Metadata | null | undefined) =>
  metadata?.app === APP_METADATA.app;

/** The yearly price: STRIPE_PRICE_ID once set, else found (or created) by its lookup key. */
async function priceId(client: Stripe): Promise<string> {
  if (process.env.STRIPE_PRICE_ID) return process.env.STRIPE_PRICE_ID;
  const found = await client.prices.list({
    lookup_keys: [PRICE_LOOKUP_KEY],
    active: true,
    limit: 1,
  });
  if (found.data[0]) return found.data[0].id;
  const product = await client.products.create({
    name: "Menu Maison",
    description:
      "Menus de la semaine, recettes et courses en famille. Abonnement annuel par famille.",
    // Shown on the card statement, apart from the account's other products
    statement_descriptor: "MENU MAISON",
    metadata: APP_METADATA,
  });
  const price = await client.prices.create({
    product: product.id,
    currency: "chf",
    unit_amount: PRICE_CHF * 100,
    recurring: { interval: "year" },
    lookup_key: PRICE_LOOKUP_KEY,
    metadata: APP_METADATA,
  });
  return price.id;
}

/** Setup: creates the product and price if needed; the id returned goes in STRIPE_PRICE_ID. */
export const ensurePrice = internalAction({
  args: {},
  handler: async () => priceId(stripe()),
});

/**
 * Sign-up form: the Stripe Checkout page to start the trial, with the family's
 * details. `claimSecret` stays in this browser: only it gets the admin's first link.
 */
export const startCheckout = action({
  args: {
    familyName: v.string(),
    adminName: v.string(),
    lang: v.union(v.literal("fr"), v.literal("de")),
  },
  handler: async (ctx, args): Promise<{ url: string; claimSecret: string }> => {
    if (!signupOpen(process.env.SIGNUP_OPEN)) throw new ConvexError(SIGNUP_CLOSED);
    const problem = signupProblem(args);
    if (problem) throw new ConvexError(problem);
    const client = stripe();
    const site = siteUrl();
    if (
      !(await ctx.runMutation(internal.billing.allowAttempt, {
        kind: "checkout",
      }))
    )
      throw new ConvexError(BUSY);
    const session = await client.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: await priceId(client), quantity: 1 }],
      subscription_data: {
        trial_period_days: TRIAL_DAYS,
        metadata: APP_METADATA,
      },
      metadata: APP_METADATA,
      payment_method_collection: "always",
      locale: args.lang,
      expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_MINUTES * 60,
      success_url: `${site}/#/bienvenue?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/#/tarif`,
    });
    if (!session.url)
      throw new ConvexError(
        "La page de paiement n'a pas pu s'ouvrir. Réessaie dans un moment.",
      );
    const claimSecret = randomBytes(32).toString("hex");
    await ctx.runMutation(internal.billing.recordSignup, {
      sessionId: session.id,
      ...args,
      claimHash: createHash("sha256").update(claimSecret).digest("hex"),
    });
    return { url: session.url, claimSecret };
  },
});

/**
 * Gestion, Abonnement: an existing family subscribes (offered family wishing to
 * pay, family whose subscription ended). The free trial only for a first one.
 */
export const startFamilyCheckout = action({
  args: { token: v.string() },
  handler: async (ctx, { token }): Promise<{ url: string }> => {
    const family = await ctx.runQuery(internal.billing.familyForBilling, { token });
    if (!signupOpen(process.env.SIGNUP_OPEN)) throw new ConvexError(PAYMENTS_CLOSED);
    // One subscription per family: a second one would charge twice
    if (family.status && family.status !== "canceled") throw new ConvexError(ALREADY_SUBSCRIBED);
    const client = stripe();
    const site = siteUrl();
    if (!(await ctx.runMutation(internal.billing.allowFamilyCheckout, { familyId: family.familyId })))
      throw new ConvexError(BUSY);
    if (!(await ctx.runMutation(internal.billing.allowAttempt, { kind: "checkout" }))) throw new ConvexError(BUSY);
    let customer = family.customerId;
    if (customer) {
      // Stripe has the last word: an older subscription still alive there
      try {
        const subs = await client.subscriptions.list({ customer, status: "all", limit: 20 });
        if (subs.data.some((sub) => isOurs(sub.metadata) && LIVE_STRIPE_STATUSES.includes(sub.status)))
          throw new ConvexError(ALREADY_SUBSCRIBED);
      } catch (e) {
        if (e instanceof ConvexError) throw e;
        // Customer deleted in Stripe: Checkout creates a new one
        customer = null;
      }
    }
    if (family.offeredImplicitly) await ctx.runMutation(internal.billing.keepOffered, { familyId: family.familyId });
    let session: Stripe.Checkout.Session;
    try {
      session = await client.checkout.sessions.create({
        mode: "subscription",
        line_items: [{ price: await priceId(client), quantity: 1 }],
        subscription_data: {
          ...(family.hadSubscription ? {} : { trial_period_days: TRIAL_DAYS }),
          metadata: APP_METADATA,
        },
        metadata: APP_METADATA,
        ...(customer ? { customer } : {}),
        payment_method_collection: "always",
        locale: family.lang,
        expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_MINUTES * 60,
        success_url: `${site}/#/bienvenue?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${site}/#/gestion/abonnement`,
      });
    } catch {
      throw new ConvexError(CHECKOUT_FAILED);
    }
    if (!session.url) throw new ConvexError(CHECKOUT_FAILED);
    await ctx.runMutation(internal.billing.recordSignup, {
      sessionId: session.id,
      familyName: family.familyName,
      adminName: family.adminName,
      lang: family.lang,
      // No first link to hand out: the admin is already signed in
      claimHash: createHash("sha256").update(randomBytes(32)).digest("hex"),
      familyId: family.familyId,
    });
    return { url: session.url };
  },
});

/**
 * The portal of Menu Maison's customers, apart from the account's other
 * products: card, invoices, e-mail and resigning at the end of the year, never
 * a change of plan. STRIPE_PORTAL_CONFIG_ID once set, else found or created.
 */
async function portalConfiguration(client: Stripe): Promise<string> {
  if (process.env.STRIPE_PORTAL_CONFIG_ID) return process.env.STRIPE_PORTAL_CONFIG_ID;
  const found = await client.billingPortal.configurations.list({ active: true, limit: 100 });
  const ours = found.data.find((c) => isOurs(c.metadata));
  if (ours) return ours.id;
  const created = await client.billingPortal.configurations.create({
    business_profile: { headline: "Menu Maison : ton abonnement" },
    features: {
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      customer_update: { enabled: true, allowed_updates: ["email", "address"] },
      subscription_cancel: {
        enabled: true,
        mode: "at_period_end",
        cancellation_reason: {
          enabled: true,
          options: ["too_expensive", "unused", "missing_features", "too_complex", "other"],
        },
      },
      subscription_update: { enabled: false },
    },
    metadata: APP_METADATA,
  });
  return created.id;
}

/** Setup: the portal configuration of Menu Maison; the id returned goes in STRIPE_PORTAL_CONFIG_ID. */
export const ensurePortalConfig = internalAction({
  args: {},
  handler: async () => portalConfiguration(stripe()),
});

/** Gestion, Abonnement: Stripe's own page for the card, the invoices and resigning. */
export const openPortal = action({
  args: { token: v.string() },
  handler: async (ctx, { token }): Promise<{ url: string }> => {
    const family = await ctx.runQuery(internal.billing.familyForBilling, { token });
    if (!family.customerId) throw new ConvexError("Aucun abonnement à gérer pour l'instant.");
    try {
      const client = stripe();
      const portal = await client.billingPortal.sessions.create({
        configuration: await portalConfiguration(client),
        customer: family.customerId,
        locale: family.lang,
        return_url: `${siteUrl()}/#/gestion/abonnement`,
      });
      return { url: portal.url };
    } catch (e) {
      if (e instanceof ConvexError) throw e;
      throw new ConvexError("La page de gestion de l'abonnement n'a pas pu s'ouvrir. Réessaie dans un moment.");
    }
  },
});

/** The subscription's details as stored on the family. */
function subscriptionFields(sub: Stripe.Subscription, email?: string | null) {
  // From this API version, the period lives on the subscription's items
  const itemEnd = sub.items.data[0]?.current_period_end;
  const end =
    sub.status === "trialing" && sub.trial_end ? sub.trial_end : itemEnd;
  return {
    customerId:
      typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    subscriptionId: sub.id,
    email: email ?? undefined,
    stripeStatus: sub.status,
    periodEnd: end ? end * 1000 : undefined,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
  };
}

async function completeFromSession(
  ctx: ActionCtx,
  client: Stripe,
  session: Stripe.Checkout.Session,
) {
  if (!isOurs(session.metadata)) return null;
  if (
    session.mode !== "subscription" ||
    session.status !== "complete" ||
    !session.subscription
  )
    return null;
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription.id;
  const sub = await client.subscriptions.retrieve(subscriptionId);
  const familyId = await ctx.runMutation(internal.billing.completeSignup, {
    sessionId: session.id,
    ...subscriptionFields(sub, session.customer_details?.email),
  });
  // Checked after: either the family got this subscription (a deletion now stops
  // it), or it was already gone or being deleted: stopped here, nothing more is charged
  if (await ctx.runQuery(internal.billing.orphanSignup, { sessionId: session.id })) {
    if (sub.status !== "canceled") await client.subscriptions.cancel(sub.id);
    return null;
  }
  return familyId;
}

/**
 * Return page after Checkout: checks with Stripe that the session is paid for,
 * creates the family if the webhook has not yet, and gives the admin's first link.
 */
export const claim = action({
  args: { sessionId: v.string(), claimSecret: v.string() },
  handler: async (
    ctx,
    { sessionId, claimSecret },
  ): Promise<{
    state: "pending" | "ready";
    slug: string | null;
    invite: string | null;
  }> => {
    if (
      !/^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(sessionId) ||
      !/^[0-9a-f]{64}$/.test(claimSecret)
    )
      throw new ConvexError(INVALID_LINK);
    if (
      !(await ctx.runMutation(internal.billing.allowAttempt, { kind: "claim" }))
    )
      throw new ConvexError(BUSY);
    const client = stripe();
    let session: Stripe.Checkout.Session;
    try {
      session = await client.checkout.sessions.retrieve(sessionId);
    } catch {
      // Stripe's own message would name its objects: a plain one instead
      throw new ConvexError(INVALID_LINK);
    }
    const familyId = await completeFromSession(ctx, client, session);
    if (!familyId) return { state: "pending", slug: null, invite: null };
    const link = await ctx.runMutation(internal.billing.firstLink, {
      sessionId,
      claimSecret,
    });
    return {
      state: "ready",
      slug: link?.slug ?? null,
      invite: link?.invite ?? null,
    };
  },
});

/**
 * Stripe's webhook, after convex/http.ts: signature checked, events of other
 * products ignored, each event recorded only once handled (a failure answers
 * 500 and Stripe sends it again). The subscription is read again from Stripe:
 * events may arrive out of order.
 */
export const handleWebhook = internalAction({
  args: { payload: v.string(), signature: v.string() },
  handler: async (
    ctx,
    { payload, signature },
  ): Promise<{ ok: boolean; status: number }> => {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) return { ok: false, status: 500 };
    const client = stripe();
    let event: Stripe.Event;
    try {
      event = await client.webhooks.constructEventAsync(
        payload,
        signature,
        secret,
      );
    } catch {
      return { ok: false, status: 400 };
    }
    if (await ctx.runQuery(internal.billing.seenEvent, { eventId: event.id }))
      return { ok: true, status: 200 };
    switch (event.type) {
      case "checkout.session.completed":
        if (!isOurs(event.data.object.metadata))
          return { ok: true, status: 200 };
        await completeFromSession(ctx, client, event.data.object);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        if (!isOurs(event.data.object.metadata))
          return { ok: true, status: 200 };
        const fresh = await client.subscriptions.retrieve(event.data.object.id);
        await ctx.runMutation(
          internal.billing.updateSubscription,
          subscriptionFields(fresh),
        );
        break;
      }
      case "customer.updated": {
        // The customer changed their e-mail in the portal: Stripe's receipts and ours agree
        const customer = event.data.object;
        await ctx.runMutation(internal.billing.updateCustomerEmail, {
          customerId: customer.id,
          email: customer.email ?? undefined,
        });
        break;
      }
      default:
        // Not used: receipts and invoices stay with Stripe
        return { ok: true, status: 200 };
    }
    await ctx.runMutation(internal.billing.markEvent, {
      eventId: event.id,
      type: event.type,
    });
    return { ok: true, status: 200 };
  },
});

/** Every live subscription of ours for this customer, plus the one stored on the family. */
async function liveSubscriptions(client: Stripe, customerId: string | null, stored: string | null) {
  const ids = new Set<string>();
  if (customerId) {
    const subs = await client.subscriptions.list({ customer: customerId, status: "all", limit: 100 });
    for (const sub of subs.data)
      if (isOurs(sub.metadata) && LIVE_STRIPE_STATUSES.includes(sub.status)) ids.add(sub.id);
  }
  if (stored) {
    const sub = await client.subscriptions.retrieve(stored).catch(() => null);
    if (sub && sub.status !== "canceled") ids.add(sub.id);
  }
  return [...ids];
}

/**
 * Gestion, Données: deletes the family for good, confirmed by its name and the
 * admin's password. Every subscription is stopped at Stripe first (nothing more
 * is charged); if that fails, nothing is deleted.
 */
export const deleteFamily = action({
  args: { token: v.string(), confirmName: v.string(), password: v.string() },
  handler: async (ctx, { token, confirmName, password }): Promise<void> => {
    const target = await ctx.runQuery(internal.familyData.deletionTarget, { token });
    if (!deleteConfirmMatches(confirmName, target.familyName))
      throw new ConvexError("Le nom tapé ne correspond pas à celui de la famille.");
    await checkPassword(ctx, target.memberId, target.passwordHash, password);
    await ctx.runMutation(internal.familyData.markDeleting, { familyId: target.familyId, deleting: true });
    if (target.customerId || target.subscriptionId || target.openCheckouts.length) {
      try {
        const client = stripe();
        // A payment page still open would subscribe the family after its deletion
        for (const id of target.openCheckouts)
          await client.checkout.sessions.expire(id).catch(() => undefined);
        for (const id of await liveSubscriptions(client, target.customerId, target.subscriptionId))
          await client.subscriptions.cancel(id);
      } catch {
        await ctx.runMutation(internal.familyData.markDeleting, { familyId: target.familyId, deleting: false });
        throw new ConvexError("L'abonnement n'a pas pu être arrêté : rien n'a été supprimé. Réessaie dans un moment.");
      }
    }
    await ctx.runMutation(internal.familyData.finishDeletion, {
      familyId: target.familyId,
      adminName: target.adminName,
    });
  },
});
