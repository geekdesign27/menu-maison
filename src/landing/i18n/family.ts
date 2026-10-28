// Landing page texts (family). French is the reference (typography added by useL);
// German: Swiss (« ss », never « ß »), « du », guillemets «…» without spaces.
// The theme and font texts mirror the app's « common.theme.* » and « common.font.* »:
// the landing page loads without the app's dictionaries.
export const fr = {
  // FamilySync
  "sync.title": "Une famille. Plusieurs téléphones. Le même menu.",
  "sync.lead":
    "Chacun retrouve les repas de la semaine, les recettes et les courses. Les modifications se synchronisent entre les appareils, que tu sois à la maison, au travail ou déjà devant le rayon des pâtes.",
  "sync.profileAlt":
    "Modifier le profil de Marc : son emoji, l'ajout d'une photo et le choix de sa couleur.",
  "sync.point1":
    "Plusieurs profils dans une famille, chacun avec son emoji, sa photo et sa couleur.",
  "sync.point2": "Des envies et des recettes préférées propres à chacun.",
  "sync.point3": "Une seule liste de courses, la même pour tous.",
  "sync.point4":
    "Chaque modification arrive tout de suite sur les autres téléphones.",
  "sync.point5":
    "Deux rôles : Membre, et Admin pour les profils, les accès et l'apparence.",
  "sync.note":
    "Vous pouvez même faire les courses à deux. Sans acheter deux fois le lait.",
  "sync.tryIt": "Touche un article sur un des téléphones",
  "sync.screen": "Courses",
  "sync.phoneOf": "Téléphone de {name}",
  "sync.item.carrots": "Carottes",
  "sync.item.milk": "Lait",
  "sync.item.parmesan": "Parmesan",
  "sync.item.tresse": "Tresse au beurre",
  "sync.itemAria": "{item}, sur le téléphone de {name}",
  "sync.itemCheckedAria": "{item}, coché par {by}, sur le téléphone de {name}",
  "sync.saidChecked": "{item} coché par {by}, déjà visible chez {other}.",
  "sync.saidUnchecked": "{item} décoché, aussi chez {other}.",

  // Themes
  "themes.title": "Une application qui se met aux couleurs de la famille.",
  "themes.lead":
    "Plutôt Carotte, Sauge ou Myrtille ? Chaque famille peut choisir l'ambiance qui lui plaît et sa police de lecture préférée.",
  "themes.themeLabel": "Thème",
  "themes.fontLabel": "Police de lecture",
  "themes.previewTag": "Aperçu, sans toucher aux réglages",
  "themes.note":
    "L'organisation, c'est sérieux. La couleur des boutons, un peu moins.",
  "themes.carotte": "Carotte",
  "themes.carotteText": "Orange chaleureux, l'original",
  "themes.sauge": "Sauge",
  "themes.saugeText": "Vert doux et frais",
  "themes.myrtille": "Myrtille",
  "themes.myrtilleText": "Bleu-violet profond",
  "themes.font.nunitoText": "Ronde et douce, l'originale",
  "themes.font.quicksandText": "Légère et arrondie",
  "themes.font.lexendText": "Nette, pensée pour la lecture",
  "themes.font.atkinsonText": "La plus lisible, lettres bien distinctes",
  "themes.preview.week": "Semaine",
  "themes.preview.dates": "24 au 30 octobre",
  "themes.preview.dishes": "plats prévus",
  "themes.preview.cost": "env. CHF 117.85",
  "themes.preview.list": "Liste de courses",
  "themes.preview.shopping": "Courses",
  "themes.preview.fridge": "+1 frigo",

  // PrivateAccess and NoInviteDialog
  "access.contact": "En parler avec P-A",
  "access.login": "J'ai mon invitation, je me connecte",
  "access.title": "Tu veux entrer ? Il y a juste un petit détail…",
  "access.p1":
    "Menu Maison, c'est un projet maison, créé pour les amis des Schütz. Et comme pour les bons repas entre amis, on ne débarque pas sans invitation.",
  "access.p2":
    "L'application n'est donc pas ouverte aux inscriptions publiques. Si tu fais partie des heureux invités, tu peux te connecter avec les accès qui t'ont été transmis.",
  "access.noAccount": "Je n'ai pas de compte",
  "access.separator": "Pas d'invitation ? Pas de panique.",
  "access.subtitle": "Bonne nouvelle : la recette n'est pas secrète.",
  "access.p3":
    "Tu aimerais créer une application du même genre pour ta famille, ton association ou ton propre projet ? P-A peut volontiers te former et t'accompagner pour apprendre à construire ton outil.",
  "access.p4":
    "Il faudra quelques écus, beaucoup de motivation et une bonne dose de curiosité. Le tablier est facultatif.",
  "access.askFriend":
    "Pour en parler, passe par la personne qui t'a fait découvrir Menu Maison.",
  "access.promise":
    "Promis, pas besoin de savoir coder avant de commencer. Mais il faudra accepter d'apprendre deux ou trois trucs.",
  "access.dialog.close": "Fermer",
  "access.dialog.title":
    "Aïe, tu n'es pas encore dans le carnet d'invitations !",
  "access.dialog.p1":
    "Menu Maison est réservé aux amis des Schütz. Pas d'inscription libre pour le moment : ici, on entre sur invitation, comme pour une bonne raclette.",
  "access.dialog.p2":
    "Mais si tu aimerais apprendre à créer ta propre application, P-A peut te montrer comment faire. Prévois quelques écus, beaucoup de motivation… et éventuellement un café.",
  "access.dialog.back": "Retour à la connexion",

  // FinalCta and Footer
  "closing.title": "Bon. On mange quoi ce soir ?",
  "closing.lead":
    "Avec Menu Maison, tu as déjà un début de réponse. Et peut-être même les ingrédients dans le frigo.",
  "closing.login": "Se connecter à Menu Maison",
  "closing.private": "Accès privé, réservé aux personnes invitées.",
  "closing.top": "Retour en haut",
  "closing.tagline": "Fait maison, pour les gens qu'on aime bien.",
  "closing.footerNav": "Pied de page",
  "closing.credit": "Menu Maison, un projet imaginé par P-A Schütz.",
  "closing.coffee":
    "Fabriqué avec de bonnes idées, un peu de code et probablement trop de café.",
} as const;

