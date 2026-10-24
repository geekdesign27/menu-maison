import {
  action,
  internalMutation,
  internalQuery,
  mutation,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { ConvexError, v } from "convex/values";
import { assertSession, cleanText } from "./lib";
import { offValidator } from "./schema";
import { parseOffProduct, type OffHit } from "./domain/openFoodFacts";
import type { Id } from "./_generated/dataModel";

// Open Food Facts asks every client to name itself
const USER_AGENT =
  "MenuMaison/1.0 (app familiale, github.com/geekdesign27/menu-maison)";
const SEARCH_URL = "https://search.openfoodfacts.org/search";
const IMAGE_HOST = "images.openfoodfacts.org";
const MAX_IMAGE_BYTES = 2_000_000;
// SVG is left out: it can carry scripts
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const FIELDS = [
  "code",
  "product_name",
  "product_name_fr",
  "brands",
  "image_front_url",
  "image_front_small_url",
  "allergens_tags",
  "nutriscore_grade",
  "nutriments",
  "nutrition_data_per",
  "categories_tags",
  "quantity",
].join(",");

const UNAVAILABLE =
  "Open Food Facts ne répond pas pour l'instant. Crée l'ingrédient à la main ou réessaie plus tard.";

async function searchHits(q: string, pageSize: number): Promise<OffHit[]> {
  const url = `${SEARCH_URL}?q=${encodeURIComponent(q)}&page_size=${pageSize}&langs=fr&fields=${FIELDS}`;
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new ConvexError(UNAVAILABLE);
  }
  if (response.status === 429)
    throw new ConvexError(
      "Open Food Facts reçoit trop de recherches. Réessaie dans une minute.",
    );
  if (!response.ok) throw new ConvexError(UNAVAILABLE);
  const body = (await response.json().catch(() => null)) as {
    hits?: unknown[];
  } | null;
  return (body?.hits ?? [])
    .map(parseOffProduct)
    .filter((h): h is OffHit => h !== null);
}

export const checkSession = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await assertSession(ctx, token);
  },
});

/** Products matching a name, those sold in Switzerland first. */
export const search = action({
  args: { token: v.string(), query: v.string() },
  handler: async (ctx, { token, query }): Promise<OffHit[]> => {
    await ctx.runQuery(internal.openFoodFacts.checkSession, { token });
    // Quotes, colons and brackets are query syntax for the search engine
    const words = cleanText(query, 60, "Recherche")
      .replace(/[":()[\]{}\\]/g, " ")
      .trim();
    if (words.length < 2) return [];
    const swiss = await searchHits(
      `${words} countries_tags:"en:switzerland"`,
      12,
    );
    return swiss.length > 0 ? swiss : searchHits(words, 12);
  },
});

export const importTarget = internalQuery({
  args: { id: v.id("ingredients"), code: v.string() },
  handler: async (ctx, { id, code }) => {
    const ingredient = await ctx.db.get(id);
    if (!ingredient) throw new ConvexError("Ingrédient introuvable.");
    const all = await ctx.db.query("ingredients").collect();
    const other = all.find((i) => i._id !== id && i.off?.code === code);
    return { hasImage: !!ingredient.imageId, linkedTo: other?.name ?? null };
  },
});

export const attach = internalMutation({
  args: {
    id: v.id("ingredients"),
    off: offValidator,
    imageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, { id, off, imageId }) => {
    const ingredient = await ctx.db.get(id);
    if (!ingredient) throw new ConvexError("Ingrédient introuvable.");
    // A photo the family chose in the meantime wins over the product photo
    await ctx.db.patch(id, {
      off,
      ...(imageId && !ingredient.imageId ? { imageId } : {}),
    });
  },
});

/** Downloads the product photo into Convex storage; null when unavailable. */
async function storeImage(
  store: (blob: Blob) => Promise<Id<"_storage">>,
  url: string | undefined,
): Promise<Id<"_storage"> | null> {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.hostname !== IMAGE_HOST) return null;
    const response = await fetch(parsed, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(8000),
      // A redirect could leave the checked host
      redirect: "error",
    });
    const type = (response.headers.get("content-type") ?? "").split(";")[0].trim();
    if (!response.ok || !IMAGE_TYPES.includes(type)) return null;
    const announced = Number(response.headers.get("content-length") ?? 0);
    if (announced > MAX_IMAGE_BYTES) return null;
    const blob = await response.blob();
    if (blob.size > MAX_IMAGE_BYTES) return null;
    return await store(blob);
  } catch {
    // The photo is a bonus: allergens and nutrition are kept without it
    return null;
  }
}

/**
 * Links an ingredient to an Open Food Facts product: allergens, nutrition, and
 * the product photo when the ingredient has none yet.
 */
export const importProduct = action({
  args: { token: v.string(), id: v.id("ingredients"), code: v.string() },
  handler: async (
    ctx,
    { token, id, code },
  ): Promise<{ imageId: Id<"_storage"> | null; imageUrl: string | null }> => {
    await ctx.runQuery(internal.openFoodFacts.checkSession, { token });
    if (!/^\d{4,14}$/.test(code))
      throw new ConvexError("Code-barres invalide.");
    const target = await ctx.runQuery(internal.openFoodFacts.importTarget, {
      id,
      code,
    });
    if (target.linkedTo)
      throw new ConvexError(
        `Ce produit est déjà lié à « ${target.linkedTo} ».`,
      );
    const [hit] = (await searchHits(`code:${code}`, 1)).filter(
      (h) => h.code === code,
    );
    if (!hit) throw new ConvexError("Produit introuvable sur Open Food Facts.");
    const imageId = target.hasImage
      ? null
      : await storeImage((blob) => ctx.storage.store(blob), hit.imageUrl);
    await ctx.runMutation(internal.openFoodFacts.attach, {
      id,
      off: {
        code: hit.code,
        productName: hit.productName,
        allergens: hit.allergens,
        nutriscore: hit.nutriscore,
        per100: hit.per100,
        fetchedAt: Date.now(),
      },
      imageId: imageId ?? undefined,
    });
    // Returned so an open form can show the photo and keep it when saved
    return { imageId, imageUrl: imageId ? await ctx.storage.getUrl(imageId) : null };
  },
});

/** Unlinks the product: allergens and nutrition go, the photo stays. */
export const detach = mutation({
  args: { token: v.string(), id: v.id("ingredients") },
  handler: async (ctx, { token, id }) => {
    await assertSession(ctx, token);
    if (!(await ctx.db.get(id)))
      throw new ConvexError("Ingrédient introuvable.");
    await ctx.db.patch(id, { off: undefined });
  },
});
