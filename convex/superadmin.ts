import { mutation, query, type QueryCtx } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { requireMember } from "./lib";
import { accessLink } from "./access";
import { createFamily } from "./families";

/**
 * Super-admin space (PA): the only functions that see several families. They
 * read `ctx.db` across families on purpose, and return counts and names only,
 * never a family's recipes, lists or receipts.
 */
async function requireSuperadmin(ctx: QueryCtx, token: string) {
  const me = await requireMember(ctx, token);
  if (me.member.superadmin !== true)
    throw new ConvexError("Réservé au super-admin.");
  return me;
}

/** Every family with its members' access and a few usage figures. */
export const families = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const me = await requireSuperadmin(ctx, token);
    const [families, sessions] = await Promise.all([
      ctx.db.query("families").collect(),
      ctx.db.query("sessions").collect(),
    ]);
    return Promise.all(
      families.map(async (f) => {
        const [members, recipes] = await Promise.all([
          ctx.db
            .query("members")
            .withIndex("by_family", (q) => q.eq("familyId", f._id))
            .collect(),
          ctx.db
            .query("recipes")
            .withIndex("by_family", (q) => q.eq("familyId", f._id))
            .collect(),
        ]);
        const signIns = sessions
          .filter((s) => s.familyId === f._id)
          .map((s) => s.createdAt);
        return {
          _id: f._id,
          name: f.name,
          slug: f.slug,
          suspended: f.suspended,
          createdAt: f.createdAt,
          isMine: f._id === me.familyId,
          members: members
            .sort((a, b) => a.order - b.order)
            .map((m) => ({
              _id: m._id,
              name: m.name,
              username: m.username ?? null,
              admin: m.role === "admin",
              activated: !!m.passwordHash,
            })),
          recipes: recipes.filter((r) => !r.archived).length,
          lastSignIn: signIns.length ? Math.max(...signIns) : null,
        };
      }),
    );
  },
});

/** Creates a family and returns its admin's pseudo and activation link token. */
export const createOne = mutation({
  args: {
    token: v.string(),
    name: v.string(),
    admin: v.string(),
    username: v.optional(v.string()),
  },
  handler: async (ctx, { token, ...args }) => {
    await requireSuperadmin(ctx, token);
    const { slug, username, invite } = await createFamily(ctx, args);
    return { slug, username, invite };
  },
});

/** A new link for an admin of another family (forgotten password, lost link). */
export const adminLink = mutation({
  args: { token: v.string(), memberId: v.id("members") },
  handler: async (ctx, { token, memberId }) => {
    const me = await requireSuperadmin(ctx, token);
    const member = await ctx.db.get(memberId);
    if (!member || member.role !== "admin")
      throw new ConvexError("Admin introuvable.");
    // Within one's own family, the family screen does it (and not for oneself)
    if (member.familyId === me.familyId)
      throw new ConvexError("Pour ta famille, passe par Réglages, Profils.");
    // Another super-admin's access is not reset from here
    if (member.superadmin) throw new ConvexError("Admin introuvable.");
    if (!member.username) throw new ConvexError("Cet admin n'a pas de pseudo.");
    const family = await ctx.db.get(member.familyId);
    if (!family || family.suspended)
      throw new ConvexError("Réactive d'abord la famille.");
    return accessLink(ctx, member);
  },
});

/**
 * Suspends a family or lifts it. Suspending signs every device out and drops
 * pending links (a stolen phone stays out after the family is lifted); the
 * data are kept.
 */
export const setSuspended = mutation({
  args: {
    token: v.string(),
    familyId: v.id("families"),
    suspended: v.boolean(),
  },
  handler: async (ctx, { token, familyId, suspended }) => {
    const me = await requireSuperadmin(ctx, token);
    if (familyId === me.familyId)
      throw new ConvexError("Tu ne peux pas suspendre ta propre famille.");
    if (!(await ctx.db.get(familyId)))
      throw new ConvexError("Famille introuvable.");
    await ctx.db.patch(familyId, { suspended });
    if (!suspended) return;
    // Small tables, without a family index: read once and filter
    for (const s of await ctx.db.query("sessions").collect())
      if (s.familyId === familyId) await ctx.db.delete(s._id);
    for (const i of await ctx.db.query("invites").collect())
      if (i.familyId === familyId) await ctx.db.delete(i._id);
  },
});
