// The family's own data: a full export for its admins, and its deletion
// (Stripe is stopped first by stripeNode.deleteFamily, then everything goes).
import {
  internalMutation,
  internalQuery,
  query,
  type MutationCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { ConvexError, v } from "convex/values";
import { assertAdmin, requireMember, type FamilyTable } from "./lib";
import { exportable } from "./domain/account";
import { formatDayLong } from "./domain/dates";
import { sendOnce } from "./email";

/** Every table holding one family's rows, each with a « by_family » index. */
export const FAMILY_TABLES = [
  "settings",
  "members",
  "aisles",
  "ingredients",
  "recipes",
  "likes",
  "stores",
  "meals",
  "templates",
  "shoppingChecks",
  "shoppingExtras",
  "staples",
  "stockSkips",
  "homeStock",
  "wishes",
  "chainPrices",
  "receiptAliases",
] as const satisfies readonly FamilyTable[];

// Rows deleted per table and per run: one run stays far below Convex's limits
const PURGE_BATCH = 200;

/** Gestion, Données: everything the family stored, as one JSON for its admins. */
export const exportAll = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const me = await requireMember(ctx, token);
    assertAdmin(me);
    const tables: Record<string, Record<string, unknown>[]> = {};
    for (const table of FAMILY_TABLES) {
      const rows = await me.db.query(table).collect();
      tables[table] = await Promise.all(
        rows.map(async (row) => {
          const imageId = (row as { imageId?: Id<"_storage"> }).imageId;
          return {
            ...exportable(row),
            ...(imageId ? { imageUrl: await ctx.storage.getUrl(imageId) } : {}),
          };
        }),
      );
    }
    return {
      app: "Menu Maison",
      exportedAt: new Date().toISOString(),
      family: { name: me.family.name, slug: me.family.slug },
      tables,
    };
  },
});

/** The admin's family, checked before Stripe is stopped. */
export const deletionTarget = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const me = await requireMember(ctx, token);
    assertAdmin(me);
    const members = await me.db.query("members").collect();
    // PA's own family runs the site: it is never deleted from the app
    if (members.some((m) => m.superadmin))
      throw new ConvexError(
        "Cette famille gère Menu Maison : elle ne se supprime pas depuis l'app.",
      );
    const billing = me.family.billing;
    // Checkout pages of this family opened within the last hour (Stripe closes them after 30 minutes)
    const openCheckouts = (await ctx.db.query("signups").collect())
      .filter((s) => s.familyId === me.familyId && Date.now() - s.createdAt < 60 * 60 * 1000)
      .map((s) => s.sessionId);
    return {
      familyId: me.familyId,
      openCheckouts,
      memberId: me.member._id,
      passwordHash: me.member.passwordHash ?? "",
      familyName: me.family.name,
      adminName: me.member.name,
      customerId: billing?.customerId ?? null,
      subscriptionId:
        billing?.status !== "canceled"
          ? (billing?.subscriptionId ?? null)
          : null,
    };
  },
});

/** While Stripe is being stopped, its events leave the family alone (no « résilié » e-mail). */
export const markDeleting = internalMutation({
  args: { familyId: v.id("families"), deleting: v.boolean() },
  handler: async (ctx, { familyId, deleting }) => {
    const family = await ctx.db.get(familyId);
    // Once closed by finishDeletion, a deletion is never undone (a second
    // request failing at Stripe must not stop the purge)
    if (!family || (!deleting && family.suspended)) return;
    await ctx.db.patch(familyId, { deleting: deleting || undefined });
  },
});

/** The addresses to tell: the subscription's, then each admin's confirmed one. */
async function recipients(ctx: MutationCtx, family: Doc<"families">) {
  const admins = (
    await ctx.db
      .query("members")
      .withIndex("by_family", (q) => q.eq("familyId", family._id))
      .collect()
  ).filter((m) => m.role === "admin");
  const addresses = new Map<string, Doc<"members"> | undefined>();
  if (family.billing?.email)
    addresses.set(family.billing.email.toLowerCase(), admins[0]);
  for (const admin of admins)
    if (admin.email && !addresses.has(admin.email))
      addresses.set(admin.email, admin);
  return addresses;
}

/** Stripe stopped: the family closes at once, the e-mails leave, its data is purged in the background. */
export const finishDeletion = internalMutation({
  args: { familyId: v.id("families"), adminName: v.string() },
  handler: async (ctx, { familyId, adminName }) => {
    const family = await ctx.db.get(familyId);
    if (!family) return;
    await ctx.db.patch(familyId, { suspended: true, deleting: true });
    const now = Date.now();
    const day = (lang: "fr" | "de") =>
      formatDayLong(new Date(now).toISOString().slice(0, 10), lang);
    for (const [to, member] of await recipients(ctx, family)) {
      const lang = member?.lang ?? "fr";
      await sendOnce(ctx, {
        kind: "familyDeleted",
        key: `familyDeleted:${familyId}:${to}`,
        to,
        lang,
        data: { familyName: family.name, adminName, date: day(lang) },
      });
    }
    await sendOnce(ctx, {
      kind: "adminDeleted",
      key: `adminDeleted:${familyId}`,
      lang: "fr",
      data: {
        familyName: family.name,
        adminName,
        date: day("fr"),
        email: family.billing?.email,
      },
    });
    await ctx.scheduler.runAfter(0, internal.familyData.purgeFamily, {
      familyId,
    });
  },
});

/** Deletes a deleting family's rows, a batch at a time, then the family itself. */
export const purgeFamily = internalMutation({
  args: { familyId: v.id("families") },
  handler: async (ctx, { familyId }) => {
    const family = await ctx.db.get(familyId);
    if (!family?.deleting) return;
    let left = false;
    for (const table of FAMILY_TABLES) {
      const rows = await ctx.db
        .query(table)
        .withIndex("by_family" as never, (q: any) => q.eq("familyId", familyId))
        .take(PURGE_BATCH);
      if (rows.length === PURGE_BATCH) left = true;
      for (const row of rows) {
        const imageId = (row as { imageId?: Id<"_storage"> }).imageId;
        if (imageId) await ctx.storage.delete(imageId).catch(() => undefined);
        if (table === "members")
          await forgetMember(ctx, row._id as Id<"members">);
        await ctx.db.delete(row._id);
      }
    }
    const usage = await ctx.db
      .query("aiUsage")
      .withIndex("by_family", (q) => q.eq("familyId", familyId))
      .take(PURGE_BATCH);
    for (const row of usage) await ctx.db.delete(row._id);
    if (left || usage.length === PURGE_BATCH) {
      await ctx.scheduler.runAfter(0, internal.familyData.purgeFamily, {
        familyId,
      });
      return;
    }
    // Its sign-up record (family name, admin's first name) goes too
    for (const signup of (await ctx.db.query("signups").collect()).filter((s) => s.familyId === familyId))
      await ctx.db.delete(signup._id);
    await ctx.db.delete(familyId);
  },
});

/** A member's sessions and links go with them. */
async function forgetMember(ctx: MutationCtx, memberId: Id<"members">) {
  for (const table of ["sessions", "invites"] as const) {
    const rows = await ctx.db
      .query(table)
      .withIndex("by_member", (q) => q.eq("memberId", memberId))
      .collect();
    for (const row of rows) await ctx.db.delete(row._id);
  }
}
