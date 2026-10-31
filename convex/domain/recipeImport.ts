// Recipe import: reading a recipe page, and turning Claude's answer into a
// draft the family checks in the recipe editor. Pure functions, no I/O.
import { sameFamily, toBase, UNITS, type Unit } from "./quantities";
import { searchKey } from "./text";

const MAX_PAGE_TEXT = 20_000;
const MAX_ITEMS = 60;
const MAX_STEPS = 50;

// ---------- Link checks ----------

/** First http(s) link of a pasted text (iOS shares « Titre https://… »), or the text as a bare domain. */
export function extractUrl(text: string): string | null {
  const found = text.match(/https?:\/\/[^\s<>"']+/i);
  if (found) return found[0].replace(/[).,;!?»]+$/, "");
  const bare = text.trim();
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(bare))
    return `https://${bare}`;
  return null;
}

const MIN_RECIPE_TEXT = 80;
const MAX_RECIPE_TEXT = 20_000;

/**
 * What the family pasted: a link (alone or inside a shared text) to read, or
 * the recipe text itself. null when it is neither.
 */
export function classifyInput(
  input: string,
): { kind: "url"; url: string } | { kind: "text"; text: string } | null {
  const text = input.trim();
  const url = extractUrl(text);
  // A link with a title around it is a shared link; a long text is the recipe
  if (url && text.replace(url, "").trim().length < 200)
    return { kind: "url", url };
  if (text.length >= MIN_RECIPE_TEXT)
    return { kind: "text", text: text.slice(0, MAX_RECIPE_TEXT) };
  return null;
}

/**
 * Throws unless the link points to a public web page: https, default port, a
 * domain name (no IP address, no local name). Protects the server from being
 * used to reach internal addresses.
 */
export function checkPublicUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Ce lien n'est pas valide.");
  }
  if (url.protocol !== "https:")
    throw new Error("Le lien doit commencer par https://.");
  if (url.username || url.password || url.port)
    throw new Error("Ce lien n'est pas accepté.");
  // « localhost. » with a final dot is the same host as « localhost »
  const host = url.hostname.toLowerCase().replace(/\.+$/, "");
  const isIp =
    /^[\d.]+$/.test(host) || host.includes(":") || host.startsWith("[");
  const local =
    !host.includes(".") ||
    // Public names that resolve to a private address on purpose
    /(^|\.)(nip\.io|sslip\.io|localtest\.me)$/.test(host) ||
    host === "localhost" ||
    /\.(localhost|local|internal|lan|home|intranet|corp|arpa)$/.test(host);
  if (isIp || local) throw new Error("Ce lien n'est pas accepté.");
  return url;
}

/** Image type read from the first bytes, not from what the server announces. */
export function imageTypeOf(
  bytes: Uint8Array,
): "image/jpeg" | "image/png" | "image/webp" | null {
  const at = (i: number, ...values: number[]) =>
    values.every((v, n) => bytes[i + n] === v);
  if (at(0, 0xff, 0xd8, 0xff)) return "image/jpeg";
  if (at(0, 0x89, 0x50, 0x4e, 0x47)) return "image/png";
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50))
    return "image/webp";
  return null;
}

// ---------- Dictation ----------

/** Five minutes of phone audio stay far below this; Groq accepts 25 MB. */
export const MAX_AUDIO_BYTES = 20_000_000;

const AUDIO_EXTENSIONS: Record<string, string> = {
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/aac": "m4a",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
};

/**
 * File name the transcription service needs to know the format, from the
 * recorder's type (« audio/webm;codecs=opus »). null for anything else.
 */
export function audioFileName(type: string): string | null {
  const ext = AUDIO_EXTENSIONS[type.split(";")[0].trim().toLowerCase()];
  return ext ? `dictee.${ext}` : null;
}

// ---------- Recipe page ----------

