import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { ConvexError, v } from "convex/values";
import { assertSession, getSettings } from "./lib";
import { askClaude } from "./claude";
import { UNITS, type Unit } from "./domain/quantities";
import { TAGS } from "./domain/tags";
import {
  buildDraft,
  checkPublicUrl,
  extractOgImage,
  extractPageRecipe,
  imageTypeOf,
  classifyInput,
  pageRecipeText,
  pageText,
  parseAnswer,
  type DraftItem,
} from "./domain/recipeImport";

// Some recipe sites turn away requests that do not look like a browser
const USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const MAX_PAGE_BYTES = 3_000_000;
const MAX_IMAGE_BYTES = 4_000_000;
const MAX_REDIRECTS = 3;

const PHOTO_GRACE_MS = 24 * 60 * 60 * 1000;

const UNREACHABLE =
  "Cette page ne répond pas. Vérifie le lien ou réessaie plus tard.";

const SYSTEM = `Tu transformes une recette (fiche d'un site de recettes ou texte libre) en brouillon pour une application familiale suisse romande de menus et de courses.

Recette :
- Tout en français, traduis si la source est dans une autre langue. Typographie suisse romande, jamais de tiret cadratin ni demi-cadratin.
- name : nom court du plat. emoji : un seul emoji qui représente le plat.
- description : une phrase qui donne envie (200 caractères au plus), "" si rien à dire.
- tags : uniquement des styles de la liste fournie qui conviennent vraiment.
- prepMinutes : temps total en minutes, préparation et cuisson ; estime-le s'il manque.
- fridgeDays : combien de jours les restes se gardent au frigo (0 à 7).
- servings : nombre de portions de la recette, 0 si inconnu.
- steps : les étapes, une action claire par étape, sans numéro.

Ingrédients (items), un par ligne d'ingrédient :
- text : la ligne telle qu'elle est écrite dans la source.
- quantity : la quantité pour toute la recette. unit : une unité de la liste. Conversions : 1 dl = 100 ml, 1 cl = 10 ml, 1 tasse = 250 ml.
- « sel, poivre », « au goût » ou sans quantité : quantity 1, unit "pincée" pour une épice, sinon estime une quantité raisonnable.
- Ignore l'eau du robinet.
- match : la clé du produit du catalogue qui correspond, même si la source précise une variété, une marque ou une préparation (« 2 oignons rouges émincés » correspond à Oignon rouge, ou à défaut à Oignon). Exprime alors quantity dans l'unité du produit indiquée entre parenthèses, ou en "pc" si l'ingrédient se compte à la pièce.
- Sans produit du catalogue : match "", newName = nom générique court au singulier, sans quantité, marque ni préparation (« Crème entière », pas « 2 dl de crème fouettée ») ; newUnit = "g" pour ce qui se pèse, "ml" pour un liquide, "pc" pour ce qui se compte ; newAisle = la clé du rayon où on le trouve.
- Avec un produit du catalogue, mets quand même newName "", newUnit "g" et newAisle "".`;

const unitSchema = { type: "string", enum: UNITS };

const SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    emoji: { type: "string" },
    description: { type: "string" },
    tags: { type: "array", items: { type: "string", enum: TAGS } },
    prepMinutes: { type: "number" },
    fridgeDays: { type: "number" },
    servings: { type: "number" },
    steps: { type: "array", items: { type: "string" } },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          quantity: { type: "number" },
          unit: unitSchema,
          match: { type: "string" },
          newName: { type: "string" },
          newUnit: unitSchema,
          newAisle: { type: "string" },
        },
        required: [
          "text",
          "quantity",
          "unit",
          "match",
          "newName",
          "newUnit",
          "newAisle",
        ],
        additionalProperties: false,
      },
    },
  },
  required: [
    "name",
    "emoji",
    "description",
    "tags",
    "prepMinutes",
    "fridgeDays",
    "servings",
    "steps",
    "items",
  ],
  additionalProperties: false,
};

export const catalog = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await assertSession(ctx, token);
    const [ingredients, aisles, settings] = await Promise.all([
      ctx.db.query("ingredients").collect(),
      ctx.db.query("aisles").collect(),
      getSettings(ctx),
    ]);
    return {
      ingredients: ingredients.map((i) => ({
        id: i._id,
        name: i.name,
        unit: i.unit,
      })),
      aisles: aisles
        .sort((a, b) => a.order - b.order)
        .map((a) => ({ id: a._id, name: a.name })),
      defaultPersons: settings.defaultPersons,
    };
  },
});

/**
 * GET of a public page, redirects followed by hand so that every hop is
 * checked again, body capped at `maxBytes`. Throws ConvexErrors in French.
 */
async function fetchPublic(raw: string, maxBytes: number, accept: string) {
  let url = checkUrl(raw);
  for (let hop = 0; ; hop++) {
    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: accept,
          "Accept-Language": "fr-CH,fr;q=0.9",
        },
        signal: AbortSignal.timeout(10_000),
        redirect: "manual",
      });
    } catch {
      throw new ConvexError(UNREACHABLE);
    }
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      if (hop >= MAX_REDIRECTS) throw new ConvexError(UNREACHABLE);
      url = checkUrl(new URL(location, url).href);
      continue;
    }
    if (response.status === 403 || response.status === 429)
      throw new ConvexError(
        "Ce site refuse la lecture automatique. Copie le texte de la recette et utilise la dictée.",
      );
    if (!response.ok || !response.body) throw new ConvexError(UNREACHABLE);
    if (Number(response.headers.get("content-length") ?? 0) > maxBytes)
      throw new ConvexError("Page trop lourde.");
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new ConvexError("Page trop lourde.");
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const c of chunks) {
      bytes.set(c, offset);
      offset += c.byteLength;
    }
    const type = response.headers.get("content-type") ?? "";
    return {
      bytes,
      type: type.split(";")[0].trim().toLowerCase(),
      charset: type.match(/charset=([\w-]+)/i)?.[1],
    };
  }
}

