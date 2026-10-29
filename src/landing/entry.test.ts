import { describe, expect, it } from "vitest";
import { contactHref, entryFor, legalDocFor, opensPricing, signupVisible } from "./entry";

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
    for (const hash of ["#/decouvrir", "#/decouvrir/", "#/tarif", "#/sans-invitation"]) {
      expect(entryFor(hash, false), hash).toBe("landing");
      expect(entryFor(hash, true), hash).toBe("landing");
    }
  });

  it("opens at the price on its path and on the former no-invitation path", () => {
    expect(opensPricing("#/tarif")).toBe(true);
    expect(opensPricing("#/sans-invitation")).toBe(true);
    expect(opensPricing("#/decouvrir")).toBe(false);
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

describe("signupVisible", () => {
  it("shows the trial button while developing", () => {
    expect(signupVisible(undefined, true)).toBe(true);
  });

  it("hides it in production until VITE_SIGNUP_OPEN is 1", () => {
    for (const raw of [undefined, "", "0", "true"]) expect(signupVisible(raw, false), String(raw)).toBe(false);
    expect(signupVisible("1", false)).toBe(true);
  });
});

describe("legal pages", () => {
  it("open on the landing surface, signed in or not", () => {
    for (const hash of ["#/mentions-legales", "#/conditions", "#/confidentialite/"]) {
      expect(entryFor(hash, false), hash).toBe("landing");
      expect(entryFor(hash, true), hash).toBe("landing");
    }
  });

  it("are found by their address only", () => {
    expect(legalDocFor("#/conditions")).toBe("conditions");
    expect(legalDocFor("#/confidentialite")).toBe("confidentialite");
    expect(legalDocFor("#/mentions-legales")).toBe("mentions");
    expect(legalDocFor("#/")).toBeNull();
    expect(legalDocFor("#/conditions/x")).toBeNull();
  });
});
