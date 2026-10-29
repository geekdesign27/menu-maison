// Which surface an address opens: the public landing page or the family app.
// The app keeps its fragment routes (#/f/<famille>, #/activer/<lien>, #/courses…),
// so every existing link and installed home-screen app opens as before.

/** Sign-in screen of the app, as linked from the landing page. */
export const LOGIN_HASH = "#/connexion";
/** The landing page, even on a signed-in phone. */
export const LANDING_HASH = "#/decouvrir";
/** The landing page at its price (« Je n'ai pas de compte » on the sign-in screen). */
export const PRICING_HASH = "#/tarif";
/** Former address of the « no invitation » message: now the price as well. */
const OLD_NO_INVITE_HASH = "#/sans-invitation";
/** Sign-up form of the app (convex/stripeNode.ts startCheckout). */
export const SIGNUP_HASH = "#/essai";

/** The three legal pages, open to everyone (landing surface, no Convex). */
export const LEGAL_HASHES = {
  mentions: "#/mentions-legales",
  conditions: "#/conditions",
  confidentialite: "#/confidentialite",
} as const;
export type LegalDoc = keyof typeof LEGAL_HASHES;

export const LANDING_TITLE =
  "Menu Maison · Les menus de la semaine, les recettes et les courses en famille";

export type Entry = "landing" | "app";

function pathOf(hash: string) {
  return hash.replace(/^#/, "").replace(/\/+$/, "") || "/";
}

/** The legal page an address opens, or null. */
export function legalDocFor(hash: string): LegalDoc | null {
  const path = pathOf(hash);
  const found = Object.entries(LEGAL_HASHES).find(([, h]) => pathOf(h) === path);
  return found ? (found[0] as LegalDoc) : null;
}

/**
 * The bare address shows the landing page to visitors and the week to
 * signed-in phones; the landing paths always show the landing page.
 */
export function entryFor(hash: string, signedIn: boolean): Entry {
  const path = pathOf(hash);
  if ([LANDING_HASH, PRICING_HASH, OLD_NO_INVITE_HASH].some((h) => path === pathOf(h)))
    return "landing";
  if (legalDocFor(hash)) return "landing";
  return path === "/" && !signedIn ? "landing" : "app";
}

/** The landing page opens scrolled to its price. */
export function opensPricing(hash: string) {
  const path = pathOf(hash);
  return path === pathOf(PRICING_HASH) || path === pathOf(OLD_NO_INVITE_HASH);
}

/**
 * The « Essayer 7 jours gratuits » button: always while developing, in
 * production once VITE_SIGNUP_OPEN is « 1 » (with SIGNUP_OPEN in Convex, S7).
 */
export function signupVisible(raw: string | undefined, dev: boolean): boolean {
  return dev || raw?.trim() === "1";
}

/**
 * Contact link for « En parler avec P-A », from VITE_CONTACT_URL at build time.
 * Only e-mail, phone and https links are accepted; anything else hides the button.
 */
export function contactHref(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  return /^(mailto:[^\s@]+@[^\s@]+|tel:\+?[0-9 ]{6,}|https:\/\/\S+)$/i.test(value)
    ? value
    : null;
}
