// What this device remembers between openings. Kept apart from the session so
// that the public landing page can tell a signed-in phone without loading Convex.

export const TOKEN_KEY = "mm.token";
export const FAMILY_KEY = "mm.family";

export function readStored(key: string) {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

export function writeStored(key: string, value: string) {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    // Private mode: the session simply lasts as long as the tab
  }
}

/** True when this device keeps a sign-in token (not checked by the server yet). */
export function hasStoredToken() {
  return readStored(TOKEN_KEY) !== "";
}
