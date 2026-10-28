// German names of the catalogue (products, aisles, usual items), filled for
// families with a German profile: first from the starter catalogue, then by Claude.
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  query,
  type ActionCtx,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { ConvexError, v } from "convex/values";
import { askClaude } from "./claude";
import { assertAdmin, requireMember } from "./lib";
import { cleanGermanName } from "./domain/lang";
import { NAMES_DE } from "./seedNamesDe";

const TABLES = ["ingredients", "aisles", "staples"] as const;
type Table = (typeof TABLES)[number];
const tableValidator = v.union(
  v.literal("ingredients"),
  v.literal("aisles"),
  v.literal("staples"),
);

// Names sent to Claude in one call: a family catalogue fits in one or two
const BATCH = 150;
// Same limits as the editors (cleanNameDe in catalog.ts and staples.ts)
const MAX_LENGTH: Record<Table, number> = { ingredients: 80, aisles: 60, staples: 80 };
// Background runs wait a little, so a burst of new items makes one call
const DELAY_MS = 30_000;
// A run still pending after this is taken as lost (failed action), a new one may start
const STALE_MS = 10 * 60_000;
// Starter catalogue names: a Map, so « constructor » typed as an item is not found
const KNOWN = new Map(Object.entries(NAMES_DE));

const SYSTEM = `Tu traduis en allemand les noms d'une liste de courses d'une famille suisse : produits d'épicerie, rayons de supermarché et articles de ménage.

- Utilise les mots des supermarchés suisses alémaniques (Migros, Coop) : Rüebli, Peperoni, Zucchetti, Rahm, Poulet, Nüsslisalat, Cervelat, Hörnli…
- Allemand de Suisse : « ss », jamais « ß ». Jamais de tiret cadratin ni demi-cadratin.
- Un nom court comme sur une étiquette, avec une majuscule initiale, au même nombre (singulier ou pluriel) que le nom donné.
- Garde tels quels les marques, les appellations (AOP, IGP) et les noms déjà compris en allemand (Mozzarella, Spaghetti).
- Réponds pour chaque clé reçue, avec la même clé.`;

const SCHEMA = {
  type: "object",
  properties: {
    names: {
      type: "array",
      items: {
        type: "object",
        properties: { key: { type: "string" }, de: { type: "string" } },
        required: ["key", "de"],
        additionalProperties: false,
      },
    },
  },
  required: ["names"],
  additionalProperties: false,
};

/** Whether the family has a German profile, and so needs German names. */
async function hasGermanMember(ctx: MutationCtx, familyId: Id<"families">) {
  const members = await ctx.db
    .query("members")
    .withIndex("by_family", (q) => q.eq("familyId", familyId))
    .collect();
  return members.some((m) => m.lang === "de");
}

/**
 * Called after a product, aisle or usual item is created, or a profile set to
 * German: the missing German names are filled in the background.
 */
export async function translateLater(ctx: MutationCtx, familyId: Id<"families">) {
  if (!(await hasGermanMember(ctx, familyId))) return;
  const family = await ctx.db.get(familyId);
  if (!family) return;
  const state = family.germanNames ?? { skipped: [] };
  // One run at a time: it takes every name missing when it starts
  if (state.queuedAt && Date.now() - state.queuedAt < STALE_MS) return;
  await ctx.db.patch(familyId, { germanNames: { ...state, queuedAt: Date.now() } });
  await ctx.scheduler.runAfter(DELAY_MS, internal.catalogTranslate.fill, { familyId });
}

/** Items of the family without German name. */
async function missingItems(ctx: QueryCtx, familyId: Id<"families">) {
  const out: { table: Table; id: string; name: string }[] = [];
  for (const table of TABLES) {
    const rows = await ctx.db
      .query(table)
      .withIndex("by_family", (q) => q.eq("familyId", familyId))
      .collect();
    for (const r of rows) if (!r.nameDe) out.push({ table, id: r._id, name: r.name });
  }
  return out;
}

export const missing = internalQuery({
  args: { familyId: v.id("families") },
  handler: async (ctx, { familyId }) => ({
    items: await missingItems(ctx, familyId),
    skipped: (await ctx.db.get(familyId))?.germanNames?.skipped ?? [],
  }),
});

/** End of a run: the next change may start another; ids Claude left are not sent again automatically. */
export const finish = internalMutation({
  args: { familyId: v.id("families"), skipped: v.array(v.string()) },
  handler: async (ctx, { familyId, skipped }) => {
    await ctx.db.patch(familyId, { germanNames: { skipped: skipped.slice(0, 1000) } });
  },
});

