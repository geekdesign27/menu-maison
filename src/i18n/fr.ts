// French texts of the app, the reference: every key must exist in de.ts too
// (TypeScript refuses the build otherwise). « {name} » is replaced by `t`.

export const fr = {
  "nav.label": "Navigation principale",
  "nav.week": "Semaine",
  "nav.shopping": "Courses",
  "nav.recipes": "Recettes",
  "nav.fridge": "Frigo",
  "nav.more": "Plus",
  "nav.manage": "Gestion",
  "nav.back": "Retour",

  "lang.title": "Langue",
  "lang.german": "Deutsch",
  "lang.germanHelpOther": "L'app s'affiche en allemand pour {name}.",
  "lang.germanHelpMe": "L'app s'affiche en allemand pour toi.",
  "lang.nowGerman": "{name}\u00a0: app en allemand",
  "lang.nowFrench": "{name}\u00a0: app en français",
  "lang.column": "Langue",
  "lang.fr": "Français",
  "lang.de": "Deutsch",
} as const;

export type MessageKey = keyof typeof fr;
export type Messages = Record<MessageKey, string>;