export const de: { [K in keyof typeof fr]: string } = {
  // FamilySync
  "sync.title": "Eine Familie. Mehrere Handys. Das gleiche Menü.",
  "sync.lead":
    "Alle sehen die Mahlzeiten der Woche, die Rezepte und den Einkauf. Änderungen synchronisieren sich zwischen den Geräten, ob du zu Hause bist, bei der Arbeit oder schon vor dem Teigwarenregal stehst.",
  "sync.profileAlt":
    "Marcs Profil bearbeiten: sein Emoji, ein Foto hinzufügen und seine Farbe wählen.",
  "sync.point1":
    "Mehrere Profile pro Familie, jedes mit eigenem Emoji, Foto und eigener Farbe.",
  "sync.point2": "Alle haben ihre eigenen Wünsche und Lieblingsrezepte.",
  "sync.point3": "Eine einzige Einkaufsliste, die gleiche für alle.",
  "sync.point4": "Jede Änderung erscheint sofort auf den anderen Handys.",
  "sync.point5":
    "Zwei Rollen: Mitglied, und Admin für Profile, Zugänge und Aussehen.",
  "sync.note":
    "Ihr könnt sogar zu zweit einkaufen. Ohne die Milch doppelt zu kaufen.",
  "sync.tryIt": "Tippe auf einem der Handys auf einen Artikel",
  "sync.screen": "Einkauf",
  "sync.phoneOf": "Handy von {name}",
  "sync.item.carrots": "Karotten",
  "sync.item.milk": "Milch",
  "sync.item.parmesan": "Parmesan",
  "sync.item.tresse": "Butterzopf",
  "sync.itemAria": "{item}, auf dem Handy von {name}",
  "sync.itemCheckedAria": "{item}, abgehakt von {by}, auf dem Handy von {name}",
  "sync.saidChecked": "{item} von {by} abgehakt, schon bei {other} sichtbar.",
  "sync.saidUnchecked": "{item} wieder offen, auch bei {other}.",

  // Themes
  "themes.title": "Eine App, die sich in den Farben der Familie zeigt.",
  "themes.lead":
    "Lieber Karotte, Salbei oder Heidelbeere? Jede Familie wählt die Stimmung, die ihr gefällt, und ihre liebste Schrift zum Lesen.",
  "themes.themeLabel": "Design",
  "themes.fontLabel": "Schrift",
  "themes.previewTag": "Vorschau, ohne die Einstellungen zu ändern",
  "themes.note":
    "Die Organisation ist eine ernste Sache. Die Farbe der Knöpfe etwas weniger.",
  "themes.carotte": "Karotte",
  "themes.carotteText": "Warmes Orange, das Original",
  "themes.sauge": "Salbei",
  "themes.saugeText": "Sanftes, frisches Grün",
  "themes.myrtille": "Heidelbeere",
  "themes.myrtilleText": "Tiefes Blauviolett",
  "themes.font.nunitoText": "Rund und weich, das Original",
  "themes.font.quicksandText": "Leicht und abgerundet",
  "themes.font.lexendText": "Klar, fürs Lesen gemacht",
  "themes.font.atkinsonText":
    "Am besten lesbar, klar unterscheidbare Buchstaben",
  "themes.preview.week": "Woche",
  "themes.preview.dates": "24. bis 30. Oktober",
  "themes.preview.dishes": "Gerichte geplant",
  "themes.preview.cost": "ca. CHF 117.85",
  "themes.preview.list": "Einkaufsliste",
  "themes.preview.shopping": "Einkauf",
  "themes.preview.fridge": "+1 Kühlschrank",

  // PrivateAccess and NoInviteDialog
  "access.contact": "Mit P-A darüber reden",
  "access.login": "Ich habe meine Einladung, ich melde mich an",
  "access.title": "Du möchtest rein? Da gibt es nur einen kleinen Haken…",
  "access.p1":
    "Menu Maison ist ein hausgemachtes Projekt, entstanden für die Freunde der Schütz. Und wie bei einem guten Essen unter Freunden platzt man nicht ohne Einladung herein.",
  "access.p2":
    "Die App ist deshalb nicht für öffentliche Anmeldungen offen. Wenn du zu den glücklichen Gästen gehörst, meldest du dich mit den Zugangsdaten an, die du bekommen hast.",
  "access.noAccount": "Ich habe kein Konto",
  "access.separator": "Keine Einladung? Keine Panik.",
  "access.subtitle": "Gute Nachricht: Das Rezept ist nicht geheim.",
  "access.p3":
    "Du möchtest eine ähnliche App für deine Familie, deinen Verein oder dein eigenes Projekt bauen? P-A bildet dich gerne aus und begleitet dich, damit du lernst, dein eigenes Werkzeug zu bauen.",
  "access.p4":
    "Es braucht ein paar Batzen, viel Motivation und eine gute Portion Neugier. Die Schürze ist freiwillig.",
  "access.askFriend":
    "Wenn du darüber reden möchtest, frag die Person, die dir Menu Maison gezeigt hat.",
  "access.promise":
    "Versprochen, du musst nicht programmieren können, bevor du anfängst. Aber du solltest bereit sein, zwei, drei Sachen zu lernen.",
  "access.dialog.close": "Schliessen",
  "access.dialog.title": "Autsch, du stehst noch nicht im Einladungsbuch!",
  "access.dialog.p1":
    "Menu Maison ist den Freunden der Schütz vorbehalten. Freie Anmeldung gibt es im Moment nicht: Hier kommt man nur mit Einladung rein, wie bei einem guten Raclette.",
  "access.dialog.p2":
    "Aber wenn du lernen möchtest, deine eigene App zu bauen, zeigt dir P-A gerne, wie das geht. Plane ein paar Batzen ein, viel Motivation… und vielleicht einen Kaffee.",
  "access.dialog.back": "Zurück zur Anmeldung",

  // FinalCta and Footer
  "closing.title": "Also. Was essen wir heute Abend?",
  "closing.lead":
    "Mit Menu Maison hast du schon den Anfang einer Antwort. Und vielleicht sogar die Zutaten im Kühlschrank.",
  "closing.login": "Bei Menu Maison anmelden",
  "closing.private": "Privater Zugang, nur für eingeladene Personen.",
  "closing.top": "Zurück nach oben",
  "closing.tagline": "Hausgemacht, für Leute, die wir gern haben.",
  "closing.footerNav": "Fusszeile",
  "closing.credit": "Menu Maison, ein Projekt von P-A Schütz.",
  "closing.coffee":
    "Gemacht mit guten Ideen, ein bisschen Code und wahrscheinlich zu viel Kaffee.",
};
