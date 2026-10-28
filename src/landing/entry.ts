// Which surface an address opens: the public landing page or the family app.
// The app keeps its fragment routes (#/f/<famille>, #/activer/<lien>, #/courses…),
// so every existing link and installed home-screen app opens as before.

/** Sign-in screen of the app, as linked from the landing page. */
export const LOGIN_HASH = "#/connexion";
/** The landing page, even on a signed-in phone. */
export const LANDING_HASH = "#/decouvrir";
/** The landing page with the « no invitation » message open (linked from the sign-in screen). */
export const NO_INVITE_HASH = "#/sans-invitation";

export const LANDING_TITLE =
  "Menu Maison · Les menus de la semaine, les recettes et les courses en famille";

export type Entry = "landing" | "app";

function pathOf(hash: string) {
  return hash.replace(/^#/, "").replace(/\/+$/, "") || "/";
}

/**
 * The bare address shows the landing page to visitors and the week to
 * signed-in phones; the landing paths always show the landing page.
 */
export function entryFor(hash: string, signedIn: boolean): Entry {
  const path = pathOf(hash);
  if (path === pathOf(LANDING_HASH) || path === pathOf(NO_INVITE_HASH))
    return "landing";
  return path === "/" && !signedIn ? "landing" : "app";
}

export function opensNoInvite(hash: string) {
  return pathOf(hash) === pathOf(NO_INVITE_HASH);
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
