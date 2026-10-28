import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ConvexError } from "convex/values";
import { hasGerman, serverText } from "./serverText";
import { errorMessage } from "../lib/format";
import { deletionBlocker } from "../../convex/domain/products";
import { nameProblem, passwordProblem } from "../../convex/domain/auth";
import { packContentProblem } from "../../convex/domain/receipts";

const ROOT = join(__dirname, "../../convex");
// emails.ts: e-mails carry their own French and German texts (domain/emails.test.ts)
const SKIPPED_FILES = /\.test\.ts$|^seed|^schema\.ts$|^emails\.ts$/;

/** The server's source files: functions and pure domain. */
function sources() {
  return ["", "domain"].flatMap((dir) =>
    readdirSync(join(ROOT, dir))
      .filter((f) => f.endsWith(".ts") && !SKIPPED_FILES.test(f))
      .map((f) => ({
        file: join(dir, f),
        text: readFileSync(join(ROOT, dir, f), "utf8"),
      })),
  );
}

// French sentences that never reach the screen as is: AI prompts, formats
// built from parts, and texts translated where they are built.
const NOT_SHOWN = [
  /^Bearer /,
  /^(Titre|Description|Portions|Temps total|Rayons|Styles possibles) :/,
  /^(Catalogue de la famille|Recette à transformer|Recette de cuisine\.|Kochrezept\.)/,
  /^\$\{(DAY|num|formatNumber|rounded|n \+ 1|twin|words)/,
  /^(À acheter chez|Bei )/, // domain/shopping.ts, in the member's language
  /^\$\{source\.name\} \(/, // recipe copy, in the member's language
  /^Le contenu se donne en/, // domain/receipts.ts, checked below
  /^\$\{base\} \$\{n\}$/, // domain/billing.ts, « Dupont 2 »: a family name
  /^Menus de la semaine, recettes et courses/, // stripeNode.ts, product description in Stripe
  /^«\$\{NBSP\}/, // domain/products.ts, checked below
  /^Utilisé dans/,
];

/** Sentences of the server: strings starting with a capital, with a space, ending like a sentence. */
function sentences() {
  const found: { file: string; text: string }[] = [];
  for (const { file, text } of sources()) {
    for (const m of text.matchAll(/(["`])((?:(?!\1)[^\\\n]|\\.)*?)\1/g)) {
      const s = m[2];
      if (!/^[A-ZÀ-Ü«$]/.test(s) || !s.includes(" ")) continue;
      if (!/[.!?»]$|^«|\$\{/.test(s) || /^(import|export)/.test(s)) continue;
      if (NOT_SHOWN.some((re) => re.test(s))) continue;
      found.push({ file, text: s.replace(/\$\{[^}]*\}/g, "X") });
    }
  }
  return found;
}

/** Field names and « not found » messages passed to the shared checks. */
function labels() {
  const found: string[] = [];
  for (const { text } of sources()) {
    for (const m of text.matchAll(
      /(?:cleanText|assertInt|assertPositive)\([^;]*?,\s*"([^"]+)"\s*\)/g,
    ))
      found.push(m[1]);
    for (const m of text.matchAll(/\.own(?:All)?\([^;]*?,\s*"([^"]+)"\)/g))
      found.push(m[1]);
  }
  return found;
}

describe("server texts in German", () => {
  it("finds the server's sentences", () => {
    expect(sentences().length).toBeGreaterThan(100);
    expect(labels().length).toBeGreaterThan(20);
  });

  it("has every sentence of the server", () => {
    const missing = sentences().filter((s) => !hasGerman(s.text));
    expect(missing).toEqual([]);
  });

  it("has every field name and « not found » message", () => {
    expect(labels().filter((l) => !hasGerman(l))).toEqual([]);
  });

  it("translates the parts of a message", () => {
    expect(serverText("de", "Titre : 100 caractères au maximum.")).toBe(
      "Titel: höchstens 100 Zeichen.",
    );
    expect(serverText("de", "« Lessive » existe déjà.")).toBe(
      "«Lessive» gibt es schon.",
    );
    expect(serverText("de", "Trop d'essais. Réessaie dans 5 min.")).toBe(
      "Zu viele Versuche. Versuch es in 5 Min. nochmals.",
    );
  });

  it("translates the messages built by the domain", () => {
    const recipe = (name: string, archived = false) => ({ name, archived });
    expect(serverText("de", deletionBlocker([recipe("Curry")])!)).toBe(
      "Wird im Rezept «Curry» verwendet. Entferne es zuerst aus diesem Rezept.",
    );
    expect(
      serverText(
        "de",
        deletionBlocker(
          ["A", "B", "C", "D", "E"].map((n) => recipe(n, n === "A")),
        )!,
      ),
    ).toBe(
      "Wird in den Rezepten «A» (archiviert), «B», «C» und 2 weitere verwendet. Entferne es zuerst aus diesen Rezepten.",
    );
    for (const problem of [
      nameProblem("a", "Le pseudo"),
      nameProblem("Zoé", "Le pseudo"),
      passwordProblem("abc", []),
      passwordProblem("x".repeat(500), []),
      packContentProblem("g", 0.5),
      packContentProblem("ml", 1),
    ]) {
      expect(problem).not.toBeNull();
      expect(hasGerman(problem!), problem!).toBe(true);
    }
  });

  it("keeps French for French profiles and unknown texts", () => {
    expect(serverText("fr", "Profil introuvable.")).toBe("Profil introuvable.");
    expect(serverText("de", "Texte inconnu.")).toBe("Texte inconnu.");
  });

  it("is what errorMessage shows", () => {
    const e = new ConvexError("Recette introuvable.");
    expect(errorMessage(e, "de")).toBe("Rezept nicht gefunden.");
    expect(errorMessage(e, "fr")).toBe("Recette introuvable.");
  });

  it("follows the Swiss rules: no ß, no em or en dash", () => {
    for (const s of sentences()) {
      if (hasGerman(s.text))
        expect(serverText("de", s.text), s.text).not.toMatch(/[ß–—]/);
    }
  });
});
