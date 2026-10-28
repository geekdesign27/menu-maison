// Landing page texts (story). French is the reference (typography added by useL);
// German: Swiss (« ss », never « ß »), « du », guillemets «…» without spaces.
export const fr = {
  // Hero
  "hero.tagline": "La cuisine familiale, sans réunion de crise.",
  "hero.titleStart": "Le « on mange quoi ce soir ? » a enfin ",
  "hero.titleHighlight": "une réponse",
  "hero.lead":
    "Planifie les repas de la semaine, retrouve tes recettes, écoute les envies de toute la famille et prépare tes courses sans te prendre la tête. Même les restes ont leur place.",
  "hero.discover": "Découvrir comment ça marche",
  "hero.note": "Attention : risque élevé de savoir ce qu'on mange jeudi.",
  "hero.phoneAlt":
    "La Semaine dans Menu Maison : 16 plats prévus, environ 117.85 francs estimés chez Aldi Marly, les envies de la famille, puis samedi 24 octobre avec une raclette pour 3 le soir.",
  "hero.listTitle": "Liste de courses",
  "hero.estimate": "env. CHF {amount}",
  "hero.item1": "Tresse au beurre",
  "hero.item2": "Carottes",
  "hero.item3": "Lait de coco",
  "hero.portionsTitle": "🍝 Lasagnes de mercredi",
  "hero.portionsText": "6 portions, dont 2 pour jeudi midi",

  // Problem
  "problem.titleStart": "La question qui revient.",
  "problem.titleWord1": "Tous.",
  "problem.titleWord2": "Les.",
  "problem.titleWord3": "Jours.",
  "problem.lead":
    "Tu connais le scénario. Quelqu'un demande ce qu'on mange. Personne ne sait. On ouvre le frigo. On referme le frigo. Et on finit par acheter des ingrédients qu'on avait déjà.",
  "problem.q1": "On mange quoi ?",
  "problem.a1": "Une question simple. Une réponse étonnamment compliquée.",
  "problem.q2": "On a encore des carottes ?",
  "problem.a2": "Oui. Et maintenant on en a deux kilos.",
  "problem.q3": "Il reste quoi dans le frigo ?",
  "problem.a3": "Une boîte mystérieuse et trois bonnes intentions.",
  "problem.closing": "Menu Maison remet un peu d'ordre dans tout ça.",
  "problem.closingHighlight": "Sans enlever le plaisir de cuisiner.",

  // Features
  "features.title": "Et puis il y a les petits détails qui changent tout.",
  "features.templatesTitle": "Les menus types",
  "features.templatesText":
    "Une semaine qui fonctionne bien ? Enregistre-la et ressors-la quand l'inspiration prend congé.",
  "features.staplesTitle": "Les articles habituels",
  "features.staplesText":
    "Café, papier toilette, dentifrice… Tout ne vient pas forcément d'une recette.",
  "features.tomorrowTitle": "Le repas de demain",
  "features.tomorrowText":
    "Cuisine une fois, mange deux fois. La liste sait calculer les bonnes portions.",
  "features.dictationTitle": "La dictée des recettes",
  "features.dictationText":
    "Dicte les ingrédients et les étapes. Plus besoin de taper toute la recette de grand-maman.",
  "features.stockTitle": "Les ingrédients en stock",
  "features.stockText":
    "Les épices, l'huile et les produits qu'on a toujours sont proposés en tête : un geste suffit pour les retirer des achats.",
  "features.forgottenTitle": "Les recettes oubliées",
  "features.forgottenText":
    "Retrouve les plats que tout le monde aime, mais qu'on n'a pas cuisinés depuis longtemps.",

  // Recipes and wishes
  "recipesWishes.title": "Chacun ses envies. Une seule liste de courses.",
  "recipesWishes.lead":
    "Julie a envie d'un risotto aux champignons. Marc rêve de burgers maison. Léa vote pour des crêpes au chocolat. Tout le monde peut proposer ses envies et retrouver ses recettes préférées. Il ne reste plus qu'à décider quand on mange quoi.",
  "recipesWishes.wishJulie": "🍄 Risotto aux champignons",
  "recipesWishes.wishMarc": "🍔 Burgers maison",
  "recipesWishes.wishLea": "Des crêpes au chocolat",
  "recipesWishes.wishesLabel": "Les envies de la semaine, dans l'exemple",
  "recipesWishes.wishBy": "{name} : ",
  "recipesWishes.wishesAlt":
    "L'écran Envies : Julie a envie d'un risotto aux champignons, Marc de burgers maison, Léa de crêpes au chocolat, avec Planifier et Fait.",
  "recipesWishes.recipesAlt":
    "L'écran Recettes : Nos recettes et Découvrir, des filtres Express, Petit-déj et Suisse, puis des fiches avec le temps et le coût par personne, comme le birchermüesli à 2.25 francs.",
  "recipesWishes.add": "Ajouter ses recettes",
  "recipesWishes.explore": "Explorer le catalogue de départ",
  "recipesWishes.like": "Marquer les recettes qu'on aime",
  "recipesWishes.propose": "Proposer un plat dans Envies",
  "recipesWishes.sort": "Trier par styles : express, familial, suisse…",
  "recipesWishes.dictate": "Dicter une recette",
  "recipesWishes.import": "Importer une recette depuis un texte ou un lien",
  "recipesWishes.review": "Relire le brouillon, puis l'enregistrer",
  "recipesWishes.note":
    "Les bonnes idées se partagent. Même quand elles viennent de quelqu'un qui ne cuisine jamais.",
} as const;

