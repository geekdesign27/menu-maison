import { MAX_CATALOG_IN_PROMPT } from "./domain/aiBudget";
import { translateLater } from "./catalogTranslate";
import { action, internalQuery, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { ConvexError, v } from "convex/values";
import { assertDate, assertPositive, requireMember, requireMemberWriter, cleanText, type FamilyWriter } from "./lib";
import { chainValidator } from "./schema";
import { askClaude } from "./claude";
import {
  CHAINS,
  checkTotal,
  ingredientPrice,
  labelKey,
  looksLikeCardNumber,
  packContentProblem,
  parseReceipt,
  type Chain,
  type ReceiptLine,
} from "./domain/receipts";

// Base64 of a phone photo shrunk to 2000 px stays far below this
const MAX_IMAGE_CHARS = 6_000_000;

const SYSTEM = `Tu lis des tickets de caisse de magasins suisses (Migros, Coop, Denner, Aldi, Lidl, Volg et autres enseignes) pour une application familiale de courses.

Règles de lecture :
- Lis chaque ligne d'article acheté, dans l'ordre du ticket.
- Une ligne « 3 x 0.49 » sous un libellé donne quantity 3 et unitPrice 0.49 ; total est le montant de la colonne de droite.
- Une ligne « 0.704 kg x 2.69 CHF/kg » donne weightKg 0.704 et pricePerKg 2.69, quantity 1 et unitPrice égal au total.
- Sans indication, quantity vaut 1 et unitPrice est égal au total. Mets 0 pour weightKg et pricePerKg quand l'article n'est pas pesé.
- kind : "bag" pour les sacs, "discount" pour un rabais (total négatif), "deposit" pour une consigne, sinon "product".
- Ignore la partie paiement (carte, numéros de transaction, TVA) : ne recopie aucun numéro de carte.
- chain : l'enseigne de la liste, "Marche" pour un marché, "Specialise" pour un magasin spécialisé (bio, boucherie, fromagerie…), sinon "Autre". date : la date du ticket au format AAAA-MM-JJ, ou "" si illisible. total : le montant à payer.

Correspondances (match) :
- Le catalogue de la famille liste des produits génériques avec une clé (i… pour un ingrédient, s… pour un article hors recette). Ceux marqués [liste] sont sur la liste de courses de la semaine : préfère-les.
- Donne la clé du produit générique que l'article représente, même s'il est de marque ou d'un format différent (« Spaghetti HWG XXL » correspond à Spaghetti). Un substitut direct d'un article [liste] convient aussi.
- Laisse "" quand aucun produit du catalogue ne correspond (friandises, boissons ou autres achats absents du catalogue). Ne force jamais une correspondance douteuse.`;

const SCHEMA = {
  type: "object",
  properties: {
    chain: { type: "string", enum: [...CHAINS] },
    date: { type: "string" },
    total: { type: "number" },
    lines: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          quantity: { type: "number" },
          unitPrice: { type: "number" },
          total: { type: "number" },
          weightKg: { type: "number" },
          pricePerKg: { type: "number" },
          kind: {
            type: "string",
            enum: ["product", "bag", "discount", "deposit"],
          },
          match: { type: "string" },
        },
        required: [
          "label",
          "quantity",
          "unitPrice",
          "total",
          "weightKg",
          "pricePerKg",
          "kind",
          "match",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["chain", "date", "total", "lines"],
  additionalProperties: false,
};

export const catalog = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const { db, familyId } = await requireMember(ctx, token);
    const [ingredients, staples, aliases] = await Promise.all([
      db.query("ingredients").collect(),
      db.query("staples").collect(),
      db.query("receiptAliases").collect(),
    ]);
    return {
      // Bounded: the whole catalogue goes into the prompt (cost of one call)
      ingredients: ingredients.slice(0, MAX_CATALOG_IN_PROMPT).map((i) => ({
        _id: i._id,
        name: i.name,
        unit: i.unit,
      })),
      staples: staples.slice(0, MAX_CATALOG_IN_PROMPT).map((s) => ({ _id: s._id, name: s.name })),
      aliases,
      familyId,
    };
  },
});

export type Target =
  | { kind: "ingredient"; id: Id<"ingredients"> }
  | { kind: "staple"; id: Id<"staples"> };

