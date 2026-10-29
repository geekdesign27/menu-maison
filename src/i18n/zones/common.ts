// Settings, More, Stats, profiles, shared UI pieces, units and toasts, welcome guide.
// Keys start with « common. ». German: Swiss spelling (« ss », never « ß »), « du ».

export const fr = {
  // Shared UI pieces (components/ui.tsx), usable before sign-in
  "common.loading": "Chargement",
  "common.search": "Rechercher",
  "common.clearSearch": "Effacer la recherche",
  "common.close": "Fermer",
  "common.less": "Moins ({label})",
  "common.more": "Plus ({label})",
  "common.linkCopied": "Lien copié, colle-le dans un message.",

  // Last-resort screen
  "common.crash.text":
    "Cet écran a rencontré un problème. Tes données sont en sécurité.",
  "common.crash.reload": "Recharger l'app",

  // Plus
  "common.more.account": "{family}, pseudo {username}",
  "common.more.wishes": "Envies",
  "common.more.wishesText": "Ce qu'on a envie de manger bientôt",
  "common.more.templates": "Menus types",
  "common.more.templatesText": "Nos semaines habituelles, en un tap",
  "common.more.statsText": "Ce qu'on mange, et à quelle fréquence",
  "common.more.productsText":
    "Ingrédients et articles hors recette : prix, rayon, photo",
  "common.more.stores": "Magasins",
  "common.more.storesText": "L'ordre des rayons de chaque magasin",
  "common.more.settingsText": "Profils, jour des courses, rayons",
  "common.more.gestion": "Gestion sur ordinateur",
  "common.more.gestionText":
    "Tableaux des recettes, produits, rayons et magasins",

  // Settings
  "common.settings.title": "Réglages",
  "common.settings.family": "Famille",
  "common.settings.profiles": "Profils",
  "common.settings.addProfile": "Ajouter un profil",
  "common.settings.shoppingDay": "Jour des courses",
  "common.settings.shoppingDayHelp":
    "La semaine du planning commence le {day} : la liste de courses couvre les sept jours qui suivent.",
  "common.settings.defaultPortions": "Portions par défaut",
  "common.settings.defaultPortionsHelp":
    "Proposé à chaque nouveau repas planifié.",
  "common.settings.manage": "Gérer",
  "common.settings.defaultStore": "Magasin par défaut",
  "common.settings.noStore": "Aucun magasin pour l'instant.",
  "common.settings.aisles": "Rayons",
  "common.settings.addAisle": "Ajouter un rayon",
  "common.settings.ingredientsAndPrices": "Ingrédients et prix",
  "common.settings.products": "Produits",
  "common.settings.productsCount":
    "{count} ingrédients, avec leur prix, leur rayon et leur photo",
  "common.settings.thisPhone": "Ce téléphone",
  "common.settings.logout": "Déconnecter ce téléphone",
  "common.settings.changeDayTitle": "Faire les courses le {day} ?",
  "common.settings.changeDayText":
    "Les coches et les articles ajoutés à la main pour la semaine en cours seront remis à zéro.",
  "common.settings.changeDayConfirm": "Changer le jour",
  "common.settings.logoutTitle": "Déconnecter ce téléphone ?",
  "common.settings.logoutText":
    "Il faudra saisir à nouveau ton pseudo et ton mot de passe pour retrouver les menus et la liste de courses.",
  "common.settings.logoutConfirm": "Déconnecter",

  // Family name card (also in the management area)
  "common.family.nameSaved": "Nom de la famille enregistré",
  "common.family.shareText":
    "Menu Maison, famille {family} : connecte-toi avec ton pseudo et ton mot de passe.",
  "common.family.name": "Nom de la famille",
  "common.family.signInLink": "Lien de connexion",
  "common.family.linkFollowsName":
    "Il suit le nom de la famille : changer le nom change le lien.",
  "common.family.shareLink": "Partager le lien",

  // Stats
  "common.stats.title": "Statistiques",
  "common.stats.computing": "Calcul des statistiques",
  "common.stats.emptyTitle": "Pas encore de statistiques",
  "common.stats.emptyText":
    "Elles se remplissent au fil des repas. Planifie la semaine et marque les plats comme mangés, on te dira ce que vous mangez souvent et ce qui manque au menu.",
  "common.stats.planWeek": "Planifier la semaine",
  "common.stats.subtitle": "Pour varier les menus",
  "common.stats.cookedOne": "plat cuisiné",
  "common.stats.cookedMany": "plats cuisinés",
  "common.stats.thisWeek": "{dishes} cette semaine",
  "common.stats.fourWeeks": "{dishes} en 4 semaines",
  "common.stats.tooOften": "Plats trop fréquents",
  "common.stats.timesIn4Weeks": "{count} fois en 4 semaines",
  "common.stats.tooOftenHint":
    "Et si on variait un peu ? Jette un œil à « Ça fait longtemps » juste en dessous.",
  "common.stats.top": "Top des 12 dernières semaines",
  "common.stats.forgotten": "Ça fait longtemps",
  "common.stats.notFor6Months": "Pas au menu depuis plus de 6 mois",
  "common.stats.ago": "Il y a {days}",
  "common.stats.dayOne": "jour",
  "common.stats.dayMany": "jours",
  "common.stats.plan": "Planifier",
  "common.stats.planRecipe": "Planifier {name}",
  "common.stats.styles": "Répartition par style",
  "common.stats.dishOne": "plat",
  "common.stats.dishMany": "plats",
  "common.stats.stylesNote":
    "Sur 12 semaines. Un plat peut compter dans plusieurs styles.",

  // Profile sheet
  "common.member.photoSaved": "Photo enregistrée",
  "common.member.photoTooHeavy":
    "Cette photo est trop lourde, essaie une autre.",
  "common.member.welcome": "Bienvenue, {name} !",
  "common.member.edit": "Modifier le profil",
  "common.member.new": "Nouveau profil",
  "common.member.add": "Ajouter le profil",
  "common.member.placeholderName": "Profil",
  "common.member.uploading": "Envoi…",
  "common.member.changePhoto": "Changer la photo",
  "common.member.addPhoto": "Ajouter une photo",
  "common.member.removePhoto": "Retirer",
  "common.member.firstName": "Prénom",
  "common.member.color": "Couleur",
  "common.member.colorOption": "Couleur {color}",

  // Emoji field
  "common.emoji.label": "Emoji",
  "common.emoji.option": "Emoji {emoji}",
  "common.emoji.otherPlaceholder": "Ou tape un autre emoji",
  "common.emoji.other": "Autre emoji",

  // Sign-in of a profile
  "common.access.yourPseudo": "Ton pseudo :",
  "common.access.pseudoSaved": "Pseudo enregistré",
  "common.access.shareText":
    "Voici ton lien Menu Maison pour choisir ton mot de passe. Ton pseudo : {username}.",
  "common.access.title": "Accès",
  "common.access.pseudo": "Pseudo",
  "common.access.roleIs": "Rôle :",
  "common.access.role": "Rôle",
  "common.access.roleOf": "Rôle de {name}",
  "common.access.admin": "admin",
  "common.access.member": "membre",
  "common.access.adminOption": "Admin",
  "common.access.memberOption": "Membre",
  "common.access.nowAdmin": "{name} est admin",
  "common.access.nowMember": "{name} est membre",
  "common.access.adminHelp":
    "Un admin gère les profils, les accès et l'apparence de la famille.",
  "common.access.activated": "Accès activé : mot de passe choisi.",
  "common.access.notActivated":
    "Pas encore activé : envoie-lui son lien pour choisir son mot de passe.",
  "common.access.forgotOwn":
    "Changer ton mot de passe\u00a0: Réglages, Mon compte. Oublié\u00a0: «\u00a0Mot de passe oublié\u00a0?\u00a0» sur l'écran de connexion, ou un nouveau lien d'un autre admin.",
  "common.access.linkReady":
    "Lien prêt, valable {duration} et utilisable une fois. Ses autres appareils sont déconnectés.",
  "common.access.hours48": "48 heures",
  "common.access.days14": "14 jours",
  "common.access.sendLink": "Envoyer le lien",
  "common.access.forgotNewLink": "Mot de passe oublié : nouveau lien",
  "common.access.createLink": "Créer son lien d'activation",
  "common.access.pseudoFirst": "Choisis d'abord un pseudo.",

  // Family looks (lib/look.ts); font names are brands and stay as they are
  "common.theme.carotte": "Carotte",
  "common.theme.carotteText": "Orange chaleureux, l'original",
  "common.theme.sauge": "Sauge",
  "common.theme.saugeText": "Vert doux et frais",
  "common.theme.myrtille": "Myrtille",
  "common.theme.myrtilleText": "Bleu-violet profond",
  "common.font.nunitoText": "Ronde et douce, l'originale",
  "common.font.quicksandText": "Légère et arrondie",
  "common.font.lexendText": "Nette, pensée pour la lecture",
  "common.font.atkinsonText": "La plus lisible, lettres bien distinctes",

  // Welcome card
  "common.welcome.title": "Bienvenue",
  "common.welcome.start": "Commencer",
  "common.welcome.later": "Plus tard",
  "common.welcome.hiName": "Salut {name} !",
  "common.welcome.hi": "Salut !",
  "common.welcome.pitch":
    "1 minute pour faire le tour ? On te montre où poser un plat, où sont les courses, le frigo et les recettes.",
  "common.welcome.replayHint":
    "Tu pourras le revoir quand tu veux : Plus, « Revoir le guide ».",

  // Tour buttons (driver.js keeps « {{current}} » for itself)
  "common.tour.progress": "{{current}} sur {{total}}",
  "common.tour.next": "Suivant",
  "common.tour.done": "Terminer",
  "common.tour.closeLabel": "Passer le guide",
  "common.tour.skip": "Passer",

  // Tour steps
  "common.tour.weekTitle": "La semaine",
  "common.tour.weekText":
    "Ici, les repas de la semaine. Touche « + Ajouter » pour poser un plat.",
  "common.tour.pickTitle": "Choisir un plat",
  "common.tour.pickText": "Tes envies et les restes à finir sont en haut.",
  "common.tour.mealTitle": "La fiche du plat",
  "common.tour.mealText":
    "Après le repas : Mangé, Pas mangé, Il en reste ou Pas cuisiné.",
  "common.tour.shoppingTitle": "Les courses",
  "common.tour.shoppingText":
    "La liste se fait toute seule, dans l'ordre des rayons de ton magasin.",
  "common.tour.fridgeTitle": "Le frigo",
  "common.tour.fridgeText":
    "Les restes, et ce qu'il faut utiliser avant que ça se perde.",
  "common.tour.recipesTitle": "Les recettes",
  "common.tour.recipesText":
    "Dans Découvrir, like ce que tu aimes : ça aide à choisir les plats de la semaine.",
  "common.tour.profilesTitle": "Profils et liens",
  "common.tour.profilesText":
    "Ajoute les profils de la famille. Dans la fiche de chacun, section Accès : son pseudo, son rôle et son lien d'activation.",
  "common.tour.lookTitle": "Apparence",
  "common.tour.lookText":
    "Trois thèmes et quatre polices, pour toute la famille, appliqués tout de suite sur tous les téléphones.",
  "common.tour.lookPhoneText":
    "Sur ordinateur, onglet Gestion, Famille : trois thèmes et quatre polices, pour toute la famille.",

  // First steps checklist
  "common.steps.title": "Premiers pas",
  "common.steps.count": "{done} sur {total}",
  "common.steps.progress": "({count} sur {goal})",
  "common.steps.done": "Fait :",
  "common.steps.todo": "À faire :",
  "common.steps.replay": "Revoir le guide",
  "common.steps.replayText": "Le tour de l'app en 1 minute",
  "common.steps.homeScreen": "Ajouter l'app à l'écran d'accueil",
  "common.steps.homeScreenHint":
    "Dans le navigateur : Partager, puis « Sur l'écran d'accueil ».",
  "common.steps.photo": "Mettre ta photo",
  "common.steps.photoHint": "Réglages, puis ton profil.",
  "common.steps.likes": "Mettre un cœur à 5 recettes",
  "common.steps.likesHint": "Recettes, Découvrir.",
  "common.steps.wish": "Noter une envie",
  "common.steps.wishHint": "Un plat qui te ferait plaisir.",
  "common.steps.meal": "Ajouter un plat dans la semaine",
  "common.steps.mealHint": "Semaine, « + Ajouter ».",
  "common.steps.check": "Cocher un article des courses",
  "common.steps.checkHint": "Courses, pendant les achats.",
  "common.steps.status": "Dire comment s'est passé un plat",
  "common.steps.statusHint": "Toucher un plat : Mangé, Pas mangé, Il en reste…",
  "common.steps.email": "Ajouter ton e-mail",
  "common.steps.emailHint": "Réglages, Mon compte\u00a0: utile si tu oublies ton mot de passe.",
  "common.steps.members": "Ajouter les membres de la famille",
  "common.steps.membersHint": "Réglages, Profils\u00a0: un profil par personne.",
  "common.steps.joined": "Envoyer son lien à un membre",
  "common.steps.joinedHint": "Dans sa fiche, section Accès\u00a0: le lien d'activation à partager.",
  "common.steps.week": "Planifier une première semaine",
  "common.steps.weekHint": "Semaine, «\u00a0+ Ajouter\u00a0»\u00a0: trois plats pour commencer.",
  "common.steps.list": "Faire une première liste de courses",
  "common.steps.listHint": "Courses\u00a0: coche les articles pendant les achats.",

  // Family set-up, before the tour of a new admin
  "common.setup.intro": "Salut {name}\u00a0! Trois réglages pour commencer, tu pourras les changer dans Réglages.",
  "common.setup.day": "Quel jour fais-tu les courses\u00a0?",
  "common.setup.dayHelp": "Les semaines du menu commencent ce jour-là.",
  "common.setup.store": "Dans quel magasin\u00a0?",
  "common.setup.storeHelp": "La liste de courses suit l'ordre de ses rayons.",
  "common.setup.persons": "Combien êtes-vous à table\u00a0?",
  "common.setup.personsHelp": "Les quantités des recettes en dépendent.",
  "common.setup.save": "Continuer",
  // Names of products, aisles and usual items in both languages
  "common.nameFr": "Nom",
  "common.nameFrHint": "Le nom que voient les profils en français.",
  "common.nameDe": "Nom en allemand",
  "common.nameDeHint": "Facultatif : les profils en allemand voient ce nom.",
} as const;

