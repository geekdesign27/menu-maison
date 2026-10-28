import { translateLater } from "./catalogTranslate";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { ConvexError, v } from "convex/values";
import { langValidator, roleValidator } from "./schema";
import {
  assertAdmin,
  familyDb,
  getSettings,
  readSession,
  requireMemberWriter,
  SESSION_DAYS,
  sha256,
} from "./lib";
import {
  DECOY_HASH,
  GLOBAL,
  PER_NAME,
  reserveAttempt,
  type Limit,
  hashPassword,
  nameProblem,
  normalizeName,
  passwordProblem,
  randomToken,
  slugFromName,
  verifyPassword,
} from "./domain/auth";

const INVITE_DAYS = 14; // first sign-in
const RESET_DAYS = 2; // forgotten password: the link may linger in a chat
const WRONG = "Pseudo ou mot de passe incorrect.";

async function openSession(ctx: MutationCtx, member: Doc<"members">) {
  const token = randomToken();
  const now = Date.now();
  await ctx.db.insert("sessions", {
    token: await sha256(token),
    memberId: member._id,
    familyId: member.familyId,
    createdAt: now,
    expiresAt: now + SESSION_DAYS * 24 * 3600 * 1000,
  });
  return token;
}

async function revokeSessions(ctx: MutationCtx, memberId: Id<"members">) {
  const sessions = await ctx.db
    .query("sessions")
    .withIndex("by_member", (q) => q.eq("memberId", memberId))
    .collect();
  for (const s of sessions) await ctx.db.delete(s._id);
}

/** One-time link token for a member to choose a password (first sign-in or reset). */
export async function createInvite(ctx: MutationCtx, member: Doc<"members">, days = INVITE_DAYS) {
  if (!member.familyId) throw new ConvexError("Profil sans famille.");
  // A new link replaces any older one
  const old = await ctx.db
    .query("invites")
    .withIndex("by_member", (q) => q.eq("memberId", member._id))
    .collect();
  for (const i of old) await ctx.db.delete(i._id);
  // A reset link signs the member out everywhere (lost or compromised password)
  await revokeSessions(ctx, member._id);
  const token = randomToken();
  await ctx.db.insert("invites", {
    familyId: member.familyId,
    memberId: member._id,
    token: await sha256(token),
    expiresAt: Date.now() + days * 24 * 3600 * 1000,
  });
  return token;
}

/** Link for a member: 48 hours to reset a password, 14 days for a first sign-in. */
export function accessLink(ctx: MutationCtx, member: Doc<"members">) {
  return createInvite(ctx, member, member.passwordHash ? RESET_DAYS : INVITE_DAYS);
}

/** Family shown on the sign-in screen of its link (or of its name typed by hand), or null. */
export const family = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const family = await ctx.db
      .query("families")
      .withIndex("by_slug", (q) => q.eq("slug", slugFromName(slug)))
      .unique();
    return family && !family.suspended
      ? { name: family.name, slug: family.slug }
      : null;
  },
});

export const loginTarget = internalQuery({
  args: { slug: v.string(), username: v.string() },
  handler: async (ctx, { slug, username }) => {
    const family = await ctx.db
      .query("families")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    const member =
      family && !family.suspended
        ? await ctx.db
            .query("members")
            .withIndex("by_family_username", (q) =>
              q.eq("familyId", family._id).eq("username", username),
            )
            .unique()
        : null;
    return {
      memberId: member?.passwordHash ? member._id : null,
      passwordHash: member?.passwordHash ?? null,
    };
  },
});

const GLOBAL_KEY = "*";

/** Books one attempt under `limit` for `key` (sign-in, sign-up…); refused once over it. */
export async function reserve(ctx: MutationCtx, key: string, limit: Limit, now: number) {
  const row = await ctx.db
    .query("loginGuards")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  const r = reserveAttempt(row, now, limit);
  if (r.next !== row) {
    if (row) await ctx.db.patch(row._id, r.next);
    else await ctx.db.insert("loginGuards", { key, ...r.next });
  }
  return r;
}

/**
 * Books a sign-in attempt before the costly password check: for the whole
 * deployment, then for this pseudo (when `key` is given). Mutations run one at
 * a time, so parallel requests cannot pass the limits.
 */
export const beginAttempt = internalMutation({
  args: { key: v.optional(v.string()) },
  handler: async (ctx, { key }): Promise<{ allowed: boolean; retryAt: number }> => {
    const now = Date.now();
    const global = await reserve(ctx, GLOBAL_KEY, GLOBAL, now);
    if (!global.allowed) return { allowed: false, retryAt: global.retryAt };
    const own = key ? await reserve(ctx, key, PER_NAME, now) : global;
    return { allowed: own.allowed, retryAt: own.retryAt };
  },
});

