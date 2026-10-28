// Shared texts: navigation, language, meal slots and statuses.
// Each zone file holds its French texts (`fr`, the reference) and German ones
// (`de`), which TypeScript requires to have exactly the same keys.

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

  "slot.matin": "Matin",
  "slot.midi": "Midi",
  "slot.soir": "Soir",
  "status.prévu": "Prévu",
  "status.mangé": "Mangé",
  "status.pas mangé": "Pas mangé",
  "status.pas cuisiné": "Pas cuisiné",
} as const;

export const de: { [K in keyof typeof fr]: string } = {
  "nav.label": "Hauptnavigation",
  "nav.week": "Woche",
  "nav.shopping": "Einkauf",
  "nav.recipes": "Rezepte",
  "nav.fridge": "Kühlschrank",
  "nav.more": "Mehr",
  "nav.manage": "Verwaltung",
  "nav.back": "Zurück",

  "lang.title": "Sprache",
  "lang.german": "Deutsch",
  "lang.germanHelpOther": "Die App wird für {name} auf Deutsch angezeigt.",
  "lang.germanHelpMe": "Die App wird für dich auf Deutsch angezeigt.",
  "lang.nowGerman": "{name}: App auf Deutsch",
  "lang.nowFrench": "{name}: App auf Französisch",
  "lang.column": "Sprache",
  "lang.fr": "Français",
  "lang.de": "Deutsch",

  "slot.matin": "Morgen",
  "slot.midi": "Mittag",
  "slot.soir": "Abend",
  "status.prévu": "Geplant",
  "status.mangé": "Gegessen",
  "status.pas mangé": "Nicht gegessen",
  "status.pas cuisiné": "Nicht gekocht",
};
