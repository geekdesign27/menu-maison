// Landing page texts (shell): header, shared buttons and labels. French is the
// reference (typography added by useL); German: Swiss (« ss », never « ß »),
// « du », guillemets «…» without spaces.
export const fr = {
  "shell.title": "Menu Maison · Les menus de la semaine, les recettes et les courses en famille",
  "shell.skip": "Aller au contenu",
  "shell.home": "Menu Maison, retour en haut",
  "shell.sections": "Sections de la page",
  "shell.navHow": "Fonctionnement",
  "shell.navTips": "Les petites astuces",
  "shell.navPricing": "Tarif",
  "shell.login": "Se connecter",
  "shell.openApp": "Ouvrir Menu Maison",
  "shell.openShort": "Ouvrir",
  "shell.demo": "Exemple, données fictives",
} as const;

export const de: { [K in keyof typeof fr]: string } = {
  "shell.title": "Menu Maison · Wochenmenüs, Rezepte und Einkäufe für die ganze Familie",
  "shell.skip": "Zum Inhalt",
  "shell.home": "Menu Maison, zurück nach oben",
  "shell.sections": "Abschnitte der Seite",
  "shell.navHow": "So funktioniert's",
  "shell.navTips": "Die kleinen Kniffe",
  "shell.navPricing": "Preis",
  "shell.login": "Anmelden",
  "shell.openApp": "Menu Maison öffnen",
  "shell.openShort": "Öffnen",
  "shell.demo": "Beispiel, erfundene Daten",
};
