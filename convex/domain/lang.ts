// Languages of the app. French is everyone's default; an admin can set German for a profile.

export type Lang = "fr" | "de";
export const LANGS: Lang[] = ["fr", "de"];

/** Name of a product, aisle or usual item in a language: the German one when there is one. */
export function localName(
  item: { name: string; nameDe?: string },
  lang: Lang,
): string {
  return (lang === "de" && item.nameDe) || item.name;
}

/** A German name proposed by Claude, made Swiss (« ss ») and fit for the field; "" when empty. */
export function cleanGermanName(name: string, max: number): string {
  return name
    .replace(/ß/g, "ss")
    .replace(/[—–]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
    .trim();
}

/** BCP 47 tag, for `<html lang>` and Intl formats. */
export function localeOf(lang: Lang): string {
  return lang === "de" ? "de-CH" : "fr-CH";
}
