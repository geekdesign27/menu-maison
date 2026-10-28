// Landing page texts (shop): how it works, stores, leftovers, budget. French is
// the reference (typography added by useL); German: Swiss (« ss », never « ß »),
// « du », guillemets «…» without spaces. Screenshots stay French, their alt texts
// follow the page.
export const fr = {
  // How it works
  "how.title": "Du « j'ai faim » au caddie. En trois étapes.",
  "how.lead":
    "L'idée n'est pas de passer sa soirée à organiser les repas. C'est justement de récupérer du temps pour autre chose.",
  "how.tabs": "Les trois étapes",
  "how.stepNumber": "Étape {n} : ",
  "how.step1Title": "Fais ton menu de la semaine",
  "how.step1Text":
    "Matin, midi, soir : glisse tes recettes dans les bons créneaux, ajuste les portions et tiens compte des envies de chacun.",
  "how.step1Note": "Oui, même celui qui ne veut jamais rien.",
  "how.step1Alt":
    "Ajouter un plat au menu : créneaux matin, midi et soir, 3 portions ce soir, l'option « Aussi pour demain midi » avec 3 portions, et le total « Tu prépares 6 portions ».",
  "how.step2Title": "Les courses se calculent toutes seules",
  "how.step2Text":
    "Menu Maison rassemble les ingrédients de tes recettes, additionne les quantités et te laisse retirer ce que tu as déjà à la maison.",
  "how.step2Note":
    "{lasagnes} de carottes + {chicken} de carottes = pas besoin de deux lignes.",
  "how.step2Alt":
    "Valider le menu de la semaine : chaque ingrédient une seule fois avec sa quantité totale, tout est coché, on décoche ce qu'on a déjà à la maison.",
  "how.step3Title": "Fais les courses dans le bon ordre",
  "how.step3Text":
    "Choisis ton magasin et retrouve ta liste organisée selon le parcours que tu as configuré, de l'entrée jusqu'à la caisse.",
  "how.step3Note": "Le rayon fromage ne sera plus une étape du Tour de France.",
  "how.step3Alt":
    "La liste de courses chez Aldi Marly : 31 articles sur 53, environ 114.60 francs, rangée par rayon, boulangerie puis fruits et légumes.",
  "how.mergeLasagnes": "🍝 Lasagnes, 6 portions",
  "how.mergeChicken": "🍗 Poulet rôti, 3 portions",
  "how.mergeTotal": "🥕 Carottes",

  // Stores
  "store.title": "Ton magasin. Tes rayons. Zéro slalom inutile.",
  "store.lead1":
    "Aldi, Coop, Migros, Lidl ou ton commerce habituel : tu définis l'ordre des rayons une fois, et Menu Maison range ensuite ta liste en conséquence.",
  "store.lead2":
    "Les fruits et légumes d'abord ? Le pain juste après ? Parfait. La liste suit ton trajet, pas l'alphabet.",
  "store.point1": "Chaque magasin a son propre ordre de rayons.",
  "store.point2": "Tu changes de magasin, la liste se réorganise.",
  "store.point3": "Les prix peuvent varier d'une enseigne à l'autre.",
  "store.point4":
    "Ce qui est coché apparaît tout de suite sur les autres téléphones de la famille.",
  "store.point5": "Un filtre « Reste à acheter » montre ce qui manque encore.",
  "store.editorAlt":
    "L'éditeur d'un magasin, Coop Fribourg Centre : le parcours dans le magasin, de 1 Fruits et légumes à 5 Charcuterie, avec des flèches pour monter ou descendre chaque rayon.",
  "store.choose": "Choisis ton magasin",
  "store.storesLabel": "Magasin de l'exemple",
  "store.summary":
    "{count} articles, env. CHF {cost} estimés chez {store}. On commence par : {first}.",
  "store.note":
    "L'application connaît ton parcours. Pour retrouver ton caddie, en revanche, on ne peut rien promettre.",

  // Leftovers
  "leftovers.title": "Les restes méritent mieux que le fond du frigo.",
  "leftovers.lead":
    "Tu cuisines pour six, vous mangez à trois ? Pas de problème. Les portions restantes peuvent servir pour demain ou être gardées pour un autre repas.",
  "leftovers.moment1When": "Mercredi soir",
  "leftovers.moment1What": "6 portions de lasagnes préparées. 3 mangées.",
  "leftovers.moment2When": "Jeudi midi",
  "leftovers.moment2What": "2 portions prévues pour le repas du lendemain.",
  "leftovers.moment3When": "Encore au frigo",
  "leftovers.moment3What":
    "1 portion à replacer avant qu'elle ne soit oubliée.",
  "leftovers.feature1": "Le nombre de portions qui restent, plat par plat.",
  "leftovers.feature2": "Des restes replanifiés sans rien racheter.",
  "leftovers.feature3": "La durée de conservation notée dans la recette.",
  "leftovers.feature4":
    "Les ingrédients achetés pour un plat finalement pas cuisiné, gardés dans « À utiliser ».",
  "leftovers.feature5": "Des idées de recettes qui les utilisent.",
  "leftovers.slotTonight": "Ce soir",
  "leftovers.slotTomorrowLunch": "Demain midi",
  "leftovers.slotExtra": "En plus pour le frigo",
  "leftovers.dish": "🍝 Lasagnes bolognaise",
  "leftovers.total": "Tu prépares {total} portions",
  "leftovers.onTheList":
    "Sur la liste de courses : {sheets} de feuilles de lasagne, {meat} de viande hachée. Le midi de demain est prévu : il a déjà son créneau. Les portions en plus partent au Frigo, ",
  "leftovers.goodUntil":
    "affichées « bon jusqu'au {date} », {days} jours selon la recette.",
  "leftovers.whenAny": "dès qu'il y en a.",
  "leftovers.fridgeAlt":
    "L'écran Frigo : dans À utiliser, 300 g de tofu d'un wok pas cuisiné avec une idée de recette, et dans Restes, 3 portions de curry de pois chiches, bon jusqu'au samedi 31 octobre, avec Planifier et Jeté.",
  "leftovers.disclaimer":
    "La date affichée vient de la durée de conservation notée dans la recette. Elle aide à ne rien oublier, elle ne remplace ni ton nez ni les indications de l'emballage.",
  "leftovers.note":
    "Le meilleur repas de demain ? Parfois, c'est celui que tu as déjà cuisiné aujourd'hui.",

  // Budget
  "budget.title": "Manger, c'est bien.",
  "budget.titleAccent": "Savoir ce que ça coûte, c'est pas mal non plus.",
  "budget.lead":
    "Menu Maison estime le coût des repas et des courses à partir des prix connus. Et quand tu scannes ton ticket, tu peux vérifier les montants réels et actualiser les prix des produits.",
  "budget.point1Title": "Une recette",
  "budget.point1Text": "Son coût estimé, en tout et par personne.",
  "budget.point2Title": "La semaine",
  "budget.point2Text":
    "Le coût prévisionnel de tout le menu, chez le magasin choisi.",
  "budget.point3Title": "Les enseignes",
  "budget.point3Text": "Des prix par enseigne, mis à jour par tes tickets.",
  "budget.point4Title": "Le ticket",
  "budget.point4Text":
    "L'app lit les lignes, tu vérifies, puis tu enregistres.",
  "budget.point5Title": "Les statistiques",
  "budget.point5Text":
    "Ce qui a été cuisiné, les plats qui reviennent trop souvent, ceux qu'on a oubliés.",
  "budget.disclaimer":
    "Ce sont des estimations, fondées sur les prix enregistrés par la famille : pas une comparaison du marché, ni une promesse d'économies.",
  "budget.statsAlt":
    "L'écran Statistiques : 8 plats cuisinés cette semaine, le birchermüesli signalé comme trop fréquent avec 3 fois en 4 semaines, puis le top des 12 dernières semaines.",
  "budget.thisWeek": "Cette semaine",
  "budget.weekTotal": "env. CHF 117.85",
  "budget.weekDetail": "16 plats, estimé chez Aldi Marly",
  "budget.receiptDish": "🍝 Lasagnes, 3 portions",
  "budget.receiptCost": "CHF {cost}",
  "budget.receiptNote": "prix indicatifs, Coop Fribourg Centre",
  "budget.note":
    "Le birchermüesli, c'est très bon. Mais trois fois cette semaine, ça mérite peut-être une petite discussion.",
} as const;

