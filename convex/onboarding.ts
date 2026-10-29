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

/**
 * Counts of the member's own actions, and of the family's for an admin; the
 * steps are worked out by domain/onboarding.
 */
export const facts = query({
  args: { token: v.string() },
  handler: async (ctx, { token }): Promise<OnboardingFacts> => {
    const { db, member } = await requireMember(ctx, token);
    const mine = (q: any) => q.eq(q.field("memberId"), member._id);
    const [likes, wishes, meals, checks] = await Promise.all([
      db.query("likes").filter(mine).collect(),
      db.query("wishes").filter(mine).collect(),
      db.query("meals").collect(),
      db.query("shoppingChecks").collect(),
    ]);
    const facts: OnboardingFacts = {
      hasEmail: !!member.email,
      hasPhoto: !!member.imageId,
      likes: likes.length,
      wishes: wishes.length,
      mealsAdded: meals.filter((m) => m.addedBy === member._id).length,
      itemsChecked: checks.filter((c) => c.checkedBy === member._id).length,
      // Back to « prévu » is not telling what happened to the dish
      statusesSet: meals.filter(
        (m) => m.statusBy === member._id && m.status !== "prévu",
      ).length,
    };
    if (member.role !== "admin") return facts;
    // Counts only: nothing about who the other members are
    const others = (await db.query("members").collect()).filter(
      (m) => m._id !== member._id,
    );
    facts.family = {
      otherMembers: others.length,
      othersJoined: others.filter((m) => !!m.passwordHash).length,
      mealsPlanned: meals.length,
      itemsChecked: checks.filter((c) => c.checked).length,
    };
    return facts;
  },
});

/**
 * The member finished or skipped the tour (also « Plus tard » on the welcome
 * card). With `checklistDone`, « Premiers pas » is complete: the member becomes a
 * habitué, so undoing an action later (a like removed…) does not bring it back.
 */
export const finish = mutation({
  args: { token: v.string(), checklistDone: v.optional(v.boolean()) },
  handler: async (ctx, { token, checklistDone }) => {
    // Closing the guide stays possible in a read-only family
    const { db, member } = await requireMemberWriter(ctx, token, { evenReadOnly: true });
    // Habitués stay habitués when they replay the guide: no checklist for them
    if (member.onboardingDoneAt === ONBOARDING_HABITUAL) return;
    await db.patch(member._id, {
      onboardingDoneAt: checklistDone ? ONBOARDING_HABITUAL : Date.now(),
    });
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
