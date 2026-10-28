import { ConvexError } from "convex/values";
import type { NamedTableInfo, Query, WithoutSystemFields } from "convex/server";
import type { DatabaseReader, DatabaseWriter, MutationCtx, QueryCtx } from "./_generated/server";
import type { DataModel, Doc, Id, TableNames } from "./_generated/dataModel";
import { addDays } from "./domain/dates";
import type { ChainPrices } from "./domain/shopping";

export const SESSION_DAYS = 365;

const EXPIRED = "Session expirée, reconnecte-toi.";
const NOT_FOUND = "Introuvable.";

export async function sha256(text: string) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

/** Tables whose rows belong to one family. */
export type FamilyTable = Exclude<TableNames, "families" | "sessions" | "loginGuards" | "invites">;

/**
 * The database seen by one family. Every read is limited to the family, every
 * write is stamped with it, and a document of another family behaves as if it
 * did not exist. Public functions use this instead of `ctx.db`.
 */
export function familyDb(db: DatabaseReader, familyId: Id<"families">) {
  return {
    familyId,
    /** All rows of a table for this family (index « by_family »). */
    query<T extends FamilyTable>(table: T): Query<NamedTableInfo<DataModel, T>> {
      // Every family table has a « by_family » index on familyId
      return db.query(table).withIndex("by_family" as any, (q: any) => q.eq("familyId", familyId)) as any;
    },
    /**
     * Rows of this family through an index whose first field is familyId
     * (« by_family_date »…); `range` continues after the family.
     */
    index<T extends FamilyTable>(
      table: T,
      name: string,
      range?: (q: any) => any,
    ): Query<NamedTableInfo<DataModel, T>> {
      return db.query(table).withIndex(name as any, (q: any) => {
        const own = q.eq("familyId", familyId);
        return range ? range(own) : own;
      }) as any;
    },
    /** A document of this family, or null (also for another family's document). */
    async get<T extends FamilyTable>(id: Id<T>): Promise<Doc<T> | null> {
      const doc = await db.get(id);
      return doc && (doc as { familyId?: Id<"families"> }).familyId === familyId ? doc : null;
    },
    /** Same, but throws « Introuvable » (or `message`) when missing. */
    async own<T extends FamilyTable>(id: Id<T>, message = NOT_FOUND): Promise<Doc<T>> {
      const doc = await this.get(id);
      if (!doc) throw new ConvexError(message);
      return doc;
    },
    /** Checks that every id belongs to this family (ids stored inside other rows). */
    async ownAll<T extends FamilyTable>(ids: Iterable<Id<T>>, message = NOT_FOUND) {
      for (const id of new Set(ids)) await this.own(id, message);
    },
  };
}

export function familyWriter(db: DatabaseWriter, familyId: Id<"families">) {
  const reader = familyDb(db, familyId);
  return {
    ...reader,
    insert<T extends FamilyTable>(table: T, value: Omit<WithoutSystemFields<Doc<T>>, "familyId">) {
      return db.insert(table, { ...value, familyId } as any) as Promise<Id<T>>;
    },
    async patch<T extends FamilyTable>(id: Id<T>, value: Partial<Omit<Doc<T>, "familyId" | "_id" | "_creationTime">>) {
      await reader.own(id);
      await db.patch(id, value as any);
    },
    async replace<T extends FamilyTable>(id: Id<T>, value: Omit<WithoutSystemFields<Doc<T>>, "familyId">) {
      await reader.own(id);
      await db.replace(id, { ...value, familyId } as any);
    },
    async delete<T extends FamilyTable>(id: Id<T>) {
      await reader.own(id);
      await db.delete(id);
    },
  };
}

export type FamilyDb = ReturnType<typeof familyDb>;
export type FamilyWriter = ReturnType<typeof familyWriter>;

/** Who is signed in on this device, read from the session token. */
async function sessionMember(db: DatabaseReader, token: string) {
  if (!token || token.length > 200) return null;
  const tokenHash = await sha256(token);
  const session = await db
    .query("sessions")
    .withIndex("by_token", (q) => q.eq("token", tokenHash))
    .unique();
  if (!session || session.expiresAt < Date.now()) return null;
  const [member, family] = await Promise.all([db.get(session.memberId), db.get(session.familyId)]);
  // A member removed, moved or without a password any more loses the session
  if (!member || !family || member.familyId !== family._id || !member.passwordHash) return null;
  return { session, member, family };
}

/** Session check for the sign-in screen: null when the token is not (or no longer) valid. */
export async function readSession(ctx: QueryCtx, token: string) {
  const found = await sessionMember(ctx.db, token);
  if (!found || found.family.suspended) return null;
  return found;
}

/**
 * The one entry point of every public function: the signed-in member, their
 * family and its database. Throws when the session is not valid.
 */
export async function requireMember(ctx: QueryCtx, token: string) {
  const found = await readSession(ctx, token);
  if (!found) throw new ConvexError(EXPIRED);
  const { member, family } = found;
  return {
    member,
    family,
    familyId: family._id,
    isAdmin: member.role === "admin",
    db: familyDb(ctx.db, family._id),
  };
}

/** Same for mutations, with a database that writes into the family. */
export async function requireMemberWriter(ctx: MutationCtx, token: string) {
  const me = await requireMember(ctx, token);
  return { ...me, db: familyWriter(ctx.db, me.familyId) };
}

/** Family settings and members management are for the family admins. */
export function assertAdmin(me: { isAdmin: boolean }) {
  if (!me.isAdmin) throw new ConvexError("Réservé aux admins de la famille.");
}

export const DEFAULT_SETTINGS = { shoppingDay: 6, defaultPersons: 3 } as const;

export async function getSettings(
  db: FamilyDb,
): Promise<
  Pick<Doc<"settings">, "shoppingDay" | "defaultPersons" | "defaultStoreId" | "theme" | "font">
> {
  const row = await db.query("settings").first();
  return row ?? { ...DEFAULT_SETTINGS, defaultStoreId: undefined, theme: undefined, font: undefined };
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
  db: FamilyWriter,
  of: { ingredientId: Id<"ingredients"> } | { stapleId: Id<"staples"> },
) {
  const match = (row: { ingredientId?: Id<"ingredients">; stapleId?: Id<"staples"> }) =>
    "ingredientId" in of ? row.ingredientId === of.ingredientId : row.stapleId === of.stapleId;
  const prices = (await db.query("chainPrices").collect()).filter(match);
  const aliases = (await db.query("receiptAliases").collect()).filter(match);
  for (const row of prices) await db.delete(row._id);
  for (const row of aliases) await db.delete(row._id);
}

/** Receipt prices grouped by product, in the shape the cost helpers expect. */
export async function loadChainPrices(db: FamilyDb) {
  const ingredients = new Map<string, ChainPrices>();
  const staples = new Map<string, ChainPrices>();
  for (const p of await db.query("chainPrices").collect()) {
    const map = p.ingredientId ? ingredients : staples;
    const key = (p.ingredientId ?? p.stapleId) as string;
    map.set(key, { ...map.get(key), [p.chain]: { priceChf: p.priceChf, priceQty: p.priceQty } });
  }
  return { ingredients, staples };
}
