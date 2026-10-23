import { ConvexError } from "convex/values";
import type { QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

export const SESSION_DAYS = 365;
export const MAX_FAILURES = 5;
export const LOCK_MS = 10 * 60 * 1000;

/** Throws unless the device token matches a live session. */
export async function assertSession(ctx: QueryCtx, token: string) {
  if (!token)
    throw new ConvexError("Session expirée, entre à nouveau le code famille.");
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();
  if (!session || session.expiresAt < Date.now()) {
    throw new ConvexError("Session expirée, entre à nouveau le code famille.");
  }
  return session;
}

export const DEFAULT_SETTINGS = { shoppingDay: 6, defaultPersons: 3 } as const;

export async function getSettings(
  ctx: QueryCtx,
): Promise<
  Pick<Doc<"settings">, "shoppingDay" | "defaultPersons" | "defaultStoreId">
> {
  const row = await ctx.db.query("settings").first();
  return row ?? { ...DEFAULT_SETTINGS, defaultStoreId: undefined };
}

/** Constant-time string comparison, to avoid leaking the code through timing. */
export function safeEqual(a: string, b: string) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

export function normalizeCode(code: string) {
  return code.trim().toLowerCase();
}
