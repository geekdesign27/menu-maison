// Sign-in names and passwords. Pure functions; hashing uses Web Crypto,
// available in Convex, in browsers and in Node.

export const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 200;
// OWASP 2023 guidance for PBKDF2-HMAC-SHA256
const ITERATIONS = 600_000;
const SALT_BYTES = 16;
const HASH_BITS = 256;

/** « Clara », « clara » and « CLARA » are the same sign-in name. */
export function normalizeName(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

const NAME = /^[a-z0-9][a-z0-9._-]{1,29}$/;

/** French reason why a pseudo or family link name is refused, or null when it is fine. */
export function nameProblem(
  normalized: string,
  what: "Le pseudo" | "Le nom du lien",
): string | null {
  if (normalized.length < 2 || normalized.length > 30)
    return `${what} doit faire entre 2 et 30 caractères.`;
  if (!NAME.test(normalized))
    return `${what} ne peut contenir que des lettres sans accent, des chiffres, des points et des tirets.`;
  return null;
}

/** French reason why a password is refused, or null when it is fine. */
export function passwordProblem(
  password: string,
  avoid: string[] = [],
): string | null {
  if (password.length < MIN_PASSWORD_LENGTH)
    return `Le mot de passe doit faire au moins ${MIN_PASSWORD_LENGTH} caractères.`;
  if (password.length > MAX_PASSWORD_LENGTH) return "Mot de passe trop long.";
  // The pseudo and the family name are known to others: not in the password
  const plain = normalizeName(password);
  if (
    avoid.some(
      (word) => word.length >= 3 && plain.includes(normalizeName(word)),
    )
  )
    return "Le mot de passe ne doit contenir ni ton pseudo ni le nom de la famille.";
  if (COMMON.has(plain))
    return "Ce mot de passe est trop courant, choisis-en un autre.";
  return null;
}

// A few of the most used passwords of 8 characters or more
const COMMON = new Set([
  "password",
  "motdepasse",
  "12345678",
  "123456789",
  "1234567890",
  "azertyuiop",
  "qwertzuiop",
  "azerty123",
  "password1",
  "iloveyou",
  "11111111",
  "00000000",
  "abcd1234",
  "soleil123",
]);

/** Family link name proposed from its display name: « Famille Schütz » → « schutz ». */
export function slugFromName(name: string): string {
  return normalizeName(name)
    .replace(/^famille\s+/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}

/** Pseudo proposed from a first name: « Pierre-Alain » → « pierre-alain ». */
export function pseudoFromName(name: string): string {
  const pseudo = normalizeName(name)
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/^[._-]+/, "")
    .slice(0, 30);
  return nameProblem(pseudo, "Le pseudo") ? "membre" : pseudo;
}

const toHex = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
const fromHex = (hex: string) =>
  Uint8Array.from((hex.match(/../g) ?? []).map((h) => parseInt(h, 16)));

async function pbkdf2(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    HASH_BITS,
  );
  return new Uint8Array(bits);
}

/** Stored form of a password: algorithm, iterations, salt and hash. */
export async function hashPassword(
  password: string,
  iterations = ITERATIONS,
): Promise<string> {
  const salt = crypto.getRandomValues(
    new Uint8Array(new ArrayBuffer(SALT_BYTES)),
  );
  return `pbkdf2-sha256$${iterations}$${toHex(salt)}$${toHex(await pbkdf2(password, salt, iterations))}`;
}

/** Same hash, compared in constant time. A malformed stored value never matches. */
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [algo, iter, saltHex, hashHex] = stored.split("$");
  const iterations = Number(iter);
  if (
    algo !== "pbkdf2-sha256" ||
    !Number.isInteger(iterations) ||
    iterations < 1 ||
    !saltHex ||
    !hashHex
  )
    return false;
  const actual = await pbkdf2(password, fromHex(saltHex), iterations);
  const expected = fromHex(hashHex);
  let diff = actual.length ^ expected.length;
  for (let i = 0; i < Math.max(actual.length, expected.length); i++)
    diff |= (actual[i] ?? 0) ^ (expected[i] ?? 0);
  return diff === 0;
}

/**
 * Hash of a password nobody has, checked when the pseudo does not exist so that
 * an unknown pseudo takes as long as a wrong password.
 */
export const DECOY_HASH = `pbkdf2-sha256$${ITERATIONS}$00000000000000000000000000000000$${"0".repeat(64)}`;

/** Random token for a session or an invitation link (URL-safe). */
export function randomToken(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(32)));
}

// ---------- Attempt limits ----------

export interface Guard {
  failures: number; // attempts counted in the current window
  lastFailureAt: number; // start of the current window
  lockedUntil: number;
}

export interface Limit {
  max: number; // attempts allowed per window
  windowMs: number;
  lockMs: number; // pause once the limit is passed
}

/** 5 tries on one pseudo within 10 minutes, then 5 minutes of pause. */
export const PER_NAME: Limit = {
  max: 5,
  windowMs: 10 * 60_000,
  lockMs: 5 * 60_000,
};
/** The whole deployment: hashing is costly, 30 sign-ins or activations a minute at most. */
export const GLOBAL: Limit = { max: 30, windowMs: 60_000, lockMs: 60_000 };

/**
 * Books one attempt before any password is hashed. Every attempt counts (a
 * success clears the pseudo's guard afterwards), so parallel requests cannot
 * slip past the limit, and a lock is never shortened.
 */
export function reserveAttempt(
  guard: Guard | null,
  now: number,
  limit: Limit,
): { allowed: boolean; retryAt: number; next: Guard } {
  if (guard && guard.lockedUntil > now)
    return { allowed: false, retryAt: guard.lockedUntil, next: guard };
  const inWindow = !!guard && now - guard.lastFailureAt < limit.windowMs;
  const attempts = (inWindow ? guard.failures : 0) + 1;
  if (attempts > limit.max) {
    const lockedUntil = now + limit.lockMs;
    return {
      allowed: false,
      retryAt: lockedUntil,
      next: { failures: 0, lastFailureAt: now, lockedUntil },
    };
  }
  return {
    allowed: true,
    retryAt: 0,
    next: {
      failures: attempts,
      lastFailureAt: inWindow ? guard.lastFailureAt : now,
      lockedUntil: 0,
    },
  };
}
