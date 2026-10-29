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
  pseudo: "marc",
  report: {
    funnel: [
      { event: "visit" as const, count: 42, previous: 31 },
      { event: "trialStarted" as const, count: 1, previous: 0 },
    ],
    sources: [{ key: "<b>direct</b>", count: 42 }],
    families: { trial: 1, subscribed: 5, pastDue: 0, ended: 1, offered: 3 },
  },
};

describe("e-mails", () => {
  it("renders every e-mail in French and German, with a subject, HTML and text", () => {
    for (const lang of ["fr", "de"] as const)
      for (const kind of EMAIL_KINDS) {
        const mail = renderEmail(kind, DATA, lang);
        expect(mail.subject.length, kind).toBeGreaterThan(5);
        expect(mail.html, kind).toContain("<!doctype html>");
        // The weekly report is about every family, not one
        if (kind !== "adminWeekly") expect(mail.text, kind).toContain("Dupont");
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

  it("writes the weekly report's lines one under the other, with its totals in the subject", () => {
    const mail = renderEmail("adminWeekly", { ...DATA, date: "26 octobre au 1er novembre" }, "de");
    expect(mail.subject).toBe("Menu Maison, semaine du 26 octobre au 1er novembre\u00a0: 42 visites, 1 essai");
    expect(mail.html).toContain(
      "<strong>Entonnoir de la semaine, entre parenthèses la semaine d'avant</strong><br>Visites\u00a0: 42 (31)<br>Essais démarrés\u00a0: 1 (0)",
    );
    expect(mail.text).toContain("Visites\u00a0: 42 (31)\nEssais démarrés\u00a0: 1 (0)");
    expect(mail.text).toContain("Abonnées\u00a0: 5");
    expect(mail.text).toContain("https://menumaison.ch/#/gestion/statistiques");
    // A source is never markup
    expect(mail.html).toContain("&lt;b&gt;direct&lt;/b&gt; 42");
  });

  it("keeps a line break typed in a name as plain text outside the weekly report", () => {
    const mail = renderEmail("welcome", { ...DATA, familyName: "Du\npont" }, "fr");
    expect(mail.html).not.toContain("<strong>");
  });

  it("says so in the weekly report when nobody came", () => {
    const mail = renderEmail(
      "adminWeekly",
      { ...DATA, date: "x", report: { ...DATA.report, funnel: [], sources: [] } },
      "fr",
    );
    expect(mail.subject).toContain("0 visite, 0 essai");
    expect(mail.text).toContain("Provenance\u00a0: aucune visite.");
  });
});