export interface ReadLine extends ReceiptLine {
  target: Target | null;
  packQty: number | null;
  /** Correspondence remembered from an earlier receipt of this chain. */
  known: boolean;
}

/**
 * Reads a receipt photo with Claude and proposes, for each line, the product of
 * the family catalog it stands for. Nothing is saved: the family checks first.
 */
export const read = action({
  args: {
    token: v.string(),
    image: v.string(), // base64 JPEG, without the data: prefix
    inList: v.array(v.string()), // ids of the products on this week's list
  },
  handler: async (
    ctx,
    { token, image, inList },
  ): Promise<{
    chain: Chain;
    date: string;
    total: number;
    sum: number;
    totalMatches: boolean;
    lines: ReadLine[];
  }> => {
    const data = await ctx.runQuery(internal.receipts.catalog, { token });
    if (inList.length > 2000) throw new ConvexError("Liste de courses trop longue.");
    if (!image || image.length > MAX_IMAGE_CHARS)
      throw new ConvexError("Photo trop lourde ou vide.");
    // Short keys keep the prompt small and the answer easy to map back
    const listed = new Set(inList);
    const keys = new Map<string, Target>();
    const catalogLines: string[] = [];
    data.ingredients.forEach((i, n) => {
      keys.set(`i${n}`, { kind: "ingredient", id: i._id });
      catalogLines.push(
        `i${n} ${i.name}${listed.has(i._id) ? " [liste]" : ""}`,
      );
    });
    data.staples.forEach((s, n) => {
      keys.set(`s${n}`, { kind: "staple", id: s._id });
      catalogLines.push(
        `s${n} ${s.name}${listed.has(s._id) ? " [liste]" : ""}`,
      );
    });

    const answer = await askClaude({
      ctx,
      familyId: data.familyId,
      label: "receipt read",
      system: SYSTEM,
      schema: SCHEMA,
      maxTokens: 16000,
      content: [
        {
          type: "image",
          source: { type: "base64", media_type: "image/jpeg", data: image },
        },
        {
          type: "text",
          text: `Catalogue de la famille :\n${catalogLines.join("\n")}\n\nLis ce ticket.`,
        },
      ],
      messages: {
        missingKey:
          "La lecture des tickets n'est pas encore configurée (clé ANTHROPIC_API_KEY manquante).",
        refusal: "Ce ticket n'a pas pu être lu. Réessaie avec une autre photo.",
        tooLong: "Ticket trop long pour une seule lecture.",
        busy: "Trop de lectures en même temps. Réessaie dans une minute.",
        failed: "La lecture du ticket a échoué. Réessaie dans un moment.",
      },
    });

    let receipt;
    try {
      receipt = parseReceipt(answer);
    } catch (e) {
      throw new ConvexError(e instanceof Error ? e.message : "Réponse illisible.");
    }

    const aliases = new Map(
      data.aliases
        .filter((a) => a.chain === receipt.chain)
        .map((a) => [a.labelKey, a]),
    );
    const lines: ReadLine[] = receipt.lines.map((line) => {
      const alias =
        line.kind === "product" ? aliases.get(labelKey(line.label)) : undefined;
      if (alias) {
        const target: Target | null = alias.ingredientId
          ? { kind: "ingredient", id: alias.ingredientId }
          : alias.stapleId
            ? { kind: "staple", id: alias.stapleId }
            : null;
        return { ...line, target, packQty: alias.packQty ?? null, known: true };
      }
      const target =
        line.kind === "product" ? (keys.get(line.match) ?? null) : null;
      return { ...line, target, packQty: null, known: false };
    });
    const { sum, matches } = checkTotal(receipt);
    return {
      chain: receipt.chain,
      date: receipt.date,
      total: receipt.total,
      sum,
      totalMatches: matches,
      lines,
    };
  },
});

async function upsertPrice(
  db: FamilyWriter,
  row: Omit<Doc<"chainPrices">, "_id" | "_creationTime" | "familyId">,
) {
  const existing = (await db.query("chainPrices").collect()).filter((p) =>
    row.ingredientId ? p.ingredientId === row.ingredientId : p.stapleId === row.stapleId,
  );
  const same = existing.find((p) => p.chain === row.chain);
  if (!same) return db.insert("chainPrices", row);
  // An older receipt checked later must not overwrite a newer price
  if (same.observedOn <= row.observedOn) await db.patch(same._id, row);
}

