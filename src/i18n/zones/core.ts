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
  "lang.namesTitle": "Noms en allemand",
  "lang.namesHelp":
    "Les profils en allemand voient les produits, rayons et articles sous leur nom allemand. Ils sont traduits automatiquement\u00a0; tu peux corriger chaque nom dans sa fiche.",
  "lang.namesMissing": "{count} sans nom allemand",
  "lang.namesDone": "Tout a son nom allemand.",
  "lang.translate": "Traduire maintenant",
  "lang.translated": "{count} noms traduits",

  "install.title": "Sur ton écran d'accueil",
  "install.why":
    "Ajoute l'app à ton écran d'accueil\u00a0: elle s'ouvre d'un geste, en plein écran, et tu restes connecté.",
  "install.add": "Ajouter à l'écran d'accueil",
  "install.later": "Plus tard",
  "install.done": "C'est fait",
  "install.ios1": "Touche le bouton Partager de Safari",
  "install.ios2": "Choisis «\u00a0Sur l'écran d'accueil\u00a0»",
  "install.ios3": "Touche «\u00a0Ajouter\u00a0»",
  "install.iosAfter":
    "Ouvre ensuite Menu Maison depuis ton écran d'accueil et connecte-toi une dernière fois.",
  "install.manual1": "Ouvre le menu du navigateur",
  "install.manual2": "Choisis «\u00a0Ajouter à l'écran d'accueil\u00a0» ou «\u00a0Installer l'application\u00a0»",
  "install.desktop": "Sur ton téléphone, ouvre Menu Maison pour l'ajouter à l'écran d'accueil.",

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
  "lang.namesTitle": "Deutsche Namen",
  "lang.namesHelp":
    "Profile auf Deutsch sehen Produkte, Abteilungen und Artikel mit dem deutschen Namen. Sie werden automatisch übersetzt; du kannst jeden Namen in seiner Karte korrigieren.",
  "lang.namesMissing": "{count} ohne deutschen Namen",
  "lang.namesDone": "Alles hat einen deutschen Namen.",
  "lang.translate": "Jetzt übersetzen",
  "lang.translated": "{count} Namen übersetzt",

  "install.title": "Auf den Home-Bildschirm",
  "install.why":
    "Füge die App zum Home-Bildschirm hinzu: Sie öffnet sich mit einem Tipp, im Vollbild, und du bleibst angemeldet.",
  "install.add": "Zum Home-Bildschirm hinzufügen",
  "install.later": "Später",
  "install.done": "Erledigt",
  "install.ios1": "Tippe in Safari auf Teilen",
  "install.ios2": "Wähle «Zum Home-Bildschirm»",
  "install.ios3": "Tippe auf «Hinzufügen»",
  "install.iosAfter":
    "Öffne Menu Maison danach über deinen Home-Bildschirm und melde dich ein letztes Mal an.",
  "install.manual1": "Öffne das Menü des Browsers",
  "install.manual2": "Wähle «Zum Startbildschirm hinzufügen» oder «App installieren»",
  "install.desktop": "Öffne Menu Maison auf deinem Handy, um es zum Home-Bildschirm hinzuzufügen.",

  "slot.matin": "Morgen",
  "slot.midi": "Mittag",
  "slot.soir": "Abend",
  "status.prévu": "Geplant",
  "status.mangé": "Gegessen",
  "status.pas mangé": "Nicht gegessen",
  "status.pas cuisiné": "Nicht gekocht",
};
