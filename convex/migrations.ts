import { internalMutation } from "./_generated/server";
import type { Id, TableNames } from "./_generated/dataModel";
import { ConvexError, v } from "convex/values";
import { createInvite } from "./access";
import { nameProblem, normalizeName } from "./domain/auth";

// Every table whose rows belong to a family, in the order they are stamped
const FAMILY_TABLES = [
  "members",
  "aisles",
  "ingredients",
  "recipes",
  "likes",
  "stores",
  "meals",
  "templates",
  "shoppingChecks",
  "shoppingExtras",
  "staples",
  "stockSkips",
  "wishes",
  "chainPrices",
  "receiptAliases",
  "settings",
] as const satisfies readonly TableNames[];

/**
 * One-off (2026-10): turns the single-family deployment into the first family.
 * Stamps every row with it, gives each member a pseudo and a one-time link to
 * choose a password, and signs every phone out (the family code is gone).
 *
 * npx convex run migrations:toFamilies '{"name":"Famille Schütz","slug":"schutz",
 *   "accounts":[{"member":"Pierre-Alain","username":"pa","admin":true,"superadmin":true}, …]}'
 */
export const toFamilies = internalMutation({
  args: {
    name: v.string(),
    slug: v.string(),
    accounts: v.array(
      v.object({
        member: v.string(), // current first name of the profile
        username: v.string(),
        admin: v.optional(v.boolean()),
        superadmin: v.optional(v.boolean()),
      }),
    ),
  },
  handler: async (ctx, { name, slug, accounts }) => {
    if (await ctx.db.query("families").first()) throw new ConvexError("Une famille existe déjà : migration déjà faite.");
    const cleanSlug = normalizeName(slug);
    const slugProblem = nameProblem(cleanSlug, "Le nom du lien");
    if (slugProblem) throw new ConvexError(slugProblem);
    const familyId: Id<"families"> = await ctx.db.insert("families", {
      name: name.trim(),
      slug: cleanSlug,
      suspended: false,
      createdAt: Date.now(),
    });

    const stamped: Record<string, number> = {};
    for (const table of FAMILY_TABLES) {
      let n = 0;
      for (const row of await ctx.db.query(table).collect()) {
        if (row.familyId) continue;
        await ctx.db.patch(row._id, { familyId });
        n++;
      }
      stamped[table] = n;
    }

    const members = await ctx.db.query("members").collect();
    const links: Record<string, string> = {};
    const taken = new Set<string>();
    for (const account of accounts) {
      const member = members.find((m) => m.name === account.member);
      if (!member) throw new ConvexError(`Profil « ${account.member} » introuvable.`);
      const username = normalizeName(account.username);
      const problem = nameProblem(username, "Le pseudo");
      if (problem) throw new ConvexError(`${account.member} : ${problem}`);
      if (taken.has(username)) throw new ConvexError(`Pseudo « ${username} » en double.`);
      taken.add(username);
      await ctx.db.patch(member._id, {
        username,
        role: account.admin ? "admin" : "membre",
        superadmin: account.superadmin || undefined,
      });
      links[member.name] = await createInvite(ctx, { ...member, familyId });
    }

    // Sessions opened with the family code and its brute-force guard are gone
    for (const s of await ctx.db.query("sessions").collect()) await ctx.db.delete(s._id);
    for (const g of await ctx.db.query("accessGuard").collect()) await ctx.db.delete(g._id);

    return { familyId, stamped, links };
  },
});
