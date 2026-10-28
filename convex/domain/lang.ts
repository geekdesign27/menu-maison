// Languages of the app. French is everyone's default; an admin can set German for a profile.

export type Lang = "fr" | "de";
export const LANGS: Lang[] = ["fr", "de"];

/** BCP 47 tag, for `<html lang>` and Intl formats. */
export function localeOf(lang: Lang): string {
  return lang === "de" ? "de-CH" : "fr-CH";
}