export const de: { [K in keyof typeof fr]: string } = {
  "common.loading": "Wird geladen",
  "common.search": "Suchen",
  "common.clearSearch": "Suche löschen",
  "common.close": "Schliessen",
  "common.less": "Weniger ({label})",
  "common.more": "Mehr ({label})",
  "common.linkCopied": "Link kopiert, füge ihn in eine Nachricht ein.",

  "common.crash.text":
    "Auf diesem Bildschirm ist ein Problem aufgetreten. Deine Daten sind sicher.",
  "common.crash.reload": "App neu laden",

  "common.more.account": "{family}, Benutzername {username}",
  "common.more.wishes": "Wünsche",
  "common.more.wishesText": "Was wir bald gerne essen möchten",
  "common.more.templates": "Menüvorlagen",
  "common.more.templatesText": "Unsere üblichen Wochen, mit einem Tipp",
  "common.more.statsText": "Was wir essen, und wie oft",
  "common.more.productsText":
    "Zutaten und Artikel ohne Rezept: Preis, Abteilung, Foto",
  "common.more.stores": "Läden",
  "common.more.storesText": "Die Reihenfolge der Abteilungen in jedem Laden",
  "common.more.settingsText": "Profile, Einkaufstag, Abteilungen",
  "common.more.gestion": "Verwaltung am Computer",
  "common.more.gestionText":
    "Tabellen für Rezepte, Produkte, Abteilungen und Läden",

  "common.settings.title": "Einstellungen",
  "common.settings.family": "Familie",
  "common.settings.profiles": "Profile",
  "common.settings.addProfile": "Profil hinzufügen",
  "common.settings.shoppingDay": "Einkaufstag",
  "common.settings.shoppingDayHelp":
    "Die Planungswoche beginnt am {day}: Die Einkaufsliste deckt die sieben Tage danach ab.",
  "common.settings.defaultPortions": "Standardportionen",
  "common.settings.defaultPortionsHelp":
    "Vorschlag für jede neu geplante Mahlzeit.",
  "common.settings.manage": "Verwalten",
  "common.settings.defaultStore": "Standardladen",
  "common.settings.noStore": "Noch kein Laden.",
  "common.settings.aisles": "Abteilungen",
  "common.settings.addAisle": "Abteilung hinzufügen",
  "common.settings.ingredientsAndPrices": "Zutaten und Preise",
  "common.settings.products": "Produkte",
  "common.settings.productsCount":
    "{count} Zutaten, mit Preis, Abteilung und Foto",
  "common.settings.thisPhone": "Dieses Handy",
  "common.settings.logout": "Dieses Handy abmelden",
  "common.settings.changeDayTitle": "Am {day} einkaufen?",
  "common.settings.changeDayText":
    "Die Häkchen und die von Hand hinzugefügten Artikel der laufenden Woche werden zurückgesetzt.",
  "common.settings.changeDayConfirm": "Tag ändern",
  "common.settings.logoutTitle": "Dieses Handy abmelden?",
  "common.settings.logoutText":
    "Du musst deinen Benutzernamen und dein Passwort wieder eingeben, um die Menüs und die Einkaufsliste zu sehen.",
  "common.settings.logoutConfirm": "Abmelden",

  "common.family.nameSaved": "Familienname gespeichert",
  "common.family.shareText":
    "Menu Maison, Familie {family}: Melde dich mit deinem Benutzernamen und deinem Passwort an.",
  "common.family.name": "Familienname",
  "common.family.signInLink": "Anmeldelink",
  "common.family.linkFollowsName":
    "Er folgt dem Familiennamen: Ein neuer Name gibt einen neuen Link.",
  "common.family.shareLink": "Link teilen",

  "common.stats.title": "Statistik",
  "common.stats.computing": "Statistik wird berechnet",
  "common.stats.emptyTitle": "Noch keine Statistik",
  "common.stats.emptyText":
    "Sie füllt sich mit jeder Mahlzeit. Plane die Woche und markiere die Gerichte als gegessen, dann sagen wir dir, was ihr oft esst und was im Menü fehlt.",
  "common.stats.planWeek": "Woche planen",
  "common.stats.subtitle": "Für mehr Abwechslung",
  "common.stats.cookedOne": "Gericht gekocht",
  "common.stats.cookedMany": "Gerichte gekocht",
  "common.stats.thisWeek": "{dishes} diese Woche",
  "common.stats.fourWeeks": "{dishes} in 4 Wochen",
  "common.stats.tooOften": "Zu häufige Gerichte",
  "common.stats.timesIn4Weeks": "{count}-mal in 4 Wochen",
  "common.stats.tooOftenHint":
    "Wie wäre es mit etwas Abwechslung? Schau gleich unten bei «Lange her».",
  "common.stats.top": "Top der letzten 12 Wochen",
  "common.stats.forgotten": "Lange her",
  "common.stats.notFor6Months": "Seit über 6 Monaten nicht im Menü",
  "common.stats.ago": "Vor {days}",
  "common.stats.dayOne": "Tag",
  "common.stats.dayMany": "Tagen",
  "common.stats.plan": "Planen",
  "common.stats.planRecipe": "{name} planen",
  "common.stats.styles": "Verteilung nach Stil",
  "common.stats.dishOne": "Gericht",
  "common.stats.dishMany": "Gerichte",
  "common.stats.stylesNote":
    "Über 12 Wochen. Ein Gericht kann in mehreren Stilen zählen.",

  "common.member.photoSaved": "Foto gespeichert",
  "common.member.photoTooHeavy":
    "Dieses Foto ist zu gross, versuch ein anderes.",
  "common.member.welcome": "Willkommen, {name}!",
  "common.member.edit": "Profil bearbeiten",
  "common.member.new": "Neues Profil",
  "common.member.add": "Profil hinzufügen",
  "common.member.placeholderName": "Profil",
  "common.member.uploading": "Wird gesendet…",
  "common.member.changePhoto": "Foto ändern",
  "common.member.addPhoto": "Foto hinzufügen",
  "common.member.removePhoto": "Entfernen",
  "common.member.firstName": "Vorname",
  "common.member.color": "Farbe",
  "common.member.colorOption": "Farbe {color}",

  "common.emoji.label": "Emoji",
  "common.emoji.option": "Emoji {emoji}",
  "common.emoji.otherPlaceholder": "Oder tippe ein anderes Emoji",
  "common.emoji.other": "Anderes Emoji",

  "common.access.yourPseudo": "Dein Benutzername:",
  "common.access.pseudoSaved": "Benutzername gespeichert",
  "common.access.shareText":
    "Hier ist dein Menu-Maison-Link, um dein Passwort zu wählen. Dein Benutzername: {username}.",
  "common.access.title": "Zugang",
  "common.access.pseudo": "Benutzername",
  "common.access.roleIs": "Rolle:",
  "common.access.role": "Rolle",
  "common.access.roleOf": "Rolle von {name}",
  "common.access.admin": "Admin",
  "common.access.member": "Mitglied",
  "common.access.adminOption": "Admin",
  "common.access.memberOption": "Mitglied",
  "common.access.nowAdmin": "{name} ist Admin",
  "common.access.nowMember": "{name} ist Mitglied",
  "common.access.adminHelp":
    "Ein Admin verwaltet die Profile, die Zugänge und das Aussehen der Familie.",
  "common.access.activated": "Zugang aktiviert: Passwort gewählt.",
  "common.access.notActivated":
    "Noch nicht aktiviert: Schick den Link, damit das Passwort gewählt werden kann.",
  "common.access.forgotOwn":
    "Passwort ändern: Einstellungen, Mein Konto. Vergessen: «Passwort vergessen?» auf dem Anmeldebildschirm oder ein neuer Link von einem anderen Admin.",
  "common.access.linkReady":
    "Link bereit, {duration} gültig und nur einmal nutzbar. Die anderen Geräte dieses Profils werden abgemeldet.",
  "common.access.hours48": "48 Stunden",
  "common.access.days14": "14 Tage",
  "common.access.sendLink": "Link senden",
  "common.access.forgotNewLink": "Passwort vergessen: neuer Link",
  "common.access.createLink": "Aktivierungslink erstellen",
  "common.access.pseudoFirst": "Wähle zuerst einen Benutzernamen.",

  "common.theme.carotte": "Karotte",
  "common.theme.carotteText": "Warmes Orange, das Original",
  "common.theme.sauge": "Salbei",
  "common.theme.saugeText": "Sanftes, frisches Grün",
  "common.theme.myrtille": "Heidelbeere",
  "common.theme.myrtilleText": "Tiefes Blauviolett",
  "common.font.nunitoText": "Rund und weich, das Original",
  "common.font.quicksandText": "Leicht und abgerundet",
  "common.font.lexendText": "Klar, fürs Lesen gemacht",
  "common.font.atkinsonText":
    "Am besten lesbar, klar unterscheidbare Buchstaben",

  "common.welcome.title": "Willkommen",
  "common.welcome.start": "Los geht's",
  "common.welcome.later": "Später",
  "common.welcome.hiName": "Hallo {name}!",
  "common.welcome.hi": "Hallo!",
  "common.welcome.pitch":
    "1 Minute für einen Rundgang? Wir zeigen dir, wo du ein Gericht einplanst und wo Einkauf, Kühlschrank und Rezepte sind.",
  "common.welcome.replayHint":
    "Du kannst ihn jederzeit wieder ansehen: Mehr, «Rundgang wiederholen».",

  "common.tour.progress": "{{current}} von {{total}}",
  "common.tour.next": "Weiter",
  "common.tour.done": "Fertig",
  "common.tour.closeLabel": "Rundgang überspringen",
  "common.tour.skip": "Überspringen",

  "common.tour.weekTitle": "Die Woche",
  "common.tour.weekText":
    "Hier sind die Mahlzeiten der Woche. Tippe auf «+ Hinzufügen», um ein Gericht einzuplanen.",
  "common.tour.pickTitle": "Ein Gericht wählen",
  "common.tour.pickText":
    "Deine Wünsche und die Reste zum Aufbrauchen stehen oben.",
  "common.tour.mealTitle": "Das Gericht",
  "common.tour.mealText":
    "Nach dem Essen: Gegessen, Nicht gegessen, Reste übrig oder Nicht gekocht.",
  "common.tour.shoppingTitle": "Der Einkauf",
  "common.tour.shoppingText":
    "Die Liste entsteht von selbst, in der Reihenfolge der Abteilungen deines Ladens.",
  "common.tour.fridgeTitle": "Der Kühlschrank",
  "common.tour.fridgeText":
    "Die Reste und was du aufbrauchen solltest, bevor es verdirbt.",
  "common.tour.recipesTitle": "Die Rezepte",
  "common.tour.recipesText":
    "Unter Entdecken gibst du allem ein Herz, was du magst: Das hilft beim Auswählen der Gerichte der Woche.",
  "common.tour.profilesTitle": "Profile und Links",
  "common.tour.profilesText":
    "Füge die Profile der Familie hinzu. In jedem Profil, Bereich Zugang: Benutzername, Rolle und Aktivierungslink.",
  "common.tour.lookTitle": "Aussehen",
  "common.tour.lookText":
    "Drei Farbthemen und vier Schriften für die ganze Familie, sofort auf allen Handys.",
  "common.tour.lookPhoneText":
    "Am Computer, Reiter Verwaltung, Familie: drei Farbthemen und vier Schriften für die ganze Familie.",

  "common.steps.title": "Erste Schritte",
  "common.steps.count": "{done} von {total}",
  "common.steps.progress": "({count} von {goal})",
  "common.steps.done": "Erledigt:",
  "common.steps.todo": "Zu tun:",
  "common.steps.replay": "Rundgang wiederholen",
  "common.steps.replayText": "Die App in 1 Minute erklärt",
  "common.steps.homeScreen": "App zum Home-Bildschirm hinzufügen",
  "common.steps.homeScreenHint":
    "Im Browser: Teilen, dann «Zum Home-Bildschirm».",
  "common.steps.photo": "Dein Foto hinzufügen",
  "common.steps.photoHint": "Einstellungen, dann dein Profil.",
  "common.steps.likes": "5 Rezepten ein Herz geben",
  "common.steps.likesHint": "Rezepte, Entdecken.",
  "common.steps.wish": "Einen Wunsch notieren",
  "common.steps.wishHint": "Ein Gericht, auf das du Lust hast.",
  "common.steps.meal": "Ein Gericht in die Woche einplanen",
  "common.steps.mealHint": "Woche, «+ Hinzufügen».",
  "common.steps.check": "Einen Artikel auf der Einkaufsliste abhaken",
  "common.steps.checkHint": "Einkauf, beim Einkaufen.",
  "common.steps.status": "Sagen, wie ein Gericht war",
  "common.steps.statusHint":
    "Tippe auf ein Gericht: Gegessen, Nicht gegessen, Reste übrig…",
  "common.steps.email": "Deine E-Mail hinzufügen",
  "common.steps.emailHint": "Einstellungen, Mein Konto: hilfreich, falls du dein Passwort vergisst.",
  "common.steps.members": "Die Familienmitglieder hinzufügen",
  "common.steps.membersHint": "Einstellungen, Profile: ein Profil pro Person.",
  "common.steps.joined": "Einem Mitglied seinen Link schicken",
  "common.steps.joinedHint": "In seinem Profil, Abschnitt Zugang: der Aktivierungslink zum Teilen.",
  "common.steps.week": "Eine erste Woche planen",
  "common.steps.weekHint": "Woche, «+ Hinzufügen»: drei Gerichte für den Anfang.",
  "common.steps.list": "Eine erste Einkaufsliste erledigen",
  "common.steps.listHint": "Einkauf: hake die Artikel beim Einkaufen ab.",

  // Family set-up, before the tour of a new admin
  "common.setup.intro": "Hallo {name}! Drei Einstellungen für den Start, du kannst sie später in den Einstellungen ändern.",
  "common.setup.day": "An welchem Tag kaufst du ein?",
  "common.setup.dayHelp": "Die Menüwochen beginnen an diesem Tag.",
  "common.setup.store": "In welchem Laden?",
  "common.setup.storeHelp": "Die Einkaufsliste folgt der Reihenfolge seiner Regale.",
  "common.setup.persons": "Wie viele seid ihr am Tisch?",
  "common.setup.personsHelp": "Die Mengen der Rezepte richten sich danach.",
  "common.setup.save": "Weiter",
  "common.nameFr": "Name auf Französisch",
  "common.nameFrHint": "Den sehen die Profile auf Französisch. Leer gelassen: der deutsche Name.",
  "common.nameDe": "Name auf Deutsch",
  "common.nameDeHint": "Diesen Namen siehst du in der App.",
};
