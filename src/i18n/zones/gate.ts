// Sign-in screens (Gate): family link, pseudo and password, invitation.
export const fr = {
  "gate.opening": "Ouverture",
  "gate.tagline": "Les menus de la semaine et la liste de courses.",

  "gate.login.family": "Famille",
  "gate.login.familyPlaceholder": "Le nom de ta famille, par exemple Dupont",
  "gate.login.pseudo": "Pseudo",
  "gate.login.password": "Mot de passe",
  "gate.login.checking": "Vérification…",
  "gate.login.submit": "Se connecter",
  "gate.login.expired": "Ta session a expiré, reconnecte-toi.",
  "gate.login.help":
    "Pour rester connecté, ajoute l'app à l'écran d'accueil (Safari : Partager, puis « Sur l'écran d'accueil »). Mot de passe oublié : demande un nouveau lien à l'admin de ta famille.",
  "gate.login.noAccount": "Je n'ai pas de compte",

  "gate.invite.subtitle": "Lien d'invitation",
  "gate.invite.invalid":
    "Ce lien n'est plus valable. Demande-en un nouveau à l'admin de ta famille.",
  "gate.invite.toLogin": "Aller à la connexion",
  "gate.invite.welcome": "Bienvenue {name} !",
  "gate.invite.yourPseudo": "Ton pseudo",
  "gate.invite.pseudoHelp":
    "Avec ta famille « {family} », il te servira à te connecter.",
  "gate.invite.noPseudo":
    "Ton profil n'a pas encore de pseudo. Demande à l'admin de ta famille de t'en choisir un, puis un nouveau lien.",
  "gate.invite.password": "Mot de passe ({min} caractères au moins)",
  "gate.invite.again": "Encore une fois",
  "gate.invite.mismatch": "Les deux mots de passe ne sont pas pareils.",
  "gate.invite.saving": "Enregistrement…",
  "gate.invite.submit": "C'est parti",

  "gate.signup.subtitle": "Essai gratuit de 7 jours",
  "gate.signup.offer":
    "7 jours pour essayer, puis 20\u00a0CHF par an pour toute la famille. Ta carte est demandée maintenant, débitée seulement après l'essai. Résiliable en un clic.",
  "gate.signup.family": "Nom de la famille",
  "gate.signup.familyPlaceholder": "Par exemple Dupont",
  "gate.signup.familyHelp": "Il donne le lien de connexion de ta famille.",
  "gate.signup.taken": "Ce nom est déjà pris\u00a0: ajoute par exemple ton village.",
  "gate.signup.admin": "Ton prénom",
  "gate.signup.adminHelp": "Tu seras l'admin\u00a0: tu ajouteras ensuite les autres membres.",
  "gate.signup.submit": "Continuer vers le paiement",
  "gate.signup.opening": "Ouverture du paiement…",
  "gate.signup.secure": "Paiement sécurisé par Stripe. Menu Maison ne voit jamais ta carte.",
  "gate.signup.haveAccount": "J'ai déjà un compte",
  "gate.signup.signedIn": "Tu es connecté à la famille «\u00a0{family}\u00a0» sur ce téléphone.",
  "gate.signup.openApp": "Ouvrir l'app",
  "gate.signup.signOutFirst": "Pour créer une autre famille, déconnecte d'abord ce téléphone (Plus, Réglages).",
  "gate.welcome.subtitle": "Bienvenue",
  "gate.welcome.checking": "On vérifie ton paiement…",
  "gate.welcome.pending": "Stripe n'a pas encore confirmé ton inscription. Patiente un instant puis réessaie.",
  "gate.welcome.retry": "Réessayer",
  "gate.welcome.ready": "Ta famille «\u00a0{family}\u00a0» est prête.",
  "gate.welcome.otherDevice":
    "Pour choisir ton mot de passe, ouvre le lien reçu par e-mail sur ce téléphone, ou connecte-toi si c'est déjà fait.",
  "gate.welcome.subscribed": "Abonnement enregistré, merci\u00a0!",
  "gate.welcome.toLogin": "Aller à la connexion",
} as const;

