// A member's own account: e-mail address (optional, confirmed by a link),
// forgotten password by e-mail, password change and signing out the other
// devices. Rules in convex/domain/account.ts.
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type QueryCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { ConvexError, v } from "convex/values";
import { readSession, requireMember, requireMemberWriter, sha256 } from "./lib";
import {
  createInvite,
  notifyPasswordChanged,
  reserve,
  revokeSessions,
} from "./access";
import { checkPassword } from "./passwordCheck";
import {
  ALL_EMAIL_LIMIT,
  EMAIL_CONFIRM_HOURS,
  EMAIL_LIMIT,
  FAMILY_EMAIL_LIMIT,
  RESET_ALL_LIMIT,
  emailProblem,
  normalizeEmail,
  RESET_EMAIL_HOURS,
  RESET_LIMIT,
} from "./domain/account";
import {
  GLOBAL,
  hashPassword,
  PER_NAME,
  passwordProblem,
  randomToken,
} from "./domain/auth";
import { langValidator } from "./schema";
import { sendOnce, siteUrl } from "./email";

const HOUR = 60 * 60 * 1000;
const TOO_MANY = "Trop de demandes. Réessaie dans une heure.";

/** This phone's session; an expired one throws the usual « reconnecte-toi ». */
async function currentSession(ctx: QueryCtx, token: string) {
  const found = await readSession(ctx, token);
  if (!found) await requireMember(ctx, token);
  return found!;
}

/** Réglages, Mon compte: what the member sees of their own account. */
export const mine = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const { member } = await requireMember(ctx, token);
    const others =
      (
        await ctx.db
          .query("sessions")
          .withIndex("by_member", (q) => q.eq("memberId", member._id))
          .collect()
      ).length - 1;
    return {
      username: member.username ?? null,
      email: member.email ?? null,
      // Shown while its link is valid; an expired one is simply asked again
      pendingEmail:
        member.pendingEmail && (member.emailTokenExpiresAt ?? 0) > Date.now()
          ? member.pendingEmail
          : null,
      otherDevices: Math.max(0, others),
    };
  },
});

/** Counted before the password check: a few e-mails an hour per member, per family and in all. */
export const saveEmail = internalMutation({
  args: { token: v.string(), email: v.string() },
  handler: async (ctx, args) => {
    const me = await requireMemberWriter(ctx, args.token, { evenReadOnly: true });
    const email = normalizeEmail(args.email);
    const now = Date.now();
    // Each limit counts: nobody sends many confirmation e-mails from menumaison.ch
    for (const [key, limit] of [
      [`email:${me.member._id}`, EMAIL_LIMIT],
      [`email:family:${me.familyId}`, FAMILY_EMAIL_LIMIT],
      ["email:*", ALL_EMAIL_LIMIT],
    ] as const)
      if (!(await reserve(ctx, key, limit, now)).allowed) throw new ConvexError(TOO_MANY);
    const link = randomToken();
    await me.db.patch(me.member._id, {
      pendingEmail: email,
      emailTokenHash: await sha256(link),
      emailTokenExpiresAt: now + EMAIL_CONFIRM_HOURS * HOUR,
    });
    await sendOnce(ctx, {
      kind: "emailConfirm",
      key: `emailConfirm:${me.member._id}:${now}`,
      to: email,
      lang: me.member.lang ?? "fr",
      data: {
        familyName: me.family.name,
        adminName: me.member.name,
        link: `${siteUrl()}/#/email/${link}`,
      },
      familyId: me.familyId,
    });
  },
});

/**
 * The member gives (or changes) their e-mail, with their password: it counts
 * once confirmed by the link sent to it.
 */
export const setEmail = action({
  args: { token: v.string(), email: v.string(), password: v.string() },
  handler: async (ctx, args): Promise<{ pending: string }> => {
    const email = normalizeEmail(args.email);
    const problem = emailProblem(email);
    if (problem) throw new ConvexError(problem);
    const target = await ctx.runQuery(internal.account.passwordTarget, { token: args.token });
    await checkPassword(ctx, target.memberId, target.passwordHash, args.password);
    await ctx.runMutation(internal.account.saveEmail, { token: args.token, email });
    return { pending: email };
  },
});

/** The member removes their e-mail (confirmed or waiting). */
export const removeEmail = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const me = await requireMemberWriter(ctx, token, { evenReadOnly: true });
    const old = me.member.email;
    await me.db.patch(me.member._id, {
      email: undefined,
      pendingEmail: undefined,
      emailTokenHash: undefined,
      emailTokenExpiresAt: undefined,
    });
    if (old)
      await sendOnce(ctx, {
        kind: "emailChanged",
        key: `emailChanged:${me.member._id}:${Date.now()}`,
        to: old,
        lang: me.member.lang ?? "fr",
        data: { familyName: me.family.name, adminName: me.member.name },
        familyId: me.familyId,
      });
  },
});

/**
 * « #/email/<link> », from the confirmation e-mail: the address becomes the
 * member's. The link is the secret, so no session is needed (another phone works).
 */
