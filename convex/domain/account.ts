// Self-service account rules: a member's e-mail, forgotten passwords, and the
// family's export and deletion. Pure functions, tested with Vitest.
import type { Limit } from "./auth";

export const MAX_EMAIL_LENGTH = 254;
/** A reset link sent by e-mail: 2 hours (a link from the admin lasts 2 days). */
export const RESET_EMAIL_HOURS = 2;
/** The link confirming a new e-mail address. */
export const EMAIL_CONFIRM_HOURS = 24;

/** 3 reset e-mails an hour per address: nobody floods a mailbox. */
export const RESET_LIMIT: Limit = {
  max: 3,
  windowMs: 60 * 60_000,
  lockMs: 60 * 60_000,
};
/** Reset e-mails for the whole site: 60 an hour (apart from sign-ins' own limit). */
export const RESET_ALL_LIMIT: Limit = { max: 60, windowMs: 60 * 60_000, lockMs: 10 * 60_000 };
/** Confirmation e-mails per family and for the whole site: menumaison.ch never sends many. */
export const FAMILY_EMAIL_LIMIT: Limit = { max: 10, windowMs: 60 * 60_000, lockMs: 60 * 60_000 };
export const ALL_EMAIL_LIMIT: Limit = { max: 100, windowMs: 60 * 60_000, lockMs: 10 * 60_000 };
/** 5 changes of e-mail an hour per member. */
export const EMAIL_LIMIT: Limit = {
  max: 5,
  windowMs: 60 * 60_000,
  lockMs: 60 * 60_000,
};

/** Lowercase, without spaces: one address is written one way only. */
export function normalizeEmail(text: string): string {
  return text.trim().toLowerCase();
}

/** Why an address cannot be used, or null. */
export function emailProblem(email: string): string | null {
  if (!email) return "Indique une adresse e-mail.";
  if (email.length > MAX_EMAIL_LENGTH)
    return "Cette adresse e-mail est trop longue.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return "Cette adresse e-mail n'est pas valable.";
  return null;
}

/**
 * Deleting a family is confirmed by typing its name: same letters, whatever
 * the capitals, accents typed or not, or spaces around.
 */
export function deleteConfirmMatches(
  typed: string,
  familyName: string,
): boolean {
  const simple = (s: string) =>
    s
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  return simple(typed) !== "" && simple(typed) === simple(familyName);
}

/** Fields never handed out in an export: secrets and sign-in links. */
const SECRET_FIELDS = new Set([
  "passwordHash",
  "emailTokenHash",
  "emailTokenExpiresAt",
  "familyId",
]);

/** A document as exported: without its secrets and without the family's id on each row. */
export function exportable<T extends Record<string, unknown>>(
  doc: T,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(doc).filter(([key]) => !SECRET_FIELDS.has(key)),
  );
}

/** File name of the export: « menu-maison-dupont-2026-10-28.json ». */
export function exportFileName(slug: string, isoDay: string): string {
  return `menu-maison-${slug}-${isoDay}.json`;
}
