// Guide for new members: what the signed-in member already did (for the
// « Premiers pas » checklist), the end of their tour, and the family switch.
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  assertAdmin,
  DEFAULT_SETTINGS,
  requireMember,
  requireMemberWriter,
} from "./lib";
import {
  habitualsToStamp,
  ONBOARDING_HABITUAL,
  type OnboardingFacts,
} from "./domain/onboarding";

/** Counts of the member's own actions; the steps are worked out by domain/onboarding. */
export const facts = query({
  args: { token: v.string() },
  handler: async (ctx, { token }): Promise<OnboardingFacts> => {
    const { db, member } = await requireMember(ctx, token);
    const mine = (q: any) => q.eq(q.field("memberId"), member._id);
    const [likes, wishes, meals, checks] = await Promise.all([
      db.query("likes").filter(mine).collect(),
      db.query("wishes").filter(mine).collect(),
      db.query("meals").collect(),
      db
        .query("shoppingChecks")
        .filter((q) => q.eq(q.field("checkedBy"), member._id))
        .collect(),
    ]);
    return {
      hasPhoto: !!member.imageId,
      likes: likes.length,
      wishes: wishes.length,
      mealsAdded: meals.filter((m) => m.addedBy === member._id).length,
      itemsChecked: checks.length,
      // Back to « prévu » is not telling what happened to the dish
      statusesSet: meals.filter(
        (m) => m.statusBy === member._id && m.status !== "prévu",
      ).length,
    };
  },
});

/** The member finished or skipped the tour (also « Plus tard » on the welcome card). */
export const finish = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const { db, member } = await requireMemberWriter(ctx, token);
    // Habitués stay habitués when they replay the guide: no checklist for them
    if (member.onboardingDoneAt === ONBOARDING_HABITUAL) return;
    await db.patch(member._id, { onboardingDoneAt: Date.now() });
  },
});

/**
 * Admin: switches the guide for new members on or off. Switching it on marks
 * the accounts already in use as habitués, so only the next ones get the tour.
 */
export const setEnabled = mutation({
  args: { token: v.string(), enabled: v.boolean() },
  handler: async (ctx, { token, enabled }) => {
    const me = await requireMemberWriter(ctx, token);
    assertAdmin(me);
    const { db } = me;
    const row = await db.query("settings").first();
    if (row) await db.patch(row._id, { onboarding: enabled });
    else
      await db.insert("settings", { ...DEFAULT_SETTINGS, onboarding: enabled });
    if (!enabled) return;
    const members = await db.query("members").collect();
    const habituals = habitualsToStamp(
      members.map((m) => ({ ...m, hasPassword: !!m.passwordHash })),
    );
    for (const m of habituals)
      await db.patch(m._id, { onboardingDoneAt: ONBOARDING_HABITUAL });
  },
});