/** Right password: the pseudo's attempts are forgotten and a session opens. */
export const finishLogin = internalMutation({
  args: { key: v.string(), memberId: v.id("members") },
  handler: async (ctx, { key, memberId }) => {
    const guard = await ctx.db
      .query("loginGuards")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    if (guard) await ctx.db.delete(guard._id);
    const member = await ctx.db.get(memberId);
    if (!member) return null;
    return openSession(ctx, member);
  },
});

function tooMany(retryAt: number) {
  const minutes = Math.max(1, Math.ceil((retryAt - Date.now()) / 60000));
  return `Trop d'essais. Réessaie dans ${minutes} min.`;
}

/** Pseudo and password, within the family of the sign-in link. */
export const login = action({
  args: { family: v.string(), username: v.string(), password: v.string() },
  handler: async (
    ctx,
    args,
  ): Promise<{ ok: true; token: string; slug: string } | { ok: false; error: string }> => {
    // The family name typed by hand works as well as the link name
    const slug = slugFromName(args.family);
    const username = normalizeName(args.username).slice(0, 30);
    if (!slug || !username || !args.password || args.password.length > 200)
      return { ok: false, error: WRONG };
    // The key does not reveal whether the family or the pseudo exists
    const key = `${slug}:${username}`;
    const slot = await ctx.runMutation(internal.access.beginAttempt, { key });
    if (!slot.allowed) return { ok: false, error: tooMany(slot.retryAt) };
    const target = await ctx.runQuery(internal.access.loginTarget, { slug, username });
    // An unknown pseudo is checked against a decoy so that it takes as long
    const ok = await verifyPassword(args.password, target.passwordHash ?? DECOY_HASH);
    if (!ok || !target.memberId) return { ok: false, error: WRONG };
    const token = await ctx.runMutation(internal.access.finishLogin, { key, memberId: target.memberId });
    return token ? { ok: true, token, slug } : { ok: false, error: WRONG };
  },
});

/** Who is signed in with this token, or null (expired, revoked, suspended family). */
export const check = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const found = await readSession(ctx, token);
    if (!found) return null;
    const { member, family } = found;
    const settings = await getSettings(familyDb(ctx.db, family._id));
    return {
      memberId: member._id,
      name: member.name,
      username: member.username ?? null,
      role: member.role ?? "membre",
      superadmin: member.superadmin === true,
      lang: member.lang ?? "fr",
      family: { name: family.name, slug: family.slug },
      // Applied as soon as the phone opens, before the rest of the data
      look: { theme: settings.theme ?? "carotte", font: settings.font ?? "nunito" },
    };
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

async function findInvite(db: QueryCtx["db"], link: string) {
  if (!link || link.length > 200) return null;
  const tokenHash = await sha256(link);
  const invite = await db
    .query("invites")
    .withIndex("by_token", (q) => q.eq("token", tokenHash))
    .unique();
  if (!invite || invite.expiresAt < Date.now()) return null;
  const [member, family] = await Promise.all([db.get(invite.memberId), db.get(invite.familyId)]);
  if (!member || !family || member.familyId !== family._id || family.suspended) return null;
  return { invite, member, family };
}

/** What an invitation link opens: family, profile and pseudo, or null when expired. */
export const inviteInfo = query({
  args: { link: v.string() },
  handler: async (ctx, { link }) => {
    const found = await findInvite(ctx.db, link);
    if (!found) return null;
    return {
      family: found.family.name,
      slug: found.family.slug,
      name: found.member.name,
      username: found.member.username ?? null,
    };
  },
});

/** Avoid words for the password of an invitation: pseudo and family names. */
export const checkInvite = internalQuery({
  args: { link: v.string() },
  handler: async (ctx, { link }) => {
    const found = await findInvite(ctx.db, link);
    return found
      ? { avoid: [found.member.username ?? "", found.family.name, found.family.slug] }
      : null;
  },
});

const EXPIRED_LINK = "Ce lien n'est plus valable. Demande-en un nouveau à l'admin de ta famille.";

export const redeemInvite = internalMutation({
  args: { link: v.string(), passwordHash: v.string() },
  handler: async (ctx, { link, passwordHash }) => {
    const found = await findInvite(ctx.db, link);
    if (!found) throw new ConvexError(EXPIRED_LINK);
    const { invite, member } = found;
    if (!member.username) throw new ConvexError("Ce profil n'a pas encore de pseudo. Demande à l'admin de ta famille.");
    await ctx.db.patch(member._id, { passwordHash, role: member.role ?? "membre" });
    await ctx.db.delete(invite._id);
    // A new password signs out the other devices of this member
    await revokeSessions(ctx, member._id);
    return openSession(ctx, { ...member, passwordHash });
  },
});

