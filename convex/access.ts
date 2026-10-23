import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import {
  LOCK_MS,
  MAX_FAILURES,
  SESSION_DAYS,
  normalizeCode,
  safeEqual,
} from "./lib";
import { seedIfEmpty } from "./seed";

/** Exchanges the family code for a long-lived device token. */
export const login = mutation({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const expected = process.env.FAMILY_CODE;
    if (!expected)
      throw new ConvexError(
        "Le code famille n'est pas configuré sur le serveur (FAMILY_CODE).",
      );

    const now = Date.now();
    const guard = await ctx.db.query("accessGuard").first();
    if (guard && guard.lockedUntil > now) {
      const minutes = Math.ceil((guard.lockedUntil - now) / 60000);
      throw new ConvexError(`Trop d'essais. Réessaie dans ${minutes} min.`);
    }

    if (!safeEqual(normalizeCode(code), normalizeCode(expected))) {
      const failures = (guard?.failures ?? 0) + 1;
      const lockedUntil = failures >= MAX_FAILURES ? now + LOCK_MS : 0;
      const next = {
        failures: failures >= MAX_FAILURES ? 0 : failures,
        lockedUntil,
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
      token,
      createdAt: now,
      expiresAt: now + SESSION_DAYS * 24 * 3600 * 1000,
    });
    return { ok: true as const, token };
  },
});

export const check = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    if (!token) return false;
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    return !!session && session.expiresAt > Date.now();
  },
});

export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (session) await ctx.db.delete(session._id);
  },
});