const targetValidator = v.union(
  v.object({ kind: v.literal("ingredient"), id: v.id("ingredients") }),
  v.object({ kind: v.literal("staple"), id: v.id("staples") }),
);

/**
 * Saves a checked receipt: prices per chain, the labels learnt for next time,
 * and the off-list items the family wants as usual items.
 */
export const save = mutation({
  args: {
    token: v.string(),
    chain: chainValidator,
    date: v.string(),
    lines: v.array(
      v.object({
        label: v.string(),
        unitPrice: v.number(),
        weightKg: v.number(),
        pricePerKg: v.number(),
        target: v.union(targetValidator, v.null()),
        packQty: v.union(v.number(), v.null()),
        /** Name of a new usual item to create for an off-list line. */
        newStapleName: v.union(v.string(), v.null()),
      }),
    ),
  },
  handler: async (ctx, { token, chain, date, lines }) => {
    const { db } = await requireMemberWriter(ctx, token);
    assertDate(date);
    if (lines.length > 200) throw new ConvexError("Ticket trop long.");
    let prices = 0;
    let staples = 0;
    for (const line of lines) {
      const label = cleanText(line.label, 80, "Libellé");
      if (!label) continue;
      // v.number() lets NaN and Infinity through: a misread price must not reach the estimates
      const inRange = (n: number, max: number) => Number.isFinite(n) && n >= 0 && n <= max;
      if (!inRange(line.unitPrice, 10000) || !inRange(line.weightKg, 100) || !inRange(line.pricePerKg, 1000))
        throw new ConvexError(`Prix ou poids invalide pour « ${label} ».`);
      if (looksLikeCardNumber(label)) continue;
      if (line.packQty !== null)
        assertPositive(line.packQty, 100000, `Contenu du paquet « ${label} »`);
      let target = line.target;

      if (!target && line.newStapleName !== null) {
        const name = cleanText(line.newStapleName, 80, "Article");
        if (!name)
          throw new ConvexError("Le nom de l'article est obligatoire.");
        const existing = await db.index("staples", "by_family_name", (q) => q.eq("name", name))
          .first();
        const id =
          existing?._id ??
          (await db.insert("staples", {
            name,
            useCount: 0,
            priceChf: line.unitPrice || undefined,
          }));
        if (!existing) staples++;
        target = { kind: "staple", id };
      }

      if (target && !(await db.get(target.id)))
        throw new ConvexError(`Produit introuvable pour « ${label} ».`);

      // Remember how this chain prints the product, even when it is off the list
      const key = labelKey(label);
      const alias = await db.index("receiptAliases", "by_family_chain_label", (q) =>
          q.eq("chain", chain).eq("labelKey", key),
        )
        .first();
      const aliasRow = {
        chain,
        labelKey: key,
        ingredientId: target?.kind === "ingredient" ? target.id : undefined,
        stapleId: target?.kind === "staple" ? target.id : undefined,
        packQty: line.packQty ?? undefined,
      };
      if (alias) await db.replace(alias._id, aliasRow);
      else await db.insert("receiptAliases", aliasRow);

      if (target?.kind === "ingredient") {
        const ingredient = await db.get(target.id);
        if (!ingredient)
          throw new ConvexError(`Ingrédient introuvable pour « ${label} ».`);
        const problem =
          line.packQty !== null ? packContentProblem(ingredient.unit, line.packQty) : null;
        if (problem) throw new ConvexError(`« ${label} » : ${problem}`);
        const price = ingredientPrice(
          line,
          ingredient.unit,
          line.packQty ?? undefined,
        );
        if (price) {
          await upsertPrice(db, {
            chain,
            ingredientId: target.id,
            ...price,
            label,
            observedOn: date,
          });
          prices++;
        }
      } else if (target?.kind === "staple" && line.unitPrice > 0) {
        const staple = await db.get(target.id);
        if (!staple)
          throw new ConvexError(`Article introuvable pour « ${label} ».`);
        await upsertPrice(db, {
          chain,
          stapleId: target.id,
          priceChf: line.unitPrice,
          priceQty: 1,
          label,
          observedOn: date,
        });
        if (staple.priceChf === undefined)
          await db.patch(target.id, { priceChf: line.unitPrice });
        prices++;
      }
    }
    if (staples) await translateLater(ctx, db.familyId);
    return { prices, staples };
  },
});