export const de: { [K in keyof typeof fr]: string } = {
  "gate.opening": "Wird geöffnet",
  "gate.tagline": "Die Menüs der Woche und die Einkaufsliste.",

  "gate.login.family": "Familie",
  "gate.login.familyPlaceholder":
    "Der Name deiner Familie, zum Beispiel Müller",
  "gate.login.pseudo": "Benutzername",
  "gate.login.password": "Passwort",
  "gate.login.checking": "Wird geprüft…",
  "gate.login.submit": "Anmelden",
  "gate.login.expired": "Deine Sitzung ist abgelaufen, melde dich wieder an.",
  "gate.login.help":
    "Damit du angemeldet bleibst, füge die App zum Home-Bildschirm hinzu (Safari: Teilen, dann «Zum Home-Bildschirm»). Passwort vergessen: Bitte den Admin deiner Familie um einen neuen Link.",
  "gate.login.noAccount": "Ich habe kein Konto",

  "gate.invite.subtitle": "Einladungslink",
  "gate.invite.invalid":
    "Dieser Link ist nicht mehr gültig. Bitte den Admin deiner Familie um einen neuen.",
  "gate.invite.toLogin": "Zur Anmeldung",
  "gate.invite.welcome": "Willkommen, {name}!",
  "gate.invite.yourPseudo": "Dein Benutzername",
  "gate.invite.pseudoHelp":
    "Damit meldest du dich bei deiner Familie «{family}» an.",
  "gate.invite.noPseudo":
    "Dein Profil hat noch keinen Benutzernamen. Bitte den Admin deiner Familie, dir einen zu geben und dann einen neuen Link zu senden.",
  "gate.invite.password": "Passwort (mindestens {min} Zeichen)",
  "gate.invite.again": "Nochmals eingeben",
  "gate.invite.mismatch": "Die beiden Passwörter stimmen nicht überein.",
  "gate.invite.saving": "Wird gespeichert…",
  "gate.invite.submit": "Los geht's",

  "gate.signup.subtitle": "7 Tage gratis testen",
  "gate.signup.offer":
    "7 Tage zum Ausprobieren, danach 20 CHF pro Jahr für die ganze Familie. Deine Karte wird jetzt erfasst und erst nach dem Test belastet. Mit einem Klick kündbar.",
  "gate.signup.family": "Name der Familie",
  "gate.signup.familyPlaceholder": "Zum Beispiel Müller",
  "gate.signup.familyHelp": "Daraus entsteht der Anmeldelink deiner Familie.",
  "gate.signup.taken": "Dieser Name ist schon vergeben: Füge zum Beispiel dein Dorf hinzu.",
  "gate.signup.admin": "Dein Vorname",
  "gate.signup.adminHelp": "Du bist der Admin: Danach fügst du die anderen Mitglieder hinzu.",
  "gate.signup.submit": "Weiter zur Zahlung",
  "gate.signup.opening": "Zahlung wird geöffnet…",
  "gate.signup.secure": "Sichere Zahlung über Stripe. Menu Maison sieht deine Karte nie.",
  "gate.signup.haveAccount": "Ich habe schon ein Konto",
  "gate.signup.signedIn": "Du bist auf diesem Handy bei der Familie «{family}» angemeldet.",
  "gate.signup.openApp": "App öffnen",
  "gate.signup.signOutFirst": "Um eine weitere Familie zu erstellen, melde dieses Handy zuerst ab (Mehr, Einstellungen).",
  "gate.welcome.subtitle": "Willkommen",
  "gate.welcome.checking": "Deine Zahlung wird geprüft…",
  "gate.welcome.pending": "Stripe hat deine Anmeldung noch nicht bestätigt. Warte einen Moment und versuch es nochmals.",
  "gate.welcome.retry": "Nochmals versuchen",
  "gate.welcome.ready": "Deine Familie «{family}» ist bereit.",
  "gate.welcome.otherDevice":
    "Um dein Passwort zu wählen, öffne den Link aus der E-Mail auf diesem Handy, oder melde dich an, falls das schon erledigt ist.",
  "gate.welcome.subscribed": "Abo gespeichert, danke!",
  "gate.welcome.toLogin": "Zur Anmeldung",
};
