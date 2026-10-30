// Entry password of the online test version (dev.menumaison.ch). A curtain over
// the test site, not the app's security: every function still needs a session,
// and sign-ups stay closed there.
import type { Limit } from "./auth";

/** The whole deployment: 10 tries in 10 minutes, then 15 minutes locked. */
export const DEV_GATE_LIMIT: Limit = {
  max: 10,
  windowMs: 10 * 60_000,
  lockMs: 15 * 60_000,
};

/** Longer than this is not a password typed by PA: refused before any work. */
export const DEV_GATE_MAX_LENGTH = 200;

export type DevGateAnswer =
  | { ok: true; ticket: string }
  | { ok: false; reason: "wrong" | "closed" }
  | { ok: false; reason: "locked"; retryAt: number };

/** Same length and same characters, compared in a time that does not depend on where they differ. */
export function sameText(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Text hashed into the ticket kept on the device: changing the password voids every ticket. */
export function ticketSource(password: string): string {
  return `menu-maison-dev-gate:${password}`;
}