/** Recipe as published by a site in its schema.org data (JSON-LD). */
export interface PageRecipe {
  name: string;
  description: string;
  imageUrl: string | null;
  servings: number | null;
  minutes: number | null;
  ingredients: string[];
  steps: string[];
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  rsquo: "’",
  lsquo: "‘",
  laquo: "«",
  raquo: "»",
  hellip: "…",
  eacute: "é",
  egrave: "è",
  agrave: "à",
  ccedil: "ç",
  ocirc: "ô",
  ecirc: "ê",
  ucirc: "û",
  icirc: "î",
  acirc: "â",
  deg: "°",
  frac12: "½",
  frac14: "¼",
  frac34: "¾",
};

export function decodeEntities(text: string): string {
  return text.replace(
    /&(#x[\da-f]+|#\d+|[a-z]+\d*);/gi,
    (all, code: string) => {
      if (code[0] === "#") {
        const n =
          code[1] === "x" || code[1] === "X"
            ? parseInt(code.slice(2), 16)
            : parseInt(code.slice(1), 10);
        return Number.isFinite(n) && n > 0 && n < 0x110000
          ? String.fromCodePoint(n)
          : all;
      }
      return ENTITIES[code.toLowerCase()] ?? all;
    },
  );
}

/** Tags removed, entities decoded, spaces collapsed. */
function cleanHtml(text: string): string {
  return decodeEntities(text.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

/** Minutes of an ISO 8601 duration (« PT1H30M »), null when unreadable. */
export function parseIsoDuration(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const m = value.match(
    /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i,
  );
  if (!m || value.length < 3) return null;
  const [, d, h, min] = m.map((x) => Number(x ?? 0));
  const total = d * 1440 + h * 60 + min;
  return total > 0 ? total : null;
}

/** Number of servings from « 4 », « 4 personnes », ["4", "4 portions"]. */
export function parseServings(value: unknown): number | null {
  const list = Array.isArray(value) ? value : [value];
  for (const v of list) {
    const n =
      typeof v === "number"
        ? v
        : typeof v === "string"
          ? Number(v.match(/\d+/)?.[0])
          : NaN;
    if (Number.isInteger(n) && n >= 1 && n <= 50) return n;
  }
  return null;
}

function imageOf(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    for (const v of value) {
      const found = imageOf(v);
      if (found) return found;
    }
    return null;
  }
  if (value && typeof value === "object")
    return imageOf((value as { url?: unknown }).url);
  return null;
}

/** Steps from a string, a list of strings, HowToStep or HowToSection objects. */
function stepsOf(value: unknown): string[] {
  if (typeof value === "string") {
    const text = value.replace(/<\/(p|li)>|<br\s*\/?>/gi, "\n");
    return text.split(/\n+/).map(cleanHtml).filter(Boolean);
  }
  if (Array.isArray(value)) return value.flatMap(stepsOf);
  if (value && typeof value === "object") {
    const o = value as {
      itemListElement?: unknown;
      text?: unknown;
      name?: unknown;
    };
    if (o.itemListElement) return stepsOf(o.itemListElement);
    return stepsOf(o.text ?? o.name);
  }
  return [];
}

function isRecipe(node: unknown): node is Record<string, unknown> {
  if (!node || typeof node !== "object") return false;
  const type = (node as { "@type"?: unknown })["@type"];
  return type === "Recipe" || (Array.isArray(type) && type.includes("Recipe"));
}

function findRecipe(node: unknown, depth = 0): Record<string, unknown> | null {
  if (depth > 6 || !node || typeof node !== "object") return null;
  if (isRecipe(node)) return node;
  const children = Array.isArray(node)
    ? node
    : [
        (node as { "@graph"?: unknown })["@graph"],
        (node as { mainEntity?: unknown }).mainEntity,
      ];
  for (const child of children) {
    const found = findRecipe(child, depth + 1);
    if (found) return found;
  }
  return null;
}

/** The schema.org recipe published in the page, or null when there is none. */
export function extractPageRecipe(html: string): PageRecipe | null {
  const scripts = html.matchAll(
    /<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const [, body] of scripts) {
    let data: unknown;
    try {
      data = JSON.parse(body.trim());
    } catch {
      continue;
    }
    const r = findRecipe(data);
    if (!r) continue;
    const ingredients = (
      Array.isArray(r.recipeIngredient) ? r.recipeIngredient : []
    )
      .filter((i): i is string => typeof i === "string")
      .map(cleanHtml)
      .filter(Boolean);
    if (ingredients.length === 0) continue;
    return {
      name: typeof r.name === "string" ? cleanHtml(r.name) : "",
      description:
        typeof r.description === "string" ? cleanHtml(r.description) : "",
      imageUrl: imageOf(r.image),
      servings: parseServings(r.recipeYield),
      minutes:
        parseIsoDuration(r.totalTime) ?? sumMinutes(r.prepTime, r.cookTime),
      ingredients,
      steps: stepsOf(r.recipeInstructions),
    };
  }
  return null;
}

function sumMinutes(a: unknown, b: unknown): number | null {
  const total = (parseIsoDuration(a) ?? 0) + (parseIsoDuration(b) ?? 0);
  return total > 0 ? total : null;
}

/** Image announced for sharing (og:image), used when the recipe data has none. */
export function extractOgImage(html: string): string | null {
  const tag = html.match(/<meta[^>]+property=["']og:image["'][^>]*>/i)?.[0];
  const content = tag?.match(/content=["']([^"']+)["']/i)?.[1];
  return content ? decodeEntities(content) : null;
}

/** Readable text of a page without a recipe data block, for Claude to read. */
export function pageText(html: string): string {
  const body = html
    .replace(
      /<(script|style|noscript|svg|nav|footer|header|form)\b[\s\S]*?<\/\1>/gi,
      " ",
    )
    .replace(/<\/(p|div|li|h\d|tr|br)>|<br\s*\/?>/gi, "\n");
  return cleanHtml(body.replace(/\n/g, " ⏎ "))
    .replace(/( ⏎ )+/g, "\n")
    .slice(0, MAX_PAGE_TEXT);
}

/** Compact text of a page recipe, the source Claude structures. */
export function pageRecipeText(r: PageRecipe): string {
  return [
    `Titre : ${r.name}`,
    r.description && `Description : ${r.description}`,
    r.servings && `Portions : ${r.servings}`,
    r.minutes && `Temps total : ${r.minutes} min`,
    "Ingrédients :",
    ...r.ingredients.map((i) => `- ${i}`),
    "Préparation :",
    ...r.steps.map((s, n) => `${n + 1}. ${s}`),
  ]
    .filter(Boolean)
    .join("\n");
}

// ---------- Claude's answer → draft ----------

export interface AnswerItem {
  text: string;
  quantity: number; // for the whole recipe
  unit: Unit;
  match: string; // catalog key, "" for a new ingredient
  newName: string;
  newUnit: Unit;
  newAisle: string; // aisle key
}

export interface Answer {
  name: string;
  emoji: string;
  description: string;
  tags: string[];
  prepMinutes: number;
  fridgeDays: number;
  servings: number;
  steps: string[];
  items: AnswerItem[];
}

const isUnit = (u: unknown): u is Unit =>
  typeof u === "string" && (UNITS as string[]).includes(u);

// Control characters and characters that hide or reorder text on screen
// (zero-width, bidirectional overrides): a classic way to slip in instructions.
// The zero-width joiner stays: emojis such as 👩‍🍳 are built with it
const INVISIBLE =
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u00ad\u200b\u200c\u200e\u200f\u202a-\u202e\u2060-\u2064\u2066-\u2069\ufeff]/g;
// The fence around the source, in any bracket look-alike, with or without a slash
const FENCE_TAG = /[<\uff1c\u2039\u3008]\s*\/?\s*recette\b[^>\uff1e\u203a\u3009\n]{0,40}[>\uff1e\u203a\u3009]?/gi;

/**
 * Text from outside (recipe page, pasted text, dictation) fenced as data for
 * the prompt: invisible characters dropped and any fence tag inside it
 * removed, so the source can never close the fence and speak as the app.
 */
export function fenceSource(text: string): string {
  const clean = text.replace(INVISIBLE, "").replace(FENCE_TAG, "").trim();
  return `<recette>\n${clean}\n</recette>`;
}

/**
 * A text field of Claude's answer, made safe to show and save: no links, no
 * markup, no invisible characters. A recipe never needs them; an injected
 * instruction would use them to send the family somewhere else.
 */
function cleanField(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  return v
    .replace(INVISIBLE, "")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1") // markdown link or image: keep the words
    .replace(/<[^>]{0,200}>/g, "") // HTML tags
    .replace(/\b(?:https?:\/\/|www\.)\S+/gi, "") // web addresses
    .replace(/[—–]/g, "-")
    .replace(/[ \t]{2,}/g, " ")
    .trim()
    .slice(0, max);
}
const str = cleanField;

/** One emoji (with its modifiers) and nothing else; "" otherwise. */
function emojiOnly(v: unknown): string {
  const e = cleanField(v, 16);
  return /\p{Extended_Pictographic}/u.test(e) && !/[\p{L}\p{N}\s]/u.test(e) ? e : "";
}
/** Catalog or aisle key as given in the prompt (« i12 », « a3 »); "" otherwise. */
const keyOf = (v: unknown, prefix: "i" | "a") =>
  typeof v === "string" && new RegExp(`^${prefix}\\d{1,4}$`).test(v) ? v : "";
const num = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) ? v : 0;

/** Checks the shape of Claude's answer; throws a French message when it is unusable. */
export function parseAnswer(raw: unknown, tags: string[]): Answer {
  if (!raw || typeof raw !== "object") throw new Error("Réponse illisible.");
  const r = raw as Record<string, unknown>;
  const items = (Array.isArray(r.items) ? r.items : [])
    .slice(0, MAX_ITEMS)
    .flatMap((x): AnswerItem[] => {
      if (!x || typeof x !== "object") return [];
      const i = x as Record<string, unknown>;
      return [
        {
          text: str(i.text, 200),
          quantity: Math.max(0, num(i.quantity)),
          unit: isUnit(i.unit) ? i.unit : "pc",
          match: keyOf(i.match, "i"),
          newName: str(i.newName, 80),
          newUnit: isUnit(i.newUnit) ? i.newUnit : "pc",
          newAisle: keyOf(i.newAisle, "a"),
        },
      ];
    });
  const name = str(r.name, 100);
  if (!name || items.length === 0)
    throw new Error("Aucune recette trouvée à cette adresse.");
  return {
    name,
    emoji: emojiOnly(r.emoji) || "🍲",
    description: str(r.description, 500),
    tags: (Array.isArray(r.tags) ? r.tags : []).filter((t): t is string =>
      tags.includes(t as string),
    ),
    prepMinutes: Math.round(num(r.prepMinutes)),
    fridgeDays: Math.round(num(r.fridgeDays)),
    servings: Math.round(num(r.servings)),
    steps: (Array.isArray(r.steps) ? r.steps : [])
      .map((s) => str(s, 2000))
      .filter(Boolean)
      .slice(0, MAX_STEPS),
    items,
  };
}

/**
 * Quantity expressed in the unit of the chosen ingredient. Pieces always fit
 * (« 2 oignons »); spoons become ml, or grams as an estimate (`approx`). null
 * when no conversion makes sense: the family then types the quantity.
 */
export function fitQuantity(
  qty: number,
  unit: Unit,
  target: Unit,
): { qty: number; unit: Unit; approx: boolean } | null {
  if (unit === "pc" || sameFamily(unit, target))
    return { ...toBase(qty, unit), approx: false };
  // 1 c. à s. = 15 ml, about 15 g; 1 c. à c. = 5 ml, about 5 g
  const spoon = unit === "cs" ? 15 : unit === "cc" ? 5 : 0;
  const base = toBase(1, target).unit;
  if (spoon && (base === "ml" || base === "g"))
    return { qty: qty * spoon, unit: base, approx: base === "g" };
  return null;
}

/** Quantity per person, three decimals: 125 g for 8 gives 15.625 g, back to 125 g on the list. */
const round3 = (n: number) => Math.round(n * 1000) / 1000;

export function perPerson(total: number, servings: number): number {
  return round3(total / servings);
}

export interface CatalogIngredient {
  key: string;
  id: string;
  name: string;
  unit: Unit;
}

export interface CatalogAisle {
  key: string;
  id: string;
}

export interface DraftItem {
  text: string; // line as written in the source
  qtyPerPerson: number | null; // null: to type in the editor
  unit: Unit;
  ingredientId: string | null;
  newIngredient: { name: string; unit: Unit; aisleId: string } | null;
  check: boolean; // shown « à vérifier » in the editor
}

export interface Draft {
  name: string;
  emoji: string;
  description: string;
  tags: string[];
  prepMinutes: number;
  fridgeDays: number;
  defaultPersons: number;
  steps: string[];
  items: DraftItem[];
}

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

/**
 * Turns Claude's answer into a recipe draft: existing ingredients first (by
 * catalog key, then by name), new ones proposed with an aisle and a unit,
 * quantities brought back to one person.
 */
export function buildDraft(
  answer: Answer,
  catalog: { ingredients: CatalogIngredient[]; aisles: CatalogAisle[] },
  opts: { pageServings: number | null; defaultPersons: number },
): Draft {
  const byKey = new Map(catalog.ingredients.map((i) => [i.key, i]));
  const byName = new Map(
    catalog.ingredients.map((i) => [searchKey(i.name), i]),
  );
  const aisleByKey = new Map(catalog.aisles.map((a) => [a.key, a.id]));
  const servings = clamp(
    opts.pageServings ?? (answer.servings || opts.defaultPersons),
    1,
    50,
  );

  const items: DraftItem[] = [];
  for (const a of answer.items) {
    const existing =
      byKey.get(a.match) ??
      (a.newName ? byName.get(searchKey(a.newName)) : undefined);
    const targetUnit = existing ? existing.unit : a.newUnit;
    let fitted =
      a.quantity > 0 ? fitQuantity(a.quantity, a.unit, targetUnit) : null;
    let newUnit: Unit = toBase(1, a.newUnit).unit;
    // A new ingredient can simply take the unit the recipe uses (« 1 pincée de paprika »)
    if (!existing && !fitted && a.quantity > 0) {
      fitted = { ...toBase(a.quantity, a.unit), approx: false };
      newUnit = fitted.unit;
    }
    const item: DraftItem = {
      text: a.text,
      qtyPerPerson: fitted ? perPerson(fitted.qty, servings) : null,
      unit: fitted?.unit ?? toBase(1, targetUnit).unit,
      ingredientId: existing?.id ?? null,
      newIngredient: null,
      check: !fitted || fitted.approx,
    };
    if (!existing) {
      const name = a.newName || a.text;
      const aisleId = aisleByKey.get(a.newAisle) ?? catalog.aisles[0]?.id;
      if (!name || !aisleId) continue;
      item.newIngredient = {
        name: name.slice(0, 80),
        unit: newUnit,
        aisleId,
      };
      if (!aisleByKey.has(a.newAisle)) item.check = true;
    }
    // Same ingredient twice in the source (« sel » in the dough and the sauce): one line
    const twin = items.find(
      (x) =>
        x.unit === item.unit &&
        x.qtyPerPerson !== null &&
        item.qtyPerPerson !== null &&
        (item.ingredientId
          ? x.ingredientId === item.ingredientId
          : x.newIngredient &&
            searchKey(x.newIngredient.name) ===
              searchKey(item.newIngredient!.name)),
    );
    if (twin) {
      twin.qtyPerPerson = round3(twin.qtyPerPerson! + item.qtyPerPerson!);
      twin.text = `${twin.text} ; ${item.text}`;
      continue;
    }
    items.push(item);
  }

  return {
    name: answer.name,
    emoji: answer.emoji,
    description: answer.description,
    tags: answer.tags,
    prepMinutes: clamp(Math.round(answer.prepMinutes / 5) * 5 || 30, 5, 300),
    fridgeDays: clamp(answer.fridgeDays, 0, 7),
    defaultPersons: clamp(servings, 1, 12),
    steps: answer.steps,
    items,
  };
}
