import { createContext, useCallback, useContext } from "react";
import type { Lang } from "../../convex/domain/lang";
import { LANDING_DE, LANDING_FR, type LandingKey } from "./i18n";
import { typo } from "./typo";

/** Language of the landing page, chosen with the FR | DE switch (see deviceLang.ts). */
export const LandingLangContext = createContext<Lang>("fr");

/** The text of `key` in the page's language; French gets its typography (typo.ts). */
export function landingText(lang: Lang, key: LandingKey, vars?: Record<string, string | number>) {
  const text = (lang === "de" ? LANDING_DE : LANDING_FR)[key].replace(/\{(\w+)\}/g, (all, name: string) =>
    vars && name in vars ? String(vars[name]) : all,
  );
  return lang === "fr" ? typo(text) : text;
}

export function useL() {
  const lang = useContext(LandingLangContext);
  const l = useCallback(
    (key: LandingKey, vars?: Record<string, string | number>) => landingText(lang, key, vars),
    [lang],
  );
  return { l, lang };
}