/** Chooses a password from an invitation link (the pseudo is set by the admin), then signs in. */
export const activate = action({
  args: { link: v.string(), password: v.string() },
  handler: async (ctx, args): Promise<{ token: string }> => {
    // The link is checked before the costly hashing, within the global limit
    const slot = await ctx.runMutation(internal.access.beginAttempt, {});
    if (!slot.allowed) throw new ConvexError(tooMany(slot.retryAt));
    const invite = await ctx.runQuery(internal.access.checkInvite, { link: args.link });
    if (!invite) throw new ConvexError(EXPIRED_LINK);
    const problem = passwordProblem(args.password, invite.avoid);
    if (problem) throw new ConvexError(problem);
    const passwordHash = await hashPassword(args.password);
    const token = await ctx.runMutation(internal.access.redeemInvite, { link: args.link, passwordHash });
    return { token };
  },
});

/** The super-admin's access is managed by the super-admin only, not by a family admin. */
function assertCanManage(me: Doc<"members">, member: Doc<"members">) {
  if (member.superadmin && !me.superadmin)
    throw new ConvexError("L'accès de ce profil se gère avec le super-admin.");
}

/** Admin: sets the pseudo of a family member (unique within the family). */
export const setUsername = mutation({
  args: { token: v.string(), id: v.id("members"), username: v.string() },
  handler: async (ctx, args) => {
    const me = await requireMemberWriter(ctx, args.token);
    assertAdmin(me);
    const member = await me.db.own(args.id, "Profil introuvable.");
    assertCanManage(me.member, member);
    const username = normalizeName(args.username);
    const problem = nameProblem(username, "Le pseudo");
    if (problem) throw new ConvexError(problem);
    const taken = await me.db
      .index("members", "by_family_username", (q) => q.eq("username", username))
      .unique();
    if (taken && taken._id !== member._id)
      throw new ConvexError(`Le pseudo « ${username} » est déjà pris dans la famille.`);
    await me.db.patch(member._id, { username });
    return username;
  },
});

/** Admin: makes a member admin of the family, or a plain member again. */
export const setRole = mutation({
  args: { token: v.string(), id: v.id("members"), role: roleValidator },
  handler: async (ctx, args) => {
    const me = await requireMemberWriter(ctx, args.token);
    assertAdmin(me);
    const member = await me.db.own(args.id, "Profil introuvable.");
    // Nobody demotes themselves: the family always keeps an admin
    if (member._id === me.member._id)
      throw new ConvexError("Tu ne peux pas changer ton propre rôle : demande à un autre admin.");
    assertCanManage(me.member, member);
    await me.db.patch(member._id, { role: args.role });
  },
});

/** Language of the app for a profile: the member themself, or an admin of the family. */
export const setLang = mutation({
  args: { token: v.string(), id: v.id("members"), lang: langValidator },
  handler: async (ctx, args) => {
    const me = await requireMemberWriter(ctx, args.token);
    const member = await me.db.own(args.id, "Profil introuvable.");
    if (member._id !== me.member._id) {
      assertAdmin(me);
      assertCanManage(me.member, member);
    }
    // French is the default: nothing stored for it
    await me.db.patch(member._id, { lang: args.lang === "fr" ? undefined : args.lang });
    // A first German profile: the catalogue gets its German names in the background
    if (args.lang === "de") await translateLater(ctx, me.familyId);
  },
});

/**
 * Admin: a one-time link for a member to choose a password, for a first
 * sign-in or a forgotten password. The member's devices are signed out.
 */
export const resetLink = mutation({
  args: { token: v.string(), id: v.id("members") },
  handler: async (ctx, args) => {
    const me = await requireMemberWriter(ctx, args.token);
    assertAdmin(me);
    const member = await me.db.own(args.id, "Profil introuvable.");
    // Resetting oneself would sign this phone out: another admin does it
    if (member._id === me.member._id)
      throw new ConvexError("Pour ton propre accès, demande à un autre admin de la famille.");
    assertCanManage(me.member, member);
    if (!member.username) throw new ConvexError("Choisis d'abord un pseudo pour ce profil.");
    return accessLink(ctx, member);
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

/** Emergency: `npx convex run access:resetGuards` lifts every sign-in lock. */
export const resetGuards = internalMutation({
  args: {},
  handler: async (ctx) => {
    for (const g of await ctx.db.query("loginGuards").collect()) await ctx.db.delete(g._id);
  },
});

/** Daily cleanup of expired sessions and invitation links (see crons.ts). */
export const purgeExpired = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let purged = 0;
    for (const s of await ctx.db.query("sessions").collect()) {
      if (s.expiresAt < now) {
        await ctx.db.delete(s._id);
        purged++;
      }
    }
    for (const i of await ctx.db.query("invites").collect()) {
      if (i.expiresAt < now) await ctx.db.delete(i._id);
    }
    // Guards of names nobody tries any more
    for (const g of await ctx.db.query("loginGuards").collect()) {
      if (g.lockedUntil < now && now - g.lastFailureAt > 24 * 3600 * 1000) await ctx.db.delete(g._id);
    }
    return { purged };
  },
});
