import { internalMutation, mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import {
  LOCK_MS,
  MAX_FAILURES,
  MIN_CODE_LENGTH,
  SESSION_DAYS,
  currentCodeHash,
  normalizeCode,
  safeEqual,
  sha256,
} from "./lib";
import { seedIfEmpty } from "./seed";

/** Exchanges the family code for a long-lived device token. */
export const login = mutation({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const expected = process.env.FAMILY_CODE;
    if (!expected || normalizeCode(expected).length < MIN_CODE_LENGTH) {
      throw new ConvexError(
        "L'accès n'est pas encore configuré sur le serveur.",
      );
    }

    const now = Date.now();
    const guard = await ctx.db.query("accessGuard").first();
    if (guard && guard.lockedUntil > now) {
      const minutes = Math.ceil((guard.lockedUntil - now) / 60000);
      throw new ConvexError(`Trop d'essais. Réessaie dans ${minutes} min.`);
    }

    if (
      code.length > 200 ||
      !safeEqual(normalizeCode(code), normalizeCode(expected))
    ) {
      // Old typos are forgotten: only failures within the lock window count
      const recent =
        guard?.lastFailureAt && now - guard.lastFailureAt < LOCK_MS
          ? guard.failures
          : 0;
      const failures = recent + 1;
      const locked = failures >= MAX_FAILURES;
      const next = {
        failures: locked ? 0 : failures,
        lockedUntil: locked ? now + LOCK_MS : 0,
        lastFailureAt: now,
      };
      if (guard) await ctx.db.patch(guard._id, next);
      else await ctx.db.insert("accessGuard", next);
      // Return instead of throwing: a thrown error would roll back the failure count
      return { ok: false as const, error: "Code incorrect." };
    }

    if (guard) await ctx.db.patch(guard._id, { failures: 0, lockedUntil: 0 });
    await seedIfEmpty(ctx);

    const token = crypto.randomUUID() + crypto.randomUUID().replaceAll("-", "");
    await ctx.db.insert("sessions", {
      token: await sha256(token),
      codeHash: (await currentCodeHash()) ?? undefined,
      createdAt: now,
      expiresAt: now + SESSION_DAYS * 24 * 3600 * 1000,
    });
    return { ok: true as const, token };
  },
});

export const check = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    if (!token || token.length > 200) return false;
    const tokenHash = await sha256(token);
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", tokenHash))
      .unique();
    return !!session && session.expiresAt > Date.now() && session.codeHash === (await currentCodeHash());
  },
});

export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    if (!token || token.length > 200) return;
    const tokenHash = await sha256(token);
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", tokenHash))
      .unique();
    if (session) await ctx.db.delete(session._id);
  },
});

/** Emergency: `npx convex run access:revokeAll` signs every phone out. */
export const revokeAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    const sessions = await ctx.db.query("sessions").collect();
    for (const s of sessions) await ctx.db.delete(s._id);
    return { revoked: sessions.length };
  },
});

/** Emergency: `npx convex run access:resetGuard` lifts a brute-force lock. */
export const resetGuard = internalMutation({
  args: {},
  handler: async (ctx) => {
    const guard = await ctx.db.query("accessGuard").first();
    if (guard) await ctx.db.patch(guard._id, { failures: 0, lockedUntil: 0 });
  },
});

/** Daily cleanup of expired sessions (see crons.ts). */
export const purgeExpired = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const sessions = await ctx.db.query("sessions").collect();
    let purged = 0;
    for (const s of sessions) {
      if (s.expiresAt < now) {
        await ctx.db.delete(s._id);
        purged++;
      }
    }
    return { purged };
  },
});
