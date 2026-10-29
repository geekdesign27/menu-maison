import { mutation, query, type QueryCtx } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { requireMember } from "./lib";
import { accessLink } from "./access";
import { createFamily } from "./families";
import { isUnlimited, usageOf } from "./aiBudget";
import { capsOf } from "./domain/aiBudget";
import { accessOf, isOffered } from "./domain/billing";
import { EMAIL_KINDS, renderEmail } from "./domain/emails";
import { assertInt, assertPositive } from "./lib";

/**
 * Super-admin space (PA): the only functions that see several families. They
 * read `ctx.db` across families on purpose, and return counts and names only,
 * never a family's recipes, lists or receipts.
 */
export async function requireSuperadmin(ctx: QueryCtx, token: string) {
  const me = await requireMember(ctx, token);
  if (me.member.superadmin !== true)
    throw new ConvexError("Réservé au super-admin.");
  return me;
}

/** Every family with its members' access and a few usage figures. */
export const families = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const me = await requireSuperadmin(ctx, token);
    const [families, sessions] = await Promise.all([
      ctx.db.query("families").collect(),
      ctx.db.query("sessions").collect(),
    ]);
    return Promise.all(
      families.map(async (f) => {
        const [members, recipes, usage, unlimited] = await Promise.all([
          ctx.db
            .query("members")
            .withIndex("by_family", (q) => q.eq("familyId", f._id))
            .collect(),
          ctx.db
            .query("recipes")
            .withIndex("by_family", (q) => q.eq("familyId", f._id))
            .collect(),
          usageOf(ctx, f._id),
          isUnlimited(ctx, f._id),
        ]);
        const caps = capsOf(f, unlimited);
        const signIns = sessions
          .filter((s) => s.familyId === f._id)
          .map((s) => s.createdAt);
        return {
          _id: f._id,
          name: f.name,
          slug: f.slug,
          suspended: f.suspended,
          createdAt: f.createdAt,
          isMine: f._id === me.familyId,
          members: members
            .sort((a, b) => a.order - b.order)
            .map((m) => ({
              _id: m._id,
              name: m.name,
              username: m.username ?? null,
              admin: m.role === "admin",
              activated: !!m.passwordHash,
            })),
          recipes: recipes.filter((r) => !r.archived).length,
          lastSignIn: signIns.length ? Math.max(...signIns) : null,
          // Subscription: offered, or Stripe's state; the e-mail stays out of the list
          subscription: {
            offered: isOffered(f),
            explicit: f.offered !== undefined,
            status: f.billing?.status ?? null,
            periodEnd: f.billing?.periodEnd ?? null,
            cancelAtPeriodEnd: f.billing?.cancelAtPeriodEnd ?? false,
            access: accessOf(f, Date.now()),
          },
          // AI this month (Swiss time) against the family's caps, null: never blocked
          ai: {
            claudeUsd: usage?.claudeUsd ?? 0,
            claudeCalls: usage?.claudeCalls ?? 0,
            dictations: usage?.dictations ?? 0,
            capUsd: caps.claudeUsd,
            dictationCap: caps.dictations,
            customCaps: f.aiCapUsd !== undefined || f.dictationCap !== undefined,
          },
        };
      }),
    );
  },
});

/** Creates a family and returns its admin's pseudo and activation link token. */
export const createOne = mutation({
  args: {
    token: v.string(),
    name: v.string(),
    admin: v.string(),
    username: v.optional(v.string()),
  },
  handler: async (ctx, { token, ...args }) => {
    await requireSuperadmin(ctx, token);
    const { slug, username, invite } = await createFamily(ctx, args);
    return { slug, username, invite };
  },
});

/** A new link for an admin of another family (forgotten password, lost link). */
export const adminLink = mutation({
  args: { token: v.string(), memberId: v.id("members") },
  handler: async (ctx, { token, memberId }) => {
    const me = await requireSuperadmin(ctx, token);
    const member = await ctx.db.get(memberId);
    if (!member || member.role !== "admin")
      throw new ConvexError("Admin introuvable.");
    // Within one's own family, the family screen does it (and not for oneself)
    if (member.familyId === me.familyId)
      throw new ConvexError("Pour ta famille, passe par Réglages, Profils.");
    // Another super-admin's access is not reset from here
    if (member.superadmin) throw new ConvexError("Admin introuvable.");
    if (!member.username) throw new ConvexError("Cet admin n'a pas de pseudo.");
    const family = await ctx.db.get(member.familyId);
    if (!family || family.suspended)
      throw new ConvexError("Réactive d'abord la famille.");
    return accessLink(ctx, member);
  },
});

