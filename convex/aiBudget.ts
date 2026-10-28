// Monthly AI budget of each family. Before every Claude call and dictation,
// one mutation checks the cap and reserves the call, so parallel calls cannot
// all pass under it; the real cost of a Claude answer is settled after. The
// super-admin's family is counted, never blocked.
import { internalMutation, internalQuery, type ActionCtx, type QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { ConvexError, v } from "convex/values";
import {
  budgetMonth,
  budgetProblem,
  capsOf,
  CLAUDE_ESTIMATE_USD,
  UNKNOWN_COST_USD,
  type AiKind,
} from "./domain/aiBudget";
import { accessOf, READ_ONLY } from "./domain/billing";

const kindValidator = v.union(v.literal("claude"), v.literal("dictation"));

/** The family's counters for the month, or null before its first call. */
export async function usageOf(ctx: QueryCtx, familyId: Id<"families">, month = budgetMonth(Date.now())) {
  return ctx.db
    .query("aiUsage")
    .withIndex("by_family", (q) => q.eq("familyId", familyId).eq("month", month))
    .unique();
}

/** The super-admin's family is never blocked. */
export async function isUnlimited(ctx: QueryCtx, familyId: Id<"families">) {
  const members = await ctx.db
    .query("members")
    .withIndex("by_family", (q) => q.eq("familyId", familyId))
    .collect();
  return members.some((m) => m.superadmin === true);
}

async function problemFor(ctx: QueryCtx, familyId: Id<"families">, kind: AiKind) {
  const family = await ctx.db.get(familyId);
  if (!family) return "Famille introuvable.";
  // A family whose subscription ended has no AI either
  if (accessOf(family, Date.now()) === "readonly") return READ_ONLY;
  const used = await usageOf(ctx, familyId);
  return budgetProblem(
    kind,
    { claudeUsd: used?.claudeUsd ?? 0, dictations: used?.dictations ?? 0 },
    capsOf(family, await isUnlimited(ctx, familyId)),
  );
}

/** Why the family's next call of this kind would be refused, or null. */
export const problem = internalQuery({
  args: { familyId: v.id("families"), kind: kindValidator },
  handler: (ctx, { familyId, kind }) => problemFor(ctx, familyId, kind),
});

/**
 * Checks the cap and counts the call in one transaction: a Claude call with an
 * estimate (settled after), a dictation for good. Returns the refusal, or null.
 */
export const reserve = internalMutation({
  args: { familyId: v.id("families"), kind: kindValidator },
  handler: async (ctx, { familyId, kind }) => {
    const reason = await problemFor(ctx, familyId, kind);
    if (reason) return reason;
    const month = budgetMonth(Date.now());
    const row = await usageOf(ctx, familyId, month);
    const add = {
      claudeUsd: kind === "claude" ? CLAUDE_ESTIMATE_USD : 0,
      claudeCalls: kind === "claude" ? 1 : 0,
      dictations: kind === "dictation" ? 1 : 0,
    };
    if (!row) await ctx.db.insert("aiUsage", { familyId, month, ...add });
    else
      await ctx.db.patch(row._id, {
        claudeUsd: row.claudeUsd + add.claudeUsd,
        claudeCalls: row.claudeCalls + add.claudeCalls,
        dictations: row.dictations + add.dictations,
      });
    return null;
  },
});

/** Replaces a call's estimate with its real cost (same month as the reservation when possible). */
export const settle = internalMutation({
  args: { familyId: v.id("families"), usd: v.number() },
  handler: async (ctx, { familyId, usd }) => {
    const cost = Number.isFinite(usd) && usd >= 0 ? usd : UNKNOWN_COST_USD;
    const month = budgetMonth(Date.now());
    const row = await usageOf(ctx, familyId, month);
    if (!row) {
      // Reserved last month, answered this month: counted here in full
      await ctx.db.insert("aiUsage", { familyId, month, claudeUsd: cost, claudeCalls: 0, dictations: 0 });
      return;
    }
    await ctx.db.patch(row._id, { claudeUsd: Math.max(0, row.claudeUsd + cost - CLAUDE_ESTIMATE_USD) });
  },
});

/** Reserves a call of the family, or throws its « budget reached » message. */
export async function reserveCall(ctx: ActionCtx, familyId: Id<"families">, kind: AiKind) {
  const reason = await ctx.runMutation(internal.aiBudget.reserve, { familyId, kind });
  if (reason) throw new ConvexError(reason);
}

/** Settles a Claude call with its real cost; without it, the estimate stays counted. */
export function settleClaude(ctx: ActionCtx, familyId: Id<"families">, usd: number) {
  return ctx.runMutation(internal.aiBudget.settle, { familyId, usd });
}
