import { describe, expect, it } from "vitest";
import {
  deleteConfirmMatches,
  emailProblem,
  exportable,
  exportFileName,
  normalizeEmail,
} from "./account";

describe("account", () => {
  it("accepts a plain address, written one way only", () => {
    expect(normalizeEmail("  Marc.Dupont@Example.CH ")).toBe(
      "marc.dupont@example.ch",
    );
    expect(emailProblem("marc@example.ch")).toBeNull();
  });

  it("refuses what is not an address", () => {
    expect(emailProblem("")).toMatch(/Indique/);
    expect(emailProblem("marc@example")).toMatch(/pas valable/);
    expect(emailProblem("marc dupont@example.ch")).toMatch(/pas valable/);
    expect(emailProblem(`${"a".repeat(250)}@x.ch`)).toMatch(/trop longue/);
  });

  it("confirms a deletion only with the family's name", () => {
    expect(deleteConfirmMatches("  rochat ", "Rochat")).toBe(true);
    expect(deleteConfirmMatches("Gerard", "Gérard")).toBe(true);
    expect(deleteConfirmMatches("Rochat 2", "Rochat")).toBe(false);
    expect(deleteConfirmMatches("", "")).toBe(false);
  });

  it("never exports a password, a link or the family's id", () => {
    const row = exportable({
      name: "Marc",
      passwordHash: "pbkdf2…",
      emailTokenHash: "abc",
      emailTokenExpiresAt: 1,
      familyId: "f1",
      email: "marc@example.ch",
    });
    expect(row).toEqual({ name: "Marc", email: "marc@example.ch" });
    expect(exportFileName("rochat", "2026-10-28")).toBe(
      "menu-maison-rochat-2026-10-28.json",
    );
  });
});
