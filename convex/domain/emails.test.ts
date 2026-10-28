import { describe, expect, it } from "vitest";
import { EMAIL_KINDS, escapeHtml, renderEmail } from "./emails";

const DATA = {
  familyName: "Dupont",
  adminName: "Marc",
  date: "mercredi 4 novembre",
  link: "https://menumaison.ch/#/bienvenue?session_id=cs_test_x&k=abc",
  loginLink: "https://menumaison.ch/#/f/dupont",
  email: "marc@example.ch",
  subscribers: 3,
};

describe("e-mails", () => {
  it("renders every e-mail in French and German, with a subject, HTML and text", () => {
    for (const lang of ["fr", "de"] as const)
      for (const kind of EMAIL_KINDS) {
        const mail = renderEmail(kind, DATA, lang);
        expect(mail.subject.length, kind).toBeGreaterThan(5);
        expect(mail.html, kind).toContain("<!doctype html>");
        expect(mail.text, kind).toContain("Dupont");
        // Swiss rules: never an em or en dash, never « ß »
        expect(`${mail.subject}${mail.text}`, kind).not.toMatch(/[—–ß]/);
        // Nothing left to fill
        expect(mail.text, kind).not.toMatch(/undefined|\{\w+\}/);
      }
  });

  it("speaks the family's language, the alerts to PA stay French", () => {
    expect(renderEmail("welcome", DATA, "de").subject).toMatch(/^Willkommen/);
    expect(renderEmail("welcome", DATA, "fr").subject).toMatch(/^Bienvenue/);
    expect(renderEmail("adminSignup", DATA, "de").subject).toMatch(
      /^Nouvelle inscription/,
    );
  });

  it("never puts a family's name into the HTML as markup", () => {
    const mail = renderEmail(
      "welcome",
      { ...DATA, familyName: '<img src=x onerror="alert(1)">' },
      "fr",
    );
    expect(mail.html).not.toContain("<img src=x");
    expect(mail.html).toContain("&lt;img src=x");
    expect(escapeHtml(`"a" & 'b'`)).toBe("&quot;a&quot; &amp; &#39;b&#39;");
  });

  it("puts the activation link in the button and in the text version", () => {
    const mail = renderEmail("welcome", DATA, "fr");
    expect(mail.html).toContain(
      'href="https://menumaison.ch/#/bienvenue?session_id=cs_test_x&amp;k=abc"',
    );
    expect(mail.text).toContain(
      "https://menumaison.ch/#/bienvenue?session_id=cs_test_x&k=abc",
    );
  });
});