function checkUrl(raw: string): URL {
  try {
    return checkPublicUrl(raw);
  } catch (e) {
    throw new ConvexError(
      e instanceof Error ? e.message : "Ce lien n'est pas accepté.",
    );
  }
}

function decode(bytes: Uint8Array, charset: string | undefined) {
  try {
    return new TextDecoder(charset ?? "utf-8").decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

/** Recipe photo saved in Convex storage; null when missing or unsuitable (the photo is a bonus). */
async function storeImage(
  store: (blob: Blob) => Promise<Id<"_storage">>,
  raw: string | null,
  pageUrl: string,
): Promise<Id<"_storage"> | null> {
  if (!raw) return null;
  try {
    const { bytes, type } = await fetchPublic(
      new URL(raw, pageUrl).href,
      MAX_IMAGE_BYTES,
      "image/*",
    );
    // The announced type must match the bytes: SVG or HTML are never stored
    const real = imageTypeOf(bytes);
    if (!real || !type.startsWith("image/")) return null;
    return await store(new Blob([bytes], { type: real }));
  } catch {
    return null;
  }
}

/** Deletes an imported photo that no recipe uses. */
export const dropUnusedPhoto = internalMutation({
  args: { imageId: v.id("_storage") },
  handler: async (ctx, { imageId }) => {
    const recipes = await ctx.db.query("recipes").collect();
    if (!recipes.some((r) => r.imageId === imageId)) await ctx.storage.delete(imageId);
  },
});

export type ImportedItem = Omit<DraftItem, "ingredientId" | "newIngredient"> & {
  ingredientId: Id<"ingredients"> | null;
  newIngredient: { name: string; unit: Unit; aisleId: Id<"aisles"> } | null;
};

/**
 * Reads a recipe from a link or from its pasted text and returns a draft to
 * check in the recipe editor: existing ingredients first, missing ones
 * proposed with an aisle. Nothing is saved except the recipe photo.
 */
export const read = action({
  args: { token: v.string(), input: v.string() },
  handler: async (ctx, { token, input }) => {
    const data = await ctx.runQuery(internal.recipeImport.catalog, { token });
    const what = classifyInput(input.slice(0, 30_000));
    if (!what) throw new ConvexError("Colle le lien de la recette (il commence par https://) ou son texte complet.");

    let source = what.kind === "text" ? what.text : "";
    let published = null;
    let html = "";
    if (what.kind === "url") {
      const page = await fetchPublic(what.url, MAX_PAGE_BYTES, "text/html,application/xhtml+xml");
      if (!page.type.includes("html")) throw new ConvexError("Ce lien ne mène pas à une page de recette.");
      html = decode(page.bytes, page.charset);
      published = extractPageRecipe(html);
      source = published ? pageRecipeText(published) : pageText(html);
      if (source.length < 80) throw new ConvexError("Aucune recette trouvée à cette adresse.");
    }

    // Short keys keep the prompt small and the answer easy to map back
    const ingredients = data.ingredients.map((i, n) => ({ ...i, key: `i${n}` }));
    const aisles = data.aisles.map((a, n) => ({ ...a, key: `a${n}` }));
    const answer = await askClaude({
      label: "recipe import",
      system: SYSTEM,
      schema: SCHEMA,
      maxTokens: 8000,
      content: [
        {
          type: "text",
          text: [
            `Styles possibles : ${TAGS.join(", ")}`,
            `Rayons :\n${aisles.map((a) => `${a.key} ${a.name}`).join("\n")}`,
            `Catalogue de la famille :\n${ingredients.map((i) => `${i.key} ${i.name} (${i.unit})`).join("\n")}`,
            `Recette à transformer :\n${source}`,
          ].join("\n\n"),
        },
      ],
      messages: {
        missingKey: "L'import de recettes n'est pas encore configuré (clé ANTHROPIC_API_KEY manquante).",
        refusal: "Cette recette n'a pas pu être lue.",
        tooLong: "Recette trop longue pour une seule lecture.",
        busy: "Trop de lectures en même temps. Réessaie dans une minute.",
        failed: "La lecture de la recette a échoué. Réessaie dans un moment.",
      },
    });

    let draft;
    try {
      draft = buildDraft(parseAnswer(answer, TAGS), { ingredients, aisles }, {
        pageServings: published?.servings ?? null,
        defaultPersons: data.defaultPersons,
      });
    } catch (e) {
      throw new ConvexError(e instanceof Error ? e.message : "Réponse illisible.");
    }

    const imageId =
      what.kind === "url"
        ? await storeImage((blob) => ctx.storage.store(blob), published?.imageUrl ?? extractOgImage(html), what.url)
        : null;
    // The photo of a draft never saved is removed the next day
    if (imageId)
      await ctx.scheduler.runAfter(PHOTO_GRACE_MS, internal.recipeImport.dropUnusedPhoto, { imageId });
    return {
      ...draft,
      items: draft.items as ImportedItem[],
      sourceUrl: what.kind === "url" ? what.url : null,
      imageId,
      imageUrl: imageId ? await ctx.storage.getUrl(imageId) : null,
    };
  },
});