/** Saves German names, only on items of the family still without one. */
export const apply = internalMutation({
  args: {
    familyId: v.id("families"),
    names: v.array(
      v.object({ table: tableValidator, id: v.string(), nameDe: v.string() }),
    ),
  },
  handler: async (ctx, { familyId, names }) => {
    let saved = 0;
    for (const { table, id, nameDe } of names) {
      const docId = ctx.db.normalizeId(table, id);
      const doc = docId && (await ctx.db.get(docId));
      const clean = cleanGermanName(nameDe, MAX_LENGTH[table]);
      if (!doc || doc.familyId !== familyId || doc.nameDe || !clean) continue;
      await ctx.db.patch(docId, { nameDe: clean });
      saved++;
    }
    return saved;
  },
});

/**
 * Fills the missing German names: starter catalogue first, Claude for the rest.
 * `auto` (background run): one batch at most, without the names Claude left before.
 */
async function fillMissing(
  ctx: ActionCtx,
  familyId: Id<"families">,
  auto: boolean,
): Promise<{ saved: number; left: number }> {
  const { items, skipped } = await ctx.runQuery(internal.catalogTranslate.missing, { familyId });
  let saved = await ctx.runMutation(internal.catalogTranslate.apply, {
    familyId,
    names: items
      .filter((t) => KNOWN.has(t.name))
      .map((t) => ({ table: t.table, id: t.id, nameDe: KNOWN.get(t.name)! })),
  });
  const before = new Set(skipped);
  const rest = items.filter((t) => !KNOWN.has(t.name) && !(auto && before.has(t.id)));
  const sent = auto ? rest.slice(0, BATCH) : rest;
  const left = new Set(auto ? skipped : []);
  for (let start = 0; start < sent.length; start += BATCH) {
    const batch = sent.slice(start, start + BATCH);
    const answer = (await askClaude({
      label: "catalog translation",
      system: SYSTEM,
      schema: SCHEMA,
      maxTokens: 8000,
      // One name per line: a line break typed in a name cannot add a key
      content: [{ type: "text", text: batch.map((t, n) => `k${n} ${t.name.replace(/\s+/g, " ")}`).join("\n") }],
      messages: {
        missingKey: "La traduction n'est pas encore configurée (clé ANTHROPIC_API_KEY manquante).",
        refusal: "La traduction a échoué. Réessaie dans un moment.",
        tooLong: "La traduction a échoué. Réessaie dans un moment.",
        busy: "Trop de lectures en même temps. Réessaie dans une minute.",
        failed: "La traduction a échoué. Réessaie dans un moment.",
      },
    })) as { names?: { key: string; de: string }[] };
    const names = (answer.names ?? []).flatMap(({ key, de }) => {
      const item = /^k\d+$/.test(key) ? batch[Number(key.slice(1))] : undefined;
      return item ? [{ table: item.table, id: item.id, nameDe: de }] : [];
    });
    saved += await ctx.runMutation(internal.catalogTranslate.apply, { familyId, names });
    const answered = new Set(names.filter((n) => cleanGermanName(n.nameDe, 80)).map((n) => n.id));
    for (const t of batch) if (!answered.has(t.id)) left.add(t.id);
  }
  await ctx.runMutation(internal.catalogTranslate.finish, { familyId, skipped: [...left] });
  return { saved, left: items.length - saved };
}

/** Background fill after a change; a failure only goes to the logs. */
export const fill = internalAction({
  args: { familyId: v.id("families") },
  handler: async (ctx, { familyId }) => {
    try {
      const { saved, left } = await fillMissing(ctx, familyId, true);
      console.log("catalog translation", JSON.stringify({ saved, left }));
    } catch (e) {
      // Our own messages only: another error could quote item names
      console.log("catalog translation failed", e instanceof ConvexError ? e.data : "unexpected");
      await ctx.runMutation(internal.catalogTranslate.finish, { familyId, skipped: [] }).catch(() => {});
    }
  },
});

export const adminFamily = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const me = await requireMember(ctx, token);
    assertAdmin(me);
    return me.familyId;
  },
});

/** Admins: how many items have no German name yet (button in Gestion). */
export const missingCount = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const me = await requireMember(ctx, token);
    assertAdmin(me);
    return (await missingItems(ctx, me.familyId)).length;
  },
});

/** Admin button: fills the missing German names now, errors shown to the admin. */
export const translateNow = action({
  args: { token: v.string() },
  handler: async (ctx, { token }): Promise<{ saved: number; left: number }> => {
    const familyId = await ctx.runQuery(internal.catalogTranslate.adminFamily, {
      token,
    });
    return fillMissing(ctx, familyId, false);
  },
});
