import { describe, expect, it } from "vitest";
import {
  DECOY_HASH,
  hashPassword,
  nameProblem,
  normalizeName,
  passwordProblem,
  PER_NAME,
  reserveAttempt,
  randomToken,
  slugFromName,
  verifyPassword,
} from "./auth";

describe("names", () => {
  it("normalizes pseudos", () => {
    expect(normalizeName("  Clara ")).toBe("clara");
    expect(normalizeName("Zoé")).toBe("zoe");
  });
  it("accepts simple pseudos and refuses the rest", () => {
    expect(nameProblem("pa", "Le pseudo")).toBeNull();
    expect(nameProblem("jean-marc.d", "Le pseudo")).toBeNull();
    expect(nameProblem("a", "Le pseudo")).toMatch("entre 2 et 30");
    expect(nameProblem("clara dupont", "Le pseudo")).toMatch("sans accent");
    expect(nameProblem("-clara", "Le pseudo")).toMatch("sans accent");
  });
  it("proposes a family link name", () => {
    expect(slugFromName("Famille Schütz")).toBe("schutz");
    expect(slugFromName("Les Dupont-Morel")).toBe("les-dupont-morel");
  });
});

describe("passwords", () => {
  it("refuses passwords with the pseudo, the family or too common", () => {
    expect(passwordProblem("clara2015!", ["clara", "Famille Schütz"])).toMatch("ni ton pseudo");
    expect(passwordProblem("vive-schutz-2026", ["pa", "schutz"])).toMatch("ni ton pseudo");
    expect(passwordProblem("pa-est-content", ["pa"])).toBeNull(); // too short a word to matter
    expect(passwordProblem("MotDePasse")).toMatch("trop courant");
  });

  it("refuses short passwords", () => {
    expect(passwordProblem("court")).toMatch("au moins 8");
    expect(passwordProblem("assez-long")).toBeNull();
  });

  it("verifies the right password only", async () => {
    // Few iterations: the algorithm is the same, the test stays fast
    const stored = await hashPassword("pommes-de-terre", 1000);
    expect(stored).toMatch(/^pbkdf2-sha256\$1000\$[0-9a-f]{32}\$[0-9a-f]{64}$/);
    expect(await verifyPassword("pommes-de-terre", stored)).toBe(true);
    expect(await verifyPassword("pommes-de-terres", stored)).toBe(false);
  });

  it("salts every hash", async () => {
    expect(await hashPassword("pareil", 1000)).not.toBe(
      await hashPassword("pareil", 1000),
    );
  });

  it("never matches a malformed or decoy hash", async () => {
    expect(await verifyPassword("x", "n'importe quoi")).toBe(false);
    expect(await verifyPassword("x", "pbkdf2-sha256$0$00$00")).toBe(false);
    expect(await verifyPassword("", DECOY_HASH.replace("600000", "1000"))).toBe(
      false,
    );
  });

  it("makes long random tokens", () => {
    expect(randomToken()).toMatch(/^[0-9a-f]{64}$/);
    expect(randomToken()).not.toBe(randomToken());
  });
});

describe("attempt limits", () => {
  const t0 = 1_000_000;
  it("allows 5 attempts, then pauses 5 minutes", () => {
    let guard = null as ReturnType<typeof reserveAttempt>["next"] | null;
    for (let i = 1; i <= 5; i++) {
      const r = reserveAttempt(guard, t0 + i, PER_NAME);
      expect(r.allowed).toBe(true);
      guard = r.next;
    }
    const sixth = reserveAttempt(guard, t0 + 6, PER_NAME);
    expect(sixth.allowed).toBe(false);
    expect(sixth.retryAt).toBe(t0 + 6 + PER_NAME.lockMs);
    // Still locked a minute later, and the lock is not shortened
    const later = reserveAttempt(sixth.next, t0 + 60_000, PER_NAME);
    expect(later.allowed).toBe(false);
    expect(later.next.lockedUntil).toBe(sixth.next.lockedUntil);
    // Free again after the pause
    expect(reserveAttempt(later.next, sixth.retryAt + 1, PER_NAME).allowed).toBe(true);
  });

  it("forgets attempts older than the window", () => {
    let guard = null as ReturnType<typeof reserveAttempt>["next"] | null;
    for (let i = 0; i < 5; i++) guard = reserveAttempt(guard, t0, PER_NAME).next;
    const next = reserveAttempt(guard, t0 + PER_NAME.windowMs + 1, PER_NAME);
    expect(next.allowed).toBe(true);
    expect(next.next.failures).toBe(1);
  });
});