export const de: { [K in keyof typeof fr]: string } = {
  // Hero
  "hero.tagline": "Familienküche ohne Krisensitzung.",
  "hero.titleStart": "Das ewige «Was gibt's heute zum Znacht?» hat endlich ",
  "hero.titleHighlight": "eine Antwort",
  "hero.lead":
    "Plane die Mahlzeiten der Woche, finde deine Rezepte wieder, hör auf die Wünsche der ganzen Familie und bereite deinen Einkauf vor, ganz ohne Kopfzerbrechen. Sogar die Reste haben ihren Platz.",
  "hero.discover": "Schau, wie es funktioniert",
  "hero.note":
    "Achtung: hohes Risiko, dass du schon weisst, was es am Donnerstag gibt.",
  "hero.phoneAlt":
    "Die Woche in Menu Maison: 16 geplante Gerichte, rund 117.85 Franken geschätzt bei Aldi Marly, die Wünsche der Familie, dann Samstag, 24. Oktober, mit Raclette für 3 zum Znacht.",
  "hero.listTitle": "Einkaufsliste",
  "hero.estimate": "ca. CHF {amount}",
  "hero.item1": "Butterzopf",
  "hero.item2": "Rüebli",
  "hero.item3": "Kokosmilch",
  "hero.portionsTitle": "🍝 Lasagne vom Mittwoch",
  "hero.portionsText": "6 Portionen, 2 davon fürs Zmittag am Donnerstag",

  // Problem
  "problem.titleStart": "Die Frage, die immer wiederkommt.",
  "problem.titleWord1": "Jeden.",
  "problem.titleWord2": "Einzelnen.",
  "problem.titleWord3": "Tag.",
  "problem.lead":
    "Du kennst das. Jemand fragt, was es zu essen gibt. Niemand weiss es. Man öffnet den Kühlschrank. Man macht den Kühlschrank wieder zu. Und am Ende kauft man Zutaten, die man schon hatte.",
  "problem.q1": "Was essen wir?",
  "problem.a1": "Eine einfache Frage. Eine erstaunlich komplizierte Antwort.",
  "problem.q2": "Haben wir noch Rüebli?",
  "problem.a2": "Ja. Und jetzt haben wir zwei Kilo davon.",
  "problem.q3": "Was hat's noch im Kühli?",
  "problem.a3": "Eine mysteriöse Dose und drei gute Vorsätze.",
  "problem.closing": "Menu Maison bringt etwas Ordnung in das Ganze.",
  "problem.closingHighlight": "Ohne dass der Spass am Kochen verloren geht.",

  // Features
  "features.title":
    "Und dann sind da die kleinen Details, die alles verändern.",
  "features.templatesTitle": "Menüvorlagen",
  "features.templatesText":
    "Eine Woche, die gut geklappt hat? Speichere sie und hol sie wieder hervor, wenn die Inspiration Ferien macht.",
  "features.staplesTitle": "Standardartikel",
  "features.staplesText":
    "Kaffee, WC-Papier, Zahnpasta… Nicht alles stammt aus einem Rezept.",
  "features.tomorrowTitle": "Das Essen für morgen",
  "features.tomorrowText":
    "Einmal kochen, zweimal essen. Die Liste rechnet die richtigen Portionen aus.",
  "features.dictationTitle": "Rezepte diktieren",
  "features.dictationText":
    "Diktiere die Zutaten und die Schritte. Grossmamis ganzes Rezept abtippen? Nicht mehr nötig.",
  "features.stockTitle": "Zutaten auf Vorrat",
  "features.stockText":
    "Gewürze, Öl und alles, was immer im Haus ist, stehen zuoberst: Ein Antippen genügt, um sie von der Einkaufsliste zu streichen.",
  "features.forgottenTitle": "Vergessene Rezepte",
  "features.forgottenText":
    "Finde die Gerichte wieder, die alle mögen, aber schon lange nicht mehr auf dem Tisch standen.",

  // Recipes and wishes
  "recipesWishes.title": "Alle haben ihre Wünsche. Nur eine Einkaufsliste.",
  "recipesWishes.lead":
    "Julie hat Lust auf ein Pilzrisotto. Marc träumt von hausgemachten Burgern. Léa stimmt für Schoggi-Crêpes. Alle können ihre Wünsche vorschlagen und ihre Lieblingsrezepte wiederfinden. Bleibt nur noch zu entscheiden, wann es was gibt.",
  "recipesWishes.wishJulie": "🍄 Pilzrisotto",
  "recipesWishes.wishMarc": "🍔 Hausgemachte Burger",
  "recipesWishes.wishLea": "Schoggi-Crêpes",
  "recipesWishes.wishesLabel": "Die Wünsche der Woche, im Beispiel",
  "recipesWishes.wishBy": "{name}: ",
  "recipesWishes.wishesAlt":
    "Der Bildschirm Wünsche: Julie hat Lust auf ein Pilzrisotto, Marc auf hausgemachte Burger, Léa auf Schoggi-Crêpes, mit Planen und Erledigt.",
  "recipesWishes.recipesAlt":
    "Der Bildschirm Rezepte: Unsere Rezepte und Entdecken, die Filter Express, Frühstück und Schweiz, dann Rezeptkarten mit Zeit und Kosten pro Person, etwa das Birchermüesli für 2.25 Franken.",
  "recipesWishes.add": "Eigene Rezepte hinzufügen",
  "recipesWishes.explore": "Den Startkatalog entdecken",
  "recipesWishes.like": "Lieblingsrezepte mit einem Herz markieren",
  "recipesWishes.propose": "Ein Gericht unter Wünsche vorschlagen",
  "recipesWishes.sort":
    "Nach Stil filtern: express, familientauglich, schweizerisch…",
  "recipesWishes.dictate": "Ein Rezept diktieren",
  "recipesWishes.import": "Ein Rezept aus einem Text oder Link importieren",
  "recipesWishes.review": "Den Entwurf prüfen und dann speichern",
  "recipesWishes.note":
    "Gute Ideen teilt man. Auch wenn sie von jemandem kommen, der nie kocht.",
};
