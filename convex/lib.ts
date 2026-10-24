import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { addDays } from "./domain/dates";
import type { ChainPrices } from "./domain/shopping";

export const SESSION_DAYS = 365;
export const MAX_FAILURES = 5;
export const LOCK_MS = 10 * 60 * 1000;
export const MIN_CODE_LENGTH = 8;

const EXPIRED = "Session expirée, entre à nouveau le code famille.";

export async function sha256(text: string) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

/** Fingerprint of the current family code: changing the code revokes every session. */
export async function currentCodeHash() {
  const code = process.env.FAMILY_CODE;
  return code ? sha256(`family:${normalizeCode(code)}`) : null;
}

/**
 * Throws unless the device token matches a live session opened with the
 * current family code. Only a hash of the token is stored.
 */
export async function assertSession(ctx: QueryCtx, token: string) {
  if (!token || token.length > 200) throw new ConvexError(EXPIRED);
  const tokenHash = await sha256(token);
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q) => q.eq("token", tokenHash))
    .unique();
  if (!session || session.expiresAt < Date.now()) throw new ConvexError(EXPIRED);
  if (session.codeHash !== (await currentCodeHash())) throw new ConvexError(EXPIRED);
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

// ---------- Input checks shared by all mutations ----------

/** YYYY-MM-DD that is a real calendar date. */
export function assertDate(d: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || addDays(d, 0) !== d)
    throw new ConvexError(`Date invalide : ${d}`);
}

/** Trimmed, non-empty (unless optional) text no longer than `max`. */
export function cleanText(s: string, max: number, what: string) {
  const t = s.trim();
  if (t.length > max)
    throw new ConvexError(`${what} : ${max} caractères au maximum.`);
  return t;
}

export function assertInt(n: number, min: number, max: number, what: string) {
  if (!Number.isInteger(n) || n < min || n > max)
    throw new ConvexError(`${what} : entre ${min} et ${max}.`);
}

export function assertPositive(n: number, max: number, what: string) {
  if (!Number.isFinite(n) || n <= 0 || n > max)
    throw new ConvexError(`${what} : valeur invalide.`);
}

export function assertColor(c: string) {
  if (!/^#[0-9a-f]{6}$/i.test(c)) throw new ConvexError("Couleur invalide.");
}

export function assertEmoji(e: string) {
  if (!e.trim() || e.length > 16) throw new ConvexError("Emoji invalide.");
}

/** Prices and receipt labels of a product, removed with the product. */
export async function removeReceiptData(
  ctx: MutationCtx,
  of: { ingredientId: Id<"ingredients"> } | { stapleId: Id<"staples"> },
) {
  const prices =
    "ingredientId" in of
      ? await ctx.db.query("chainPrices").withIndex("by_ingredient", (q) => q.eq("ingredientId", of.ingredientId)).collect()
      : await ctx.db.query("chainPrices").withIndex("by_staple", (q) => q.eq("stapleId", of.stapleId)).collect();
  const aliases = (await ctx.db.query("receiptAliases").collect()).filter((a) =>
    "ingredientId" in of ? a.ingredientId === of.ingredientId : a.stapleId === of.stapleId,
  );
  for (const row of [...prices, ...aliases]) await ctx.db.delete(row._id);
}

/** Receipt prices grouped by product, in the shape the cost helpers expect. */
export async function loadChainPrices(ctx: QueryCtx) {
  const ingredients = new Map<string, ChainPrices>();
  const staples = new Map<string, ChainPrices>();
  for (const p of await ctx.db.query("chainPrices").collect()) {
    const map = p.ingredientId ? ingredients : staples;
    const key = (p.ingredientId ?? p.stapleId) as string;
    map.set(key, { ...map.get(key), [p.chain]: { priceChf: p.priceChf, priceQty: p.priceQty } });
  }
  return { ingredients, staples };
}
