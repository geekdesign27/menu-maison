// The three legal pages (mentions légales, CGV, confidentialité), FR and DE.
// French is the binding version; the rules quoted here come from the code
// (convex/domain/billing.ts, convex/billing.ts, convex/lib.ts).
import type { Lang } from "../../../convex/domain/lang";
import {
  GRACE_DAYS,
  PRICE_CHF,
  TRIAL_DAYS,
} from "../../../convex/domain/billing";

import type { LegalDoc } from "../entry";

export interface LegalSection {
  heading: string;
  paragraphs?: string[];
  items?: string[];
}

export interface LegalText {
  title: string;
  sections: LegalSection[];
}

/** The seller, as required for selling online in Switzerland. */
export const SELLER = {
  name: "Pierre-Alain Schütz",
  street: "Rte du Centre 11b",
  city: "1720\u00a0Corminboeuf",
  email: "miam@menumaison.ch",
} as const;

/** Date of this version, shown on each page. */
export const LEGAL_VERSION = "2026-10-29";

/** Days after each yearly charge during which a full refund can be asked for. */
export const REFUND_DAYS = 14;

const seller = `${SELLER.name}, ${SELLER.street}, ${SELLER.city}, Suisse`;
const sellerDe = `${SELLER.name}, ${SELLER.street}, ${SELLER.city}, Schweiz`;

