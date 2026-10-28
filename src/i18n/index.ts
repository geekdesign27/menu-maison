import type { Lang } from "../../convex/domain/lang";
import { de } from "./de";
import { fr, type MessageKey, type Messages } from "./fr";

export type { MessageKey };

const MESSAGES: Record<Lang, Messages> = { fr, de };

/** Text of `key` in `lang`, with « {name} » placeholders filled from `vars`. */
export function translate(
  lang: Lang,
  key: MessageKey,
  vars?: Record<string, string | number>,
): string {
  const text = MESSAGES[lang][key];
  return vars
    ? text.replace(/\{(\w+)\}/g, (all, name: string) =>
        name in vars ? String(vars[name]) : all,
      )
    : text;
}

export const DICTIONARIES = MESSAGES;

// The fixed recipe styles (convex/domain/tags.ts) are stored in French; shown translated
const TAG_DE: Record<string, string> = {
  "Petit-déj": "Frühstück",
  Suisse: "Schweiz",
  Express: "Express",
  Familial: "Familie",
  Healthy: "Gesund",
  Végé: "Vegi",
  Réconfort: "Soulfood",
  Mijoté: "Geschmort",
  Four: "Ofen",
  Poisson: "Fisch",
  Italien: "Italienisch",
  Asiatique: "Asiatisch",
  Mexicain: "Mexikanisch",
  Soupe: "Suppe",
  Été: "Sommer",
  Hiver: "Winter",
};

/** A recipe style in `lang`; anything outside the fixed list is shown as typed. */
export function tagText(lang: Lang, tag: string): string {
  return lang === "de" ? (TAG_DE[tag] ?? tag) : tag;
}
