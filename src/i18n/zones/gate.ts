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
};