const FR: Record<LegalDoc, LegalText> = {
  mentions: {
    title: "Mentions légales",
    sections: [
      {
        heading: "Éditeur et vendeur",
        paragraphs: [
          `Menu Maison est édité et vendu par ${SELLER.name}, en son nom propre.`,
          `Adresse : ${SELLER.street}, ${SELLER.city}, Suisse.`,
          `E-mail : ${SELLER.email}`,
        ],
      },
      {
        heading: "TVA",
        paragraphs: [
          "Le chiffre d'affaires reste sous le seuil d'assujettissement : les prix sont indiqués sans TVA, qui n'est pas perçue.",
        ],
      },
      {
        heading: "Hébergement",
        paragraphs: [
          "Le site menumaison.ch est publié par GitHub Pages (GitHub Inc., États-Unis). Les données de l'app sont hébergées par Convex, dans un centre de données en Irlande (Union européenne).",
        ],
      },
      {
        heading: "Contenus",
        paragraphs: [
          "Les textes, illustrations et le code de Menu Maison appartiennent à leur auteur. Les recettes, photos et listes saisies par une famille restent les siennes.",
        ],
      },
    ],
  },
  conditions: {
    title: "Conditions générales",
    sections: [
      {
        heading: "1. Objet",
        paragraphs: [
          `Ces conditions règlent l'abonnement à Menu Maison, une app pour planifier les menus de la semaine, gérer les recettes et faire les courses en famille. Le vendeur est ${seller}.`,
        ],
      },
      {
        heading: "2. Prix",
        paragraphs: [
          `L'abonnement coûte ${PRICE_CHF}\u00a0CHF par an et par famille, TVA non perçue. Il comprend toute l'app, pour tous les profils de la famille, et les fonctions d'intelligence artificielle dans un budget mensuel plafonné.`,
        ],
      },
      {
        heading: "3. Essai gratuit",
        paragraphs: [
          `L'abonnement commence par ${TRIAL_DAYS} jours gratuits. Une carte de paiement est demandée à l'inscription, mais rien n'est débité pendant l'essai. Un e-mail de rappel est envoyé 2 à 3 jours avant la fin de l'essai. Sans résiliation avant la fin de l'essai, le premier montant annuel est débité ce jour-là.`,
        ],
      },
      {
        heading: "4. Paiement et renouvellement",
        paragraphs: [
          "Le paiement est traité par Stripe. L'abonnement se renouvelle automatiquement chaque année, au même prix, sauf résiliation. Une hausse de prix serait annoncée par e-mail au moins 30 jours avant le renouvellement concerné, avec la possibilité de résilier avant.",
          `Si un paiement échoue, l'app reste utilisable ${GRACE_DAYS} jours, le temps de mettre à jour la carte. Ensuite, elle passe en lecture seule jusqu'au paiement.`,
        ],
      },
      {
        heading: "5. Résiliation",
        paragraphs: [
          "L'admin de la famille peut résilier à tout moment, simplement, depuis les réglages de l'app. La résiliation prend effet à la fin de la période payée (ou de l'essai) : l'app reste ouverte jusque-là, puis passe en lecture seule. L'abonnement peut être réactivé ensuite.",
        ],
      },
      {
        heading: "6. Remboursement",
        paragraphs: [
          `Dans les ${REFUND_DAYS} jours qui suivent chaque débit annuel, renouvellement compris, le montant est remboursé en entier sur simple demande à ${SELLER.email}, sans justification. L'abonnement prend alors fin. Passé ce délai, la période entamée n'est pas remboursée.`,
        ],
      },
      {
        heading: "7. Intelligence artificielle",
        paragraphs: [
          "Certaines fonctions (importer une recette, dicter, scanner un ticket de caisse, suggestions) utilisent des services d'intelligence artificielle. Leurs résultats peuvent contenir des erreurs : vérifie notamment les quantités et les allergènes. L'usage de l'IA est plafonné chaque mois, et plus bas pendant l'essai.",
        ],
      },
      {
        heading: "8. Disponibilité",
        paragraphs: [
          "Menu Maison est un petit service, entretenu avec soin, mais sans garantie de disponibilité permanente. Des interruptions pour maintenance ou pannes restent possibles. Les fonctions peuvent évoluer, sans retirer l'essentiel de ce qui a été payé.",
        ],
      },
      {
        heading: "9. Responsabilité",
        paragraphs: [
          "Dans les limites permises par la loi, la responsabilité du vendeur est limitée au montant payé pour l'année en cours. Elle est exclue pour les dommages indirects. La responsabilité pour faute intentionnelle ou grave négligence reste entière.",
        ],
      },
      {
        heading: "10. Compte et données",
        paragraphs: [
          "La famille est responsable des accès qu'elle donne à ses membres. L'admin peut exporter les données de la famille et supprimer la famille à tout moment ; la suppression arrête l'abonnement et efface les données. Le traitement des données est décrit dans la politique de confidentialité.",
        ],
      },
      {
        heading: "11. Modification des conditions",
        paragraphs: [
          "Ces conditions peuvent être adaptées. Une modification importante est annoncée par e-mail au moins 30 jours avant d'entrer en vigueur ; elle s'applique au renouvellement suivant, que la famille peut refuser en résiliant.",
        ],
      },
      {
        heading: "12. Droit applicable et for",
        paragraphs: [
          "Le droit suisse s'applique. Le for est à Fribourg, sous réserve des fors impératifs prévus pour les consommateurs. La version française de ces conditions fait foi.",
        ],
      },
    ],
  },
  confidentialite: {
    title: "Politique de confidentialité",
    sections: [
      {
        heading: "1. Responsable",
        paragraphs: [
          `Le responsable du traitement est ${seller}. Pour toute question sur tes données : ${SELLER.email}. Cette politique suit la loi fédérale sur la protection des données (nLPD).`,
        ],
      },
      {
        heading: "2. Données traitées",
        items: [
          "Compte : nom de la famille, prénoms, pseudos, mots de passe (enregistrés sous forme hachée, jamais lisibles), langue, et l'adresse e-mail de l'abonnement.",
          "Contenu de la famille : menus, recettes, photos (recettes, produits, profils), listes de courses, stock, envies, magasins et réglages.",
          "Paiement : traité par Stripe. Menu Maison ne voit ni ne garde le numéro de carte ; il ne garde que l'état de l'abonnement et ses dates.",
          "Fonctions d'IA : le texte, la photo ou l'enregistrement de voix que tu envoies à traiter. La voix et les tickets de caisse ne sont pas conservés, seul le résultat l'est.",
          "Technique : l'adresse IP et les journaux de connexion des hébergeurs, gardés brièvement pour la sécurité.",
        ],
      },
      {
        heading: "3. Finalités",
        paragraphs: [
          "Ces données servent uniquement à faire fonctionner l'app pour ta famille, à gérer l'abonnement, à envoyer les e-mails liés au compte (notamment bienvenue, rappel de fin d'essai, paiement, connexion, résiliation) et à protéger le service contre les abus. Aucune donnée n'est vendue, ni utilisée pour de la publicité.",
        ],
      },
      {
        heading: "4. Sous-traitants et pays",
        paragraphs: [
          "Pour fonctionner, Menu Maison confie des données aux prestataires suivants, chacun limité à ce dont il a besoin :",
        ],
        items: [
          "Convex : base de données et serveur de l'app, Irlande (UE).",
          "Stripe : paiement et abonnement, Irlande et États-Unis.",
          "Resend : envoi des e-mails, États-Unis.",
          "Anthropic : IA pour importer les recettes, lire les tickets de caisse et faire des suggestions, États-Unis.",
          "Groq : transcription de la voix dictée, États-Unis.",
          "Open Food Facts : recherche de produits, France (seuls les termes recherchés partent, aucune donnée personnelle).",
          "GitHub Pages : publication du site, États-Unis.",
        ],
      },
      {
        heading: "5. Transferts à l'étranger",
        paragraphs: [
          "L'UE offre une protection adéquate selon le Conseil fédéral. Pour les États-Unis, les transferts s'appuient sur le Swiss-U.S. Data Privacy Framework lorsque le prestataire y est certifié, sinon sur les clauses contractuelles types reconnues par le Préposé fédéral (PFPDT).",
        ],
      },
      {
        heading: "6. Cookies et suivi",
        paragraphs: [
          "Menu Maison n'utilise aucun cookie publicitaire et aucun outil de pistage. Le téléphone garde seulement, dans son stockage local, la session de connexion et quelques préférences d'affichage (langue, thème).",
        ],
      },
      {
        heading: "7. Durée de conservation",
        items: [
          "Les données de la famille sont gardées tant que la famille existe, y compris en lecture seule après la fin d'un abonnement, pour pouvoir le réactiver.",
          "La suppression de la famille, faite par l'admin dans l'app ou demandée par e-mail, efface ses données et ses photos.",
          "Une session de connexion expire après un an au plus.",
          "Les pièces comptables (paiements, factures) sont gardées par Stripe et par le vendeur pendant 10 ans, comme l'exige la loi.",
        ],
      },
      {
        heading: "8. Tes droits",
        paragraphs: [
          `Tu peux demander l'accès à tes données, leur rectification ou leur suppression, et en recevoir une copie. L'admin de la famille peut aussi exporter toutes les données depuis l'app et supprimer la famille directement dans l'app. Écris à ${SELLER.email} ; la réponse arrive dans les 30 jours. Tu peux aussi t'adresser au Préposé fédéral à la protection des données et à la transparence (PFPDT).`,
        ],
      },
      {
        heading: "9. Sécurité",
        paragraphs: [
          "Les échanges sont chiffrés (HTTPS), les mots de passe enregistrés sous forme hachée, et chaque famille ne voit que ses propres données.",
        ],
      },
      {
        heading: "10. Modifications",
        paragraphs: [
          "Cette politique peut évoluer, par exemple avec un nouveau prestataire. La version en vigueur est toujours sur cette page, avec sa date ; un changement important est annoncé par e-mail.",
        ],
      },
    ],
  },
};

