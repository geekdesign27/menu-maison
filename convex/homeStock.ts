import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { requireMember, requireMemberWriter } from "./lib";
import { formatQty } from "./domain/quantities";
import { localName } from "./domain/lang";

/**
 * « À utiliser »: ingredients bought for a dish that was not cooked, with the
 * recipes that would use them up. Oldest first; no expiry date, the family judges.
 */
export const list = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const { db, member } = await requireMember(ctx, token);
    const lang = member.lang ?? "fr";
    const stock = await db.query("homeStock").collect();
    if (!stock.length) return { items: [], ideas: [] };
    const rows = await Promise.all(
      stock
        .sort((a, b) => a.since.localeCompare(b.since))
        .map(async (s) => {
          const ing = await db.get(s.ingredientId);
          return ing && { _id: s._id, ingredientId: ing._id, name: localName(ing, lang), display: formatQty(s.qty, s.unit, lang), since: s.since, from: s.fromName };
        }),
    );
    const items = rows.filter((r) => r !== null);
    // Recipes using the most of what is at home, the main ingredients first
    const wanted = new Set<Id<"ingredients">>(items.map((i) => i.ingredientId));
    const recipes = await db.query("recipes").collect();
    const ideas = recipes
      .filter((r) => !r.archived)
      .map((r) => ({
        _id: r._id,
        name: r.name,
        emoji: r.emoji,
        uses: [...new Set(r.items.map((i) => i.ingredientId).filter((id) => wanted.has(id)))]
          .map((id) => items.find((i) => i.ingredientId === id)!.name),
      }))
      .filter((r) => r.uses.length > 0)
      .sort((a, b) => b.uses.length - a.uses.length || a.name.localeCompare(b.name, "fr"))
      .slice(0, 6);
    return { items, ideas };
  },
});

/** Used up or thrown away: the ingredient leaves « À utiliser » and the list notes. */
export const remove = mutation({
  args: { token: v.string(), id: v.id("homeStock") },
  handler: async (ctx, { token, id }) => {
    const { db } = await requireMemberWriter(ctx, token);
    await db.delete(id);
  },
});