/**
 * Suspends a family or lifts it. Suspending signs every device out and drops
 * pending links (a stolen phone stays out after the family is lifted); the
 * data are kept.
 */
export const setSuspended = mutation({
  args: {
    token: v.string(),
    familyId: v.id("families"),
    suspended: v.boolean(),
  },
  handler: async (ctx, { token, familyId, suspended }) => {
    const me = await requireSuperadmin(ctx, token);
    if (familyId === me.familyId)
      throw new ConvexError("Tu ne peux pas suspendre ta propre famille.");
    if (!(await ctx.db.get(familyId)))
      throw new ConvexError("Famille introuvable.");
    await ctx.db.patch(familyId, { suspended });
    if (!suspended) return;
    // Small tables, without a family index: read once and filter
    for (const s of await ctx.db.query("sessions").collect())
      if (s.familyId === familyId) await ctx.db.delete(s._id);
    for (const i of await ctx.db.query("invites").collect())
      if (i.familyId === familyId) await ctx.db.delete(i._id);
  },
});

/**
 * Monthly AI caps of a family: Claude in USD and number of dictations; null
 * goes back to the defaults (2 USD, 60). The super-admin's family is never blocked.
 */
export const setAiCaps = mutation({
  args: {
    token: v.string(),
    familyId: v.id("families"),
    capUsd: v.union(v.number(), v.null()),
    dictationCap: v.union(v.number(), v.null()),
  },
  handler: async (ctx, { token, familyId, capUsd, dictationCap }) => {
    await requireSuperadmin(ctx, token);
    if (!(await ctx.db.get(familyId))) throw new ConvexError("Famille introuvable.");
    if (capUsd !== null && capUsd !== 0) assertPositive(capUsd, 100, "Budget Claude");
    if (dictationCap !== null) assertInt(dictationCap, 0, 1000, "Dictées par mois");
    await ctx.db.patch(familyId, {
      aiCapUsd: capUsd ?? undefined,
      dictationCap: dictationCap ?? undefined,
    });
  },
});

/**
 * Offers the app to a family (relatives, friends) or withdraws the offer. A
 * family without subscription then only reads until it subscribes. Not for the
 * super-admin's own family.
 */
export const setOffered = mutation({
  args: { token: v.string(), familyId: v.id("families"), offered: v.boolean() },
  handler: async (ctx, { token, familyId, offered }) => {
    const me = await requireSuperadmin(ctx, token);
    if (familyId === me.familyId) throw new ConvexError("Ta famille reste offerte.");
    if (!(await ctx.db.get(familyId))) throw new ConvexError("Famille introuvable.");
    await ctx.db.patch(familyId, { offered });
  },
});

/**
 * Every e-mail rendered with example data, for PA to check before any real
 * one leaves, and whether sending is set up (never the keys themselves).
 */
export const emailPreviews = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireSuperadmin(ctx, token);
    const site = "https://menumaison.ch";
    const sample = {
      familyName: "Dupont",
      adminName: "Marc",
      date: "",
      link: `${site}/#/bienvenue?session_id=cs_test_exemple&k=${"0".repeat(64)}`,
      loginLink: `${site}/#/f/dupont`,
      email: "marc@exemple.ch",
      subscribers: 12,
    };
    const day = { fr: "mercredi 4 novembre", de: "Mittwoch, 4. November" } as const;
    return {
      ready: {
        resend: !!process.env.RESEND_API_KEY,
        from: process.env.EMAIL_FROM ?? "Menu Maison <bonjour@menumaison.ch>",
        alerts: !!process.env.ADMIN_ALERT_EMAIL,
      },
      emails: EMAIL_KINDS.flatMap((kind) =>
        (["fr", "de"] as const).map((lang) => ({
          kind,
          lang,
          ...renderEmail(kind, { ...sample, date: day[lang], lang }, lang),
        })),
      ),
    };
  },
});