const DE: Record<LegalDoc, LegalText> = {
  mentions: {
    title: "Impressum",
    sections: [
      {
        heading: "Herausgeber und Verkäufer",
        paragraphs: [
          `Menu Maison wird von ${SELLER.name} in eigenem Namen herausgegeben und verkauft.`,
          `Adresse: ${SELLER.street}, ${SELLER.city}, Schweiz.`,
          `E-Mail: ${SELLER.email}`,
        ],
      },
      {
        heading: "Mehrwertsteuer",
        paragraphs: [
          "Der Umsatz liegt unter der Schwelle der Steuerpflicht: Die Preise verstehen sich ohne MWST, die nicht erhoben wird.",
        ],
      },
      {
        heading: "Hosting",
        paragraphs: [
          "Die Website menumaison.ch wird über GitHub Pages (GitHub Inc., USA) veröffentlicht. Die Daten der App liegen bei Convex, in einem Rechenzentrum in Irland (Europäische Union).",
        ],
      },
      {
        heading: "Inhalte",
        paragraphs: [
          "Texte, Illustrationen und Code von Menu Maison gehören ihrem Urheber. Rezepte, Fotos und Listen einer Familie bleiben ihre eigenen.",
        ],
      },
    ],
  },
  conditions: {
    title: "Allgemeine Geschäftsbedingungen",
    sections: [
      {
        heading: "1. Gegenstand",
        paragraphs: [
          `Diese Bedingungen regeln das Abonnement von Menu Maison, einer App, um die Menüs der Woche zu planen, Rezepte zu verwalten und als Familie einzukaufen. Verkäufer ist ${sellerDe}.`,
        ],
      },
      {
        heading: "2. Preis",
        paragraphs: [
          `Das Abonnement kostet ${PRICE_CHF}\u00a0CHF pro Jahr und Familie, ohne MWST. Es umfasst die ganze App für alle Profile der Familie und die Funktionen mit künstlicher Intelligenz innerhalb eines begrenzten Monatsbudgets.`,
        ],
      },
      {
        heading: "3. Gratis-Test",
        paragraphs: [
          `Das Abonnement beginnt mit ${TRIAL_DAYS} Gratistagen. Bei der Anmeldung wird eine Zahlungskarte verlangt, während des Tests wird aber nichts belastet. 2 bis 3 Tage vor Testende kommt eine Erinnerung per E-Mail. Ohne Kündigung vor Testende wird an diesem Tag der erste Jahresbetrag belastet.`,
        ],
      },
      {
        heading: "4. Zahlung und Verlängerung",
        paragraphs: [
          "Die Zahlung wird von Stripe abgewickelt. Das Abonnement verlängert sich jedes Jahr automatisch zum gleichen Preis, sofern es nicht gekündigt wird. Eine Preiserhöhung würde mindestens 30 Tage vor der betroffenen Verlängerung per E-Mail angekündigt, mit der Möglichkeit, vorher zu kündigen.",
          `Schlägt eine Zahlung fehl, bleibt die App ${GRACE_DAYS} Tage nutzbar, damit die Karte aktualisiert werden kann. Danach ist sie bis zur Zahlung nur noch lesbar.`,
        ],
      },
      {
        heading: "5. Kündigung",
        paragraphs: [
          "Der Admin der Familie kann jederzeit einfach kündigen, in den Einstellungen der App. Die Kündigung gilt auf Ende der bezahlten Periode (oder des Tests): Bis dahin bleibt die App offen, danach ist sie nur noch lesbar. Das Abonnement kann später wieder aktiviert werden.",
        ],
      },
      {
        heading: "6. Rückerstattung",
        paragraphs: [
          `Innerhalb von ${REFUND_DAYS} Tagen nach jeder Jahresbelastung, Verlängerung inbegriffen, wird der Betrag auf einfache Anfrage an ${SELLER.email} vollständig zurückerstattet, ohne Begründung. Das Abonnement endet dann. Danach wird die angebrochene Periode nicht zurückerstattet.`,
        ],
      },
      {
        heading: "7. Künstliche Intelligenz",
        paragraphs: [
          "Einige Funktionen (Rezept importieren, diktieren, Kassenzettel scannen, Vorschläge) nutzen Dienste mit künstlicher Intelligenz. Ihre Ergebnisse können Fehler enthalten: Prüfe besonders Mengen und Allergene. Die Nutzung der KI ist pro Monat begrenzt, während des Tests tiefer.",
        ],
      },
      {
        heading: "8. Verfügbarkeit",
        paragraphs: [
          "Menu Maison ist ein kleiner, sorgfältig betreuter Dienst, aber ohne Garantie einer ständigen Verfügbarkeit. Unterbrüche für Wartung oder bei Störungen sind möglich. Die Funktionen können sich weiterentwickeln, ohne das Wesentliche des Bezahlten wegzunehmen.",
        ],
      },
      {
        heading: "9. Haftung",
        paragraphs: [
          "Soweit gesetzlich zulässig, ist die Haftung des Verkäufers auf den für das laufende Jahr bezahlten Betrag beschränkt. Für indirekte Schäden ist sie ausgeschlossen. Die Haftung für Vorsatz und grobe Fahrlässigkeit bleibt vollständig bestehen.",
        ],
      },
      {
        heading: "10. Konto und Daten",
        paragraphs: [
          "Die Familie ist für die Zugänge verantwortlich, die sie ihren Mitgliedern gibt. Der Admin kann die Daten der Familie jederzeit exportieren und die Familie löschen; die Löschung beendet das Abonnement und entfernt die Daten. Die Bearbeitung der Daten beschreibt die Datenschutzerklärung.",
        ],
      },
      {
        heading: "11. Änderung der Bedingungen",
        paragraphs: [
          "Diese Bedingungen können angepasst werden. Eine wesentliche Änderung wird mindestens 30 Tage vor Inkrafttreten per E-Mail angekündigt; sie gilt ab der nächsten Verlängerung, die die Familie mit einer Kündigung ablehnen kann.",
        ],
      },
      {
        heading: "12. Anwendbares Recht und Gerichtsstand",
        paragraphs: [
          "Es gilt Schweizer Recht. Gerichtsstand ist Freiburg, unter Vorbehalt der zwingenden Gerichtsstände für Konsumentinnen und Konsumenten. Massgebend ist die französische Fassung dieser Bedingungen.",
        ],
      },
    ],
  },
  confidentialite: {
    title: "Datenschutzerklärung",
    sections: [
      {
        heading: "1. Verantwortlicher",
        paragraphs: [
          `Verantwortlich für die Bearbeitung ist ${sellerDe}. Fragen zu deinen Daten: ${SELLER.email}. Diese Erklärung folgt dem Bundesgesetz über den Datenschutz (revDSG).`,
        ],
      },
      {
        heading: "2. Bearbeitete Daten",
        items: [
          "Konto: Name der Familie, Vornamen, Pseudonyme, Passwörter (als Hash gespeichert, nie lesbar), Sprache und die E-Mail-Adresse des Abonnements.",
          "Inhalt der Familie: Menüs, Rezepte, Fotos (Rezepte, Produkte, Profile), Einkaufslisten, Vorrat, Wünsche, Läden und Einstellungen.",
          "Zahlung: von Stripe abgewickelt. Menu Maison sieht und speichert keine Kartennummer; es behält nur den Stand des Abonnements und seine Daten.",
          "KI-Funktionen: der Text, das Foto oder die Sprachaufnahme, die du verarbeiten lässt. Sprache und Kassenzettel werden nicht aufbewahrt, nur das Ergebnis.",
          "Technik: IP-Adresse und Zugriffsprotokolle der Hosting-Anbieter, kurz aufbewahrt für die Sicherheit.",
        ],
      },
      {
        heading: "3. Zwecke",
        paragraphs: [
          "Diese Daten dienen nur dazu, die App für deine Familie zu betreiben, das Abonnement zu verwalten, die E-Mails zum Konto zu senden (unter anderem Willkommen, Erinnerung vor Testende, Zahlung, Anmeldung, Kündigung) und den Dienst vor Missbrauch zu schützen. Keine Daten werden verkauft oder für Werbung genutzt.",
        ],
      },
      {
        heading: "4. Auftragsbearbeiter und Länder",
        paragraphs: [
          "Für den Betrieb vertraut Menu Maison folgenden Anbietern Daten an, jedem nur das, was er braucht:",
        ],
        items: [
          "Convex: Datenbank und Server der App, Irland (EU).",
          "Stripe: Zahlung und Abonnement, Irland und USA.",
          "Resend: Versand der E-Mails, USA.",
          "Anthropic: KI zum Importieren von Rezepten, Lesen von Kassenzetteln und für Vorschläge, USA.",
          "Groq: Umwandlung der diktierten Sprache in Text, USA.",
          "Open Food Facts: Produktsuche, Frankreich (nur die Suchbegriffe, keine Personendaten).",
          "GitHub Pages: Veröffentlichung der Website, USA.",
        ],
      },
      {
        heading: "5. Bekanntgabe ins Ausland",
        paragraphs: [
          "Die EU bietet laut Bundesrat einen angemessenen Schutz. Für die USA stützt sich die Bekanntgabe auf das Swiss-U.S. Data Privacy Framework, wenn der Anbieter zertifiziert ist, sonst auf die vom Eidgenössischen Datenschutz- und Öffentlichkeitsbeauftragten (EDÖB) anerkannten Standardvertragsklauseln.",
        ],
      },
      {
        heading: "6. Cookies und Tracking",
        paragraphs: [
          "Menu Maison verwendet keine Werbe-Cookies und kein Tracking. Das Handy speichert lokal nur die Anmeldung und einige Anzeigeeinstellungen (Sprache, Design).",
        ],
      },
      {
        heading: "7. Aufbewahrungsdauer",
        items: [
          "Die Daten der Familie bleiben, solange die Familie besteht, auch lesbar nach Ende eines Abonnements, damit es wieder aktiviert werden kann.",
          "Die Löschung der Familie, durch den Admin in der App oder per E-Mail verlangt, entfernt ihre Daten und Fotos.",
          "Eine Anmeldung läuft spätestens nach einem Jahr ab.",
          "Buchhaltungsbelege (Zahlungen, Rechnungen) bewahren Stripe und der Verkäufer 10 Jahre auf, wie es das Gesetz verlangt.",
        ],
      },
      {
        heading: "8. Deine Rechte",
        paragraphs: [
          `Du kannst Auskunft über deine Daten, ihre Berichtigung oder Löschung verlangen und eine Kopie erhalten. Der Admin der Familie kann ausserdem alle Daten in der App exportieren und die Familie direkt in der App löschen. Schreib an ${SELLER.email}; die Antwort kommt innert 30 Tagen. Du kannst dich auch an den Eidgenössischen Datenschutz- und Öffentlichkeitsbeauftragten (EDÖB) wenden.`,
        ],
      },
      {
        heading: "9. Sicherheit",
        paragraphs: [
          "Die Verbindungen sind verschlüsselt (HTTPS), die Passwörter als Hash gespeichert, und jede Familie sieht nur ihre eigenen Daten.",
        ],
      },
      {
        heading: "10. Änderungen",
        paragraphs: [
          "Diese Erklärung kann sich ändern, zum Beispiel mit einem neuen Anbieter. Die gültige Fassung steht immer auf dieser Seite, mit Datum; eine wesentliche Änderung wird per E-Mail angekündigt.",
        ],
      },
    ],
  },
};

export const LEGAL: Record<Lang, Record<LegalDoc, LegalText>> = {
  fr: FR,
  de: DE,
};
