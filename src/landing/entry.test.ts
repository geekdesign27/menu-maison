import { describe, expect, it } from "vitest";
import { contactHref, entryFor, opensNoInvite } from "./entry";

describe("entryFor", () => {
  it("shows the landing page on the bare address to visitors", () => {
    for (const hash of ["", "#", "#/", "#//"]) expect(entryFor(hash, false), hash).toBe("landing");
  });

  it("keeps a signed-in phone on its week", () => {
    expect(entryFor("", true)).toBe("app");
    expect(entryFor("#/", true)).toBe("app");
  });

  it("keeps the family and invitation links in the app", () => {
    expect(entryFor("#/f/martin", false)).toBe("app");
    expect(entryFor(`#/activer/${"a".repeat(64)}`, false)).toBe("app");
  });

  it("sends the sign-in link and every app route to the app", () => {
    for (const hash of ["#/connexion", "#/courses", "#/gestion/recettes", "#/recette/abc"]) {
      expect(entryFor(hash, false), hash).toBe("app");
      expect(entryFor(hash, true), hash).toBe("app");
    }
  });

  it("always shows the landing paths, signed in or not", () => {
    for (const hash of ["#/decouvrir", "#/decouvrir/", "#/sans-invitation"]) {
      expect(entryFor(hash, false), hash).toBe("landing");
      expect(entryFor(hash, true), hash).toBe("landing");
    }
  });

  it("opens the no-invitation message only on its own path", () => {
    expect(opensNoInvite("#/sans-invitation")).toBe(true);
    expect(opensNoInvite("#/decouvrir")).toBe(false);
  });
});

describe("contactHref", () => {
  it("is null when nothing is configured", () => {
    expect(contactHref(undefined)).toBeNull();
    expect(contactHref("  ")).toBeNull();
  });

  it("accepts e-mail, phone and https links", () => {
    expect(contactHref("mailto:pa@example.ch")).toBe("mailto:pa@example.ch");
    expect(contactHref(" tel:+41 79 000 00 00 ")).toBe("tel:+41 79 000 00 00");
    expect(contactHref("https://example.ch/contact")).toBe("https://example.ch/contact");
  });

  it("refuses anything else", () => {
    expect(contactHref("javascript:alert(1)")).toBeNull();
    expect(contactHref("http://example.ch")).toBeNull();
    expect(contactHref("pa@example.ch")).toBeNull();
  });
});