export const de: { [K in keyof typeof fr]: string } = {
  // How it works
  "how.title": "Vom «Ich hab Hunger» zum Einkaufswagen. In drei Schritten.",
  "how.lead":
    "Es geht nicht darum, den ganzen Abend Mahlzeiten zu planen. Sondern genau darum, Zeit für anderes zurückzugewinnen.",
  "how.tabs": "Die drei Schritte",
  "how.stepNumber": "Schritt {n}: ",
  "how.step1Title": "Stell dein Wochenmenü zusammen",
  "how.step1Text":
    "Zmorge, Zmittag, Znacht: Verteil deine Rezepte auf die passenden Mahlzeiten, pass die Portionen an und denk an die Wünsche von allen.",
  "how.step1Note": "Ja, sogar an den, der nie etwas will.",
  "how.step1Alt":
    "Ein Gericht ins Menü aufnehmen: Zmorge, Zmittag und Znacht, 3 Portionen heute Abend, die Option «Auch für morgen Mittag» mit 3 Portionen und das Total «Du kochst 6 Portionen».",
  "how.step2Title": "Die Einkaufsliste rechnet sich von selbst",
  "how.step2Text":
    "Menu Maison sammelt die Zutaten deiner Rezepte, zählt die Mengen zusammen und lässt dich streichen, was du schon zu Hause hast.",
  "how.step2Note":
    "{lasagnes} Rüebli + {chicken} Rüebli = keine zwei Zeilen nötig.",
  "how.step2Alt":
    "Das Wochenmenü bestätigen: jede Zutat nur einmal mit ihrer Gesamtmenge, alles ist angehakt, was schon zu Hause ist, wird abgewählt.",
  "how.step3Title": "Kauf in der richtigen Reihenfolge ein",
  "how.step3Text":
    "Wähl deinen Laden und finde deine Liste so geordnet, wie du deinen Weg eingerichtet hast, vom Eingang bis zur Kasse.",
  "how.step3Note":
    "Die Käseabteilung ist keine Etappe der Tour de Suisse mehr.",
  "how.step3Alt":
    "Die Einkaufsliste bei Aldi Marly: 31 von 53 Artikeln, rund 114.60 Franken, nach Abteilung geordnet, zuerst Bäckerei, dann Früchte und Gemüse.",
  "how.mergeLasagnes": "🍝 Lasagne, 6 Portionen",
  "how.mergeChicken": "🍗 Ofenpoulet, 3 Portionen",
  "how.mergeTotal": "🥕 Rüebli",

  // Stores
  "store.title": "Dein Laden. Deine Abteilungen. Kein unnötiger Slalom.",
  "store.lead1":
    "Aldi, Coop, Migros, Lidl oder dein Laden um die Ecke: Du legst die Reihenfolge der Abteilungen einmal fest, und Menu Maison ordnet deine Liste danach.",
  "store.lead2":
    "Zuerst Früchte und Gemüse? Gleich danach das Brot? Perfekt. Die Liste folgt deinem Weg, nicht dem Alphabet.",
  "store.point1": "Jeder Laden hat seine eigene Reihenfolge der Abteilungen.",
  "store.point2": "Du wechselst den Laden, die Liste ordnet sich neu.",
  "store.point3": "Die Preise können von Kette zu Kette unterschiedlich sein.",
  "store.point4":
    "Was abgehakt ist, erscheint sofort auf den Handys der anderen in der Familie.",
  "store.point5": "Ein Filter «Noch offen» zeigt, was noch fehlt.",
  "store.editorAlt":
    "Der Ladeneditor, Coop Fribourg Centre: der Weg durch den Laden, von 1 Früchte und Gemüse bis 5 Wurstwaren, mit Pfeilen, um jede Abteilung nach oben oder unten zu schieben.",
  "store.choose": "Wähl deinen Laden",
  "store.storesLabel": "Laden im Beispiel",
  "store.summary":
    "{count} Artikel, geschätzt ca. CHF {cost} bei {store}. Los geht's mit: {first}.",
  "store.note":
    "Die App kennt deinen Weg durch den Laden. Ob du deinen Einkaufswagen wiederfindest, können wir dagegen nicht versprechen.",

  // Leftovers
  "leftovers.title":
    "Reste verdienen mehr als die hinterste Ecke im Kühlschrank.",
  "leftovers.lead":
    "Du kochst für sechs, ihr esst zu dritt? Kein Problem. Die übrigen Portionen reichen für morgen oder bleiben für eine andere Mahlzeit.",
  "leftovers.moment1When": "Mittwochabend",
  "leftovers.moment1What": "6 Portionen Lasagne gekocht. 3 gegessen.",
  "leftovers.moment2When": "Donnerstagmittag",
  "leftovers.moment2What":
    "2 Portionen für den Zmittag am nächsten Tag eingeplant.",
  "leftovers.moment3When": "Noch im Kühlschrank",
  "leftovers.moment3What":
    "1 Portion, die noch einen Platz braucht, bevor sie vergessen geht.",
  "leftovers.feature1": "Wie viele Portionen übrig sind, Gericht für Gericht.",
  "leftovers.feature2": "Reste neu einplanen, ohne etwas nachzukaufen.",
  "leftovers.feature3": "Die Haltbarkeit, direkt im Rezept notiert.",
  "leftovers.feature4":
    "Zutaten für ein Gericht, das dann doch nicht gekocht wurde, bleiben unter «Aufbrauchen».",
  "leftovers.feature5": "Rezeptideen, die sie verwerten.",
  "leftovers.slotTonight": "Heute Abend",
  "leftovers.slotTomorrowLunch": "Morgen Mittag",
  "leftovers.slotExtra": "Extra für den Kühlschrank",
  "leftovers.dish": "🍝 Lasagne Bolognese",
  "leftovers.total": "Du kochst {total} Portionen",
  "leftovers.onTheList":
    "Auf der Einkaufsliste: {sheets} Lasagneblätter, {meat} Hackfleisch. Der Zmittag von morgen ist eingeplant: Er hat schon seinen Platz. Die Extraportionen kommen in den Kühlschrank, ",
  "leftovers.goodUntil":
    "angezeigt mit «gut bis {date}», {days} Tage laut Rezept.",
  "leftovers.whenAny": "sobald es welche gibt.",
  "leftovers.fridgeAlt":
    "Der Bildschirm Kühlschrank: unter Aufbrauchen 300 g Tofu von einem nicht gekochten Wok mit einer Rezeptidee, und unter Reste 3 Portionen Kichererbsencurry, gut bis Samstag, 31. Oktober, mit Planen und Weggeworfen.",
  "leftovers.disclaimer":
    "Das angezeigte Datum kommt von der Haltbarkeit im Rezept. Es hilft, nichts zu vergessen, ersetzt aber weder deine Nase noch die Angaben auf der Verpackung.",
  "leftovers.note":
    "Das beste Essen von morgen? Manchmal ist es das, was du heute schon gekocht hast.",

  // Budget
  "budget.title": "Essen ist schön.",
  "budget.titleAccent": "Zu wissen, was es kostet, ist auch nicht schlecht.",
  "budget.lead":
    "Menu Maison schätzt die Kosten der Mahlzeiten und Einkäufe anhand der bekannten Preise. Und wenn du deinen Kassenzettel scannst, kannst du die echten Beträge prüfen und die Produktpreise aktualisieren.",
  "budget.point1Title": "Ein Rezept",
  "budget.point1Text": "Die geschätzten Kosten, total und pro Person.",
  "budget.point2Title": "Die Woche",
  "budget.point2Text":
    "Die voraussichtlichen Kosten des ganzen Menüs im gewählten Laden.",
  "budget.point3Title": "Die Ketten",
  "budget.point3Text":
    "Preise pro Kette, aktualisiert mit deinen Kassenzetteln.",
  "budget.point4Title": "Der Kassenzettel",
  "budget.point4Text":
    "Die App liest die Zeilen, du prüfst, dann speicherst du.",
  "budget.point5Title": "Die Statistik",
  "budget.point5Text":
    "Was gekocht wurde, welche Gerichte zu oft kommen und welche vergessen gingen.",
  "budget.disclaimer":
    "Das sind Schätzungen auf Basis der Preise, die eure Familie erfasst hat: kein Marktvergleich und kein Sparversprechen.",
  "budget.statsAlt":
    "Der Bildschirm Statistik: 8 gekochte Gerichte diese Woche, das Birchermüesli als zu häufig markiert mit 3 Mal in 4 Wochen, dann die Top-Gerichte der letzten 12 Wochen.",
  "budget.thisWeek": "Diese Woche",
  "budget.weekTotal": "ca. CHF 117.85",
  "budget.weekDetail": "16 Gerichte, geschätzt bei Aldi Marly",
  "budget.receiptDish": "🍝 Lasagne, 3 Portionen",
  "budget.receiptCost": "CHF {cost}",
  "budget.receiptNote": "Richtpreise, Coop Fribourg Centre",
  "budget.note":
    "Birchermüesli ist super. Aber dreimal in einer Woche? Darüber reden wir vielleicht mal kurz.",
};