export const confirmEmail = mutation({
  args: { link: v.string() },
  handler: async (ctx, { link }): Promise<{ ok: boolean; email?: string }> => {
    if (!/^[0-9a-f]{64}$/.test(link)) return { ok: false };
    const tokenHash = await sha256(link);
    const member = await ctx.db
      .query("members")
      .withIndex("by_email_token", (q) => q.eq("emailTokenHash", tokenHash))
      .unique();
    if (!member?.pendingEmail || (member.emailTokenExpiresAt ?? 0) < Date.now())
      return { ok: false };
    const family = await ctx.db.get(member.familyId);
    if (!family || family.suspended) return { ok: false };
    const old = member.email;
    const email = member.pendingEmail;
    await ctx.db.patch(member._id, {
      email,
      pendingEmail: undefined,
      emailTokenHash: undefined,
      emailTokenExpiresAt: undefined,
    });
    if (old && old !== email)
      await sendOnce(ctx, {
        kind: "emailChanged",
        key: `emailChanged:${member._id}:${Date.now()}`,
        to: old,
        lang: member.lang ?? "fr",
        data: { familyName: family.name, adminName: member.name },
        familyId: family._id,
      });
    return { ok: true, email };
  },
});

/**
 * « Mot de passe oublié » on the sign-in screen: a link by e-mail to each
 * profile with this confirmed address. Same answer whether the address is
 * known or not, and a few requests an hour per address at most.
 */
export const requestReset = mutation({
  args: { email: v.string(), lang: langValidator },
  handler: async (ctx, args): Promise<{ ok: true }> => {
    const email = normalizeEmail(args.email);
    if (emailProblem(email)) return { ok: true };
    const now = Date.now();
    // The whole site first, then this address (its hash: no address in the guards)
    if (!(await reserve(ctx, "reset:*", RESET_ALL_LIMIT, now)).allowed) return { ok: true };
    if (
      !(await reserve(ctx, `reset:${await sha256(email)}`, RESET_LIMIT, now))
        .allowed
    )
      return { ok: true };
    const members = await ctx.db
      .query("members")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect();
    for (const member of members) {
      // Only an account already in use: a first sign-in goes through the admin
      if (!member.username || !member.passwordHash) continue;
      const family = await ctx.db.get(member.familyId);
      if (!family || family.suspended) continue;
      const link = await createInvite(ctx, member, RESET_EMAIL_HOURS / 24, {
        revoke: false,
      });
      await sendOnce(ctx, {
        kind: "passwordReset",
        // Each request is its own e-mail, even two in the same millisecond
        key: `passwordReset:${member._id}:${now}:${crypto.randomUUID()}`,
        to: email,
        lang: member.lang ?? args.lang,
        data: {
          familyName: family.name,
          adminName: member.name,
          pseudo: member.username,
          link: `${siteUrl()}/#/activer/${link}`,
        },
        familyId: family._id,
      });
    }
    return { ok: true };
  },
});

/** The signed-in member's password hash, for checking the current one before a change. */
export const passwordTarget = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const { member, family } = await requireMember(ctx, token);
    return {
      memberId: member._id,
      passwordHash: member.passwordHash ?? "",
      avoid: [member.username ?? "", family.name, family.slug],
    };
  },
});

/** Counts one try of the current password (5 per 10 minutes, as for signing in). */
export const beginPasswordCheck = internalMutation({
  args: { memberId: v.id("members") },
  handler: async (ctx, { memberId }) => {
    const now = Date.now();
    const global = await reserve(ctx, "*", GLOBAL, now);
    if (!global.allowed) return false;
    return (await reserve(ctx, `password:${memberId}`, PER_NAME, now)).allowed;
  },
});

export const endPasswordCheck = internalMutation({
  args: { memberId: v.id("members") },
  handler: async (ctx, { memberId }) => {
    const guard = await ctx.db
      .query("loginGuards")
      .withIndex("by_key", (q) => q.eq("key", `password:${memberId}`))
      .unique();
    if (guard) await ctx.db.delete(guard._id);
  },
});

export const savePassword = internalMutation({
  args: { token: v.string(), passwordHash: v.string() },
  handler: async (ctx, { token, passwordHash }) => {
    const { session, member, family } = await currentSession(ctx, token);
    await ctx.db.patch(member._id, { passwordHash });
    // This phone stays signed in, the others are signed out
    await revokeSessions(ctx, member._id, session._id);
    // A reset link asked earlier is of no use any more
    const invites = await ctx.db
      .query("invites")
      .withIndex("by_member", (q) => q.eq("memberId", member._id))
      .collect();
    for (const invite of invites) await ctx.db.delete(invite._id);
    await notifyPasswordChanged(ctx, member, family);
  },
});

/** Réglages, Mon compte: the current password, then the new one. */
export const changePassword = action({
  args: { token: v.string(), current: v.string(), next: v.string() },
  handler: async (ctx, args): Promise<void> => {
    const target = await ctx.runQuery(internal.account.passwordTarget, { token: args.token });
    await checkPassword(ctx, target.memberId, target.passwordHash, args.current);
    if (args.next.length > 200) throw new ConvexError("Mot de passe trop long.");
    const problem = passwordProblem(args.next, target.avoid);
    if (problem) throw new ConvexError(problem);
    const passwordHash = await hashPassword(args.next);
    await ctx.runMutation(internal.account.savePassword, { token: args.token, passwordHash });
  },
});

/** Réglages, Mon compte: signs the member out of every other phone or computer. */
export const signOutOthers = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const { session, member } = await currentSession(ctx, token);
    return revokeSessions(ctx, member._id, session._id);
  },
});
