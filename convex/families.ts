import { internalMutation } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { createInvite } from "./access";
import { nameProblem, normalizeName, slugFromName } from "./domain/auth";
import { seedFamily } from "./seed";

/**
 * Creates a family with its starting catalog and its first admin, and returns
 * the admin's invitation link token (`#/activer/<token>`). Until the
 * super-admin screen exists:
 * npx convex run families:create '{"name":"Famille Dupont","admin":"Marc"}'
 */
export const create = internalMutation({
  args: { name: v.string(), admin: v.string(), slug: v.optional(v.string()) },
  handler: async (ctx, { name, admin, slug }) => {
    const cleanName = name.trim().slice(0, 60);
    if (!cleanName) throw new ConvexError("Le nom de la famille est obligatoire.");
    const cleanSlug = normalizeName(slug ?? slugFromName(cleanName));
    const problem = nameProblem(cleanSlug, "Le nom du lien");
    if (problem) throw new ConvexError(problem);
    const taken = await ctx.db
      .query("families")
      .withIndex("by_slug", (q) => q.eq("slug", cleanSlug))
      .unique();
    if (taken) throw new ConvexError(`Le lien « ${cleanSlug} » est déjà pris.`);
    const adminName = admin.trim().slice(0, 40);
    if (!adminName) throw new ConvexError("Le prénom de l'admin est obligatoire.");

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
    });
    const member = (await ctx.db.get(memberId))!;
    const invite = await createInvite(ctx, member);
    return { familyId, slug: cleanSlug, invite };
  },
});
