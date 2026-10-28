import { internalMutation, mutation, type MutationCtx } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { createInvite } from "./access";
import { assertAdmin, requireMemberWriter } from "./lib";
import { nameProblem, normalizeName, pseudoFromName, slugFromName } from "./domain/auth";
import { seedFamily } from "./seed";

/** Family name and its sign-in link name: « Schütz » → « schutz ». */
async function familyName(ctx: MutationCtx, name: string, self?: Id<"families">) {
  const cleanName = name.trim().replace(/\s+/g, " ").slice(0, 40);
  if (!cleanName) throw new ConvexError("Le nom de la famille est obligatoire.");
  const slug = slugFromName(cleanName);
  const problem = nameProblem(slug, "Le nom du lien");
  if (problem) throw new ConvexError(`Ce nom ne donne pas un lien valable : ${problem.toLowerCase()}`);
  const taken = await ctx.db
    .query("families")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique();
  if (taken && taken._id !== self)
    throw new ConvexError(`Le nom « ${cleanName} » est déjà pris par une autre famille. Ajoute par exemple ton village.`);
  return { name: cleanName, slug };
}

/**
 * Creates a family with its starting catalog and its first admin, and returns
 * the admin's invitation link token (`#/activer/<token>`). Until the
 * super-admin screen exists:
 * npx convex run families:create '{"name":"Famille Dupont","admin":"Marc"}'
 */
export const create = internalMutation({
  args: { name: v.string(), admin: v.string(), username: v.optional(v.string()) },
  handler: async (ctx, { name, admin, username }) => {
    const { name: cleanName, slug: cleanSlug } = await familyName(ctx, name);
    const adminName = admin.trim().slice(0, 40);
    if (!adminName) throw new ConvexError("Le prénom de l'admin est obligatoire.");
    const adminPseudo = username ? normalizeName(username) : pseudoFromName(adminName);
    const pseudoIssue = nameProblem(adminPseudo, "Le pseudo");
    if (pseudoIssue) throw new ConvexError(pseudoIssue);

    const familyId = await ctx.db.insert("families", {
      name: cleanName,
      slug: cleanSlug,
      suspended: false,
      createdAt: Date.now(),
    });
    await seedFamily(ctx, familyId);
    const memberId = await ctx.db.insert("members", {
      familyId,
      name: adminName,
      emoji: "🙂",
      color: "#A8C8E8",
      order: 0,
      role: "admin",
      username: adminPseudo,
    });
    const member = (await ctx.db.get(memberId))!;
    const invite = await createInvite(ctx, member);
    return { familyId, slug: cleanSlug, username: adminPseudo, invite };
  },
});

/**
 * Admin: renames the family. The name also gives the sign-in link
 * (« Schütz » → menumaison.ch/#/f/schutz), so the link changes with it.
 */
export const rename = mutation({
  args: { token: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    const me = await requireMemberWriter(ctx, args.token);
    assertAdmin(me);
    const next = await familyName(ctx, args.name, me.familyId);
    await ctx.db.patch(me.familyId, next);
    return next;
  },
});
