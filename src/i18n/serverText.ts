import type { Lang } from "../../convex/domain/lang";

/**
 * German for the texts the server writes in French: error messages, and the
 * messages of convex/domain shown as is. Keys are the French texts as written
 * in convex/ (non-breaking spaces count as plain spaces); `{name}` marks a part
 * that varies, itself translated when it is a known text (« Titre »…).
 * serverText.test.ts checks that every sentence of the server is here.
 */
const DE: Record<string, string> = {
  // ---------- Field names, inserted in « {what} : … » messages
  Article: "Artikel",
  "Conservation au frigo": "Haltbarkeit im Kühlschrank",
  "Contenu d'un paquet": "Inhalt einer Packung",
  Description: "Beschreibung",
  Envie: "Wunsch",
  "Jour des courses": "Einkaufstag",
  Libellé: "Bezeichnung",
  "Lien de la recette": "Link zum Rezept",
  "Nom de l'ingrédient": "Name der Zutat",
  "Nom de la recette": "Name des Rezepts",
  "Nom du magasin": "Name des Ladens",
  "Nom du menu type": "Name der Menüvorlage",
  "Nom du rayon": "Name der Abteilung",
  "Nombre de personnes": "Anzahl Personen",
  "Nombre de semaines": "Anzahl Wochen",
  "Portions en plus": "Zusätzliche Portionen",
  "Portions restantes": "Übrige Portionen",
  Prix: "Preis",
  Prénom: "Vorname",
  Quantité: "Menge",
  "Quantité de référence du prix": "Referenzmenge des Preises",
  Recherche: "Suche",
  "Temps de préparation": "Zubereitungszeit",
  Titre: "Titel",
  Étape: "Schritt",
  "Le pseudo": "Der Benutzername",
  "Le nom du lien": "Der Name des Links",
  "Budget Claude": "Claude-Budget",
  "Dictées par mois": "Diktate pro Monat",
  "Nom allemand": "Deutscher Name",

  // ---------- Shared checks (convex/lib.ts)
  "Session expirée, reconnecte-toi.":
    "Sitzung abgelaufen, melde dich wieder an.",
  "Introuvable.": "Nicht gefunden.",
  "Réservé aux admins de la famille.": "Nur für die Admins der Familie.",
  "Date invalide : {date}": "Ungültiges Datum: {date}",
  "Date invalide : « {date} » (format attendu AAAA-MM-JJ)":
    "Ungültiges Datum: «{date}» (erwartet JJJJ-MM-TT)",
  "{what} : {max} caractères au maximum.": "{what}: höchstens {max} Zeichen.",
  "{what} : entre {min} et {max}.": "{what}: zwischen {min} und {max}.",
  "{what} : valeur invalide.": "{what}: ungültiger Wert.",
  "Couleur invalide.": "Ungültige Farbe.",
  "Emoji invalide.": "Ungültiges Emoji.",

  // ---------- Not found
  "Profil introuvable.": "Profil nicht gefunden.",
  "Magasin introuvable.": "Laden nicht gefunden.",
  "Rayon introuvable.": "Abteilung nicht gefunden.",
  "Ingrédient introuvable.": "Zutat nicht gefunden.",
  "Recette introuvable.": "Rezept nicht gefunden.",
  "Repas introuvable.": "Mahlzeit nicht gefunden.",
  "Restes introuvables.": "Reste nicht gefunden.",
  "Article introuvable.": "Artikel nicht gefunden.",
  "Menu type introuvable.": "Menüvorlage nicht gefunden.",
  "Admin introuvable.": "Admin nicht gefunden.",
  "Famille introuvable.": "Familie nicht gefunden.",
  "Un ingrédient de la recette n'existe plus.":
    "Eine Zutat des Rezepts gibt es nicht mehr.",

  // ---------- Sign-in and profiles
  "Pseudo ou mot de passe incorrect.": "Benutzername oder Passwort falsch.",
  "Profil sans famille.": "Profil ohne Familie.",
  "Trop d'essais. Réessaie dans {minutes} min.":
    "Zu viele Versuche. Versuch es in {minutes} Min. nochmals.",
  "Ce lien n'est plus valable. Demande-en un nouveau à l'admin de ta famille.":
    "Dieser Link ist nicht mehr gültig. Frag den Admin deiner Familie nach einem neuen.",
  "Ce profil n'a pas encore de pseudo. Demande à l'admin de ta famille.":
    "Dieses Profil hat noch keinen Benutzernamen. Frag den Admin deiner Familie.",
  "L'accès de ce profil se gère avec le super-admin.":
    "Den Zugang dieses Profils verwaltet der Super-Admin.",
  "Le pseudo « {username} » est déjà pris dans la famille.":
    "Der Benutzername «{username}» ist in der Familie schon vergeben.",
  "Tu ne peux pas changer ton propre rôle : demande à un autre admin.":
    "Du kannst deine eigene Rolle nicht ändern: Frag einen anderen Admin.",
  "Pour ton propre accès, demande à un autre admin de la famille.":
    "Für deinen eigenen Zugang frag einen anderen Admin der Familie.",
  "Choisis d'abord un pseudo pour ce profil.":
    "Wähle zuerst einen Benutzernamen für dieses Profil.",
  "{what} doit faire entre 2 et 30 caractères.":
    "{what} muss 2 bis 30 Zeichen lang sein.",
  "{what} ne peut contenir que des lettres sans accent, des chiffres, des points et des tirets.":
    "{what} darf nur Buchstaben ohne Akzent, Ziffern, Punkte und Bindestriche enthalten.",
  "Le mot de passe doit faire au moins {min} caractères.":
    "Das Passwort muss mindestens {min} Zeichen lang sein.",
  "Mot de passe trop long.": "Passwort zu lang.",
  "Le mot de passe ne doit contenir ni ton pseudo ni le nom de la famille.":
    "Das Passwort darf weder deinen Benutzernamen noch den Namen der Familie enthalten.",
  "Ce mot de passe est trop courant, choisis-en un autre.":
    "Dieses Passwort ist zu häufig, wähle ein anderes.",

  // ---------- Catalogue
  "Le prénom est obligatoire.": "Der Vorname fehlt.",
  "Le nom de l'ingrédient est obligatoire.": "Der Name der Zutat fehlt.",
  "Le nom du rayon est obligatoire.": "Der Name der Abteilung fehlt.",
  "Le nom du magasin est obligatoire.": "Der Name des Ladens fehlt.",
  "« {name} » existe déjà.": "«{name}» gibt es schon.",
  "Niveau de prix invalide.": "Ungültige Preisstufe.",
  "Trop de rayons.": "Zu viele Abteilungen.",
  "Utilisé dans la recette {names}. Retire-le d'abord de cette recette.":
    "Wird im Rezept {names} verwendet. Entferne es zuerst aus diesem Rezept.",
  "Utilisé dans les recettes {names}. Retire-le d'abord de ces recettes.":
    "Wird in den Rezepten {names} verwendet. Entferne es zuerst aus diesen Rezepten.",

  // ---------- Families (super-admin)
  "Le nom de la famille est obligatoire.": "Der Name der Familie fehlt.",
  "Ce nom ne donne pas un lien valable : {problem}":
    "Dieser Name ergibt keinen gültigen Link: {problem}",
  "Le nom « {name} » est déjà pris par une autre famille. Ajoute par exemple ton village.":
    "Der Name «{name}» ist schon von einer anderen Familie vergeben. Füge zum Beispiel dein Dorf hinzu.",
  "Le prénom de l'admin est obligatoire.": "Der Vorname des Admins fehlt.",
  "Réservé au super-admin.": "Nur für den Super-Admin.",
  "Pour ta famille, passe par Réglages, Profils.":
    "Für deine Familie geh über Einstellungen, Profile.",
  "Cet admin n'a pas de pseudo.": "Dieser Admin hat keinen Benutzernamen.",
  "Réactive d'abord la famille.": "Aktiviere zuerst die Familie wieder.",
  "Tu ne peux pas suspendre ta propre famille.":
    "Du kannst deine eigene Familie nicht sperren.",

  // ---------- Week and meals
  "Choisis une recette ou écris un titre.":
    "Wähle ein Rezept oder schreib einen Titel.",
  "Pour un plat pas cuisiné, passe par « Pas cuisiné » sur le plat.":
    "Für ein nicht gekochtes Gericht tippe beim Gericht auf «Nicht gekocht».",
  "Des restes ne se cuisinent pas : retire-les du menu.":
    "Reste werden nicht gekocht: Entferne sie aus dem Menü.",
  "Trop d'ingrédients.": "Zu viele Zutaten.",
  "Ce plat a déjà été cuisiné pour un autre repas : marque plutôt celui-ci « Pas mangé ».":
    "Dieses Gericht wurde schon für eine andere Mahlzeit gekocht: Markiere dieses lieber als «Nicht gegessen».",
  "Quantité invalide.": "Ungültige Menge.",
  "Il n'y a plus de portions de ce plat.":
    "Von diesem Gericht gibt es keine Portionen mehr.",
  "Les restes ne peuvent pas être mangés avant d'être cuisinés.":
    "Reste können nicht gegessen werden, bevor sie gekocht sind.",
  "Choisis au moins un jour.": "Wähle mindestens einen Tag.",
  "Donne un nom à ce menu type.": "Gib dieser Menüvorlage einen Namen.",
  "La semaine ne contient aucun plat avec recette.":
    "Die Woche enthält kein Gericht mit Rezept.",
  "Écris ton envie ou choisis une recette.":
    "Schreib deinen Wunsch oder wähle ein Rezept.",

  // ---------- Recipes
  "Le nom de la recette est obligatoire.": "Der Name des Rezepts fehlt.",
  "La traduction n'est pas encore configurée (clé ANTHROPIC_API_KEY manquante).":
    "Die Übersetzung ist noch nicht eingerichtet (Schlüssel ANTHROPIC_API_KEY fehlt).",
  "La traduction a échoué. Réessaie dans un moment.":
    "Die Übersetzung ist fehlgeschlagen. Versuch es gleich nochmals.",
  "Trop de tags ou tag trop long.": "Zu viele Stile oder Stil zu lang.",
  "Lien de la recette invalide.": "Ungültiger Link zum Rezept.",
  "Un nouvel ingrédient n'a pas de nom.": "Eine neue Zutat hat keinen Namen.",

  // ---------- Shopping and usual items
  "Article invalide.": "Ungültiger Artikel.",
  "Écris ce qu'il faut acheter.": "Schreib, was eingekauft werden muss.",
  "Liste invalide.": "Ungültige Liste.",
  "Le nom de l'article est obligatoire.": "Der Name des Artikels fehlt.",

  // ---------- Open Food Facts
  "Open Food Facts ne répond pas pour l'instant. Crée l'ingrédient à la main ou réessaie plus tard.":
    "Open Food Facts antwortet im Moment nicht. Erfasse die Zutat von Hand oder versuch es später nochmals.",
  "Open Food Facts reçoit trop de recherches. Réessaie dans une minute.":
    "Open Food Facts erhält zu viele Suchanfragen. Versuch es in einer Minute nochmals.",
  "Code-barres invalide.": "Ungültiger Strichcode.",
  "Ce produit est déjà lié à « {name} ».":
    "Dieses Produkt ist schon mit «{name}» verknüpft.",
  "Produit introuvable sur Open Food Facts.":
    "Produkt auf Open Food Facts nicht gefunden.",

  // ---------- Receipts
  "Liste de courses trop longue.": "Einkaufsliste zu lang.",
  "Photo trop lourde ou vide.": "Foto zu gross oder leer.",
  "La lecture des tickets n'est pas encore configurée (clé ANTHROPIC_API_KEY manquante).":
    "Das Lesen von Kassenzetteln ist noch nicht eingerichtet (Schlüssel ANTHROPIC_API_KEY fehlt).",
  "Ce ticket n'a pas pu être lu. Réessaie avec une autre photo.":
    "Dieser Kassenzettel konnte nicht gelesen werden. Versuch es mit einem anderen Foto.",
  "Ticket trop long pour une seule lecture.":
    "Kassenzettel zu lang für einmal Lesen.",
  "Trop de lectures en même temps. Réessaie dans une minute.":
    "Zu viele Lesevorgänge gleichzeitig. Versuch es in einer Minute nochmals.",
  "La lecture du ticket a échoué. Réessaie dans un moment.":
    "Das Lesen des Kassenzettels ist fehlgeschlagen. Versuch es gleich nochmals.",
  "La clé ANTHROPIC_API_KEY est refusée par Anthropic.":
    "Der Schlüssel ANTHROPIC_API_KEY wird von Anthropic abgelehnt.",
  "Réponse illisible.": "Unlesbare Antwort.",
  "Réponse illisible": "Unlesbare Antwort.",
  "Ticket trop long.": "Kassenzettel zu lang.",
  "Aucune ligne de produit lue sur ce ticket.":
    "Auf diesem Kassenzettel wurde keine Produktzeile gelesen.",
  "Prix ou poids invalide pour « {label} ».":
    "Ungültiger Preis oder ungültiges Gewicht für «{label}».",
  "Contenu du paquet « {label} »": "Inhalt der Packung «{label}»",
  "Produit introuvable pour « {label} ».":
    "Produkt für «{label}» nicht gefunden.",
  "Ingrédient introuvable pour « {label} ».":
    "Zutat für «{label}» nicht gefunden.",
  "Article introuvable pour « {label} ».":
    "Artikel für «{label}» nicht gefunden.",
  "« {label} » : {problem}": "«{label}»: {problem}",
  "Le contenu se donne en grammes : 500 pour un paquet de 500 g.":
    "Den Inhalt in Gramm angeben: 500 für eine Packung von 500 g.",
  "Le contenu se donne en millilitres : 1000 pour une bouteille d'un litre.":
    "Den Inhalt in Milliliter angeben: 1000 für eine Literflasche.",

  // ---------- Subscription
  "L'abonnement de ta famille est terminé : l'app est en lecture seule. L'admin peut le réactiver.":
    "Das Abo deiner Familie ist abgelaufen: Die App ist nur noch lesbar. Der Admin kann es wieder aktivieren.",
  "Le paiement n'est pas encore configuré.": "Die Zahlung ist noch nicht eingerichtet.",
  "La page de paiement n'a pas pu s'ouvrir. Réessaie dans un moment.":
    "Die Zahlungsseite konnte nicht geöffnet werden. Versuch es gleich nochmals.",
  "Lien invalide.": "Ungültiger Link.",
  "Ta famille reste offerte.": "Deine Familie bleibt geschenkt.",
  "Aucun abonnement à gérer pour l'instant.": "Im Moment gibt es kein Abo zu verwalten.",
  "Un abonnement existe déjà : gère-le avec « Gérer mon abonnement ».":
    "Es gibt schon ein Abo: Verwalte es mit «Mein Abo verwalten».",
  "La page de gestion de l'abonnement n'a pas pu s'ouvrir. Réessaie dans un moment.":
    "Die Seite zur Abo-Verwaltung konnte nicht geöffnet werden. Versuch es gleich nochmals.",
  "Nom trop long.": "Name zu lang.",
  "Trop d'inscriptions en même temps. Réessaie dans quelques minutes.":
    "Zu viele Anmeldungen gleichzeitig. Versuch es in ein paar Minuten nochmals.",

  // ---------- Monthly AI budget
  "Le budget IA de ta famille pour ce mois est atteint. Il repart le 1er du mois prochain.":
    "Das KI-Budget deiner Familie für diesen Monat ist aufgebraucht. Am 1. des nächsten Monats geht es wieder los.",
  "Ta famille a utilisé toutes ses dictées de ce mois. Elles repartent le 1er du mois prochain.":
    "Deine Familie hat alle Diktate dieses Monats gebraucht. Am 1. des nächsten Monats geht es wieder los.",

  // ---------- Recipe import and dictation
  "Cette page ne répond pas. Vérifie le lien ou réessaie plus tard.":
    "Diese Seite antwortet nicht. Prüf den Link oder versuch es später nochmals.",
  "Ce site refuse la lecture automatique. Copie le texte de la recette et utilise la dictée.":
    "Diese Website lässt sich nicht automatisch lesen. Kopiere den Text des Rezepts und nutze das Diktat.",
  "Page trop lourde.": "Seite zu gross.",
  "Ce lien n'est pas accepté.": "Dieser Link wird nicht akzeptiert.",
  "Ce lien n'est pas valide.": "Dieser Link ist ungültig.",
  "Le lien doit commencer par https://.":
    "Der Link muss mit https:// beginnen.",
  "Enregistrement introuvable, recommence la dictée.":
    "Aufnahme nicht gefunden, starte das Diktat neu.",
  "Ce fichier n'est pas un enregistrement audio.":
    "Diese Datei ist keine Audioaufnahme.",
  "Dictée trop longue, 5 minutes au plus.":
    "Diktat zu lang, höchstens 5 Minuten.",
  "La dictée n'est pas encore configurée (clé GROQ_API_KEY manquante).":
    "Das Diktat ist noch nicht eingerichtet (Schlüssel GROQ_API_KEY fehlt).",
  "La transcription ne répond pas. Réessaie dans un moment.":
    "Die Transkription antwortet nicht. Versuch es gleich nochmals.",
  "La clé GROQ_API_KEY est refusée par Groq.":
    "Der Schlüssel GROQ_API_KEY wird von Groq abgelehnt.",
  "Trop de dictées pour aujourd'hui ou en même temps. Réessaie plus tard.":
    "Zu viele Diktate heute oder gleichzeitig. Versuch es später nochmals.",
  "La transcription a échoué. Réessaie dans un moment.":
    "Die Transkription ist fehlgeschlagen. Versuch es gleich nochmals.",
  "Je n'ai rien entendu. Parle près du téléphone et réessaie.":
    "Ich habe nichts gehört. Sprich nahe am Telefon und versuch es nochmals.",
  "Colle le lien de la recette (il commence par https://) ou son texte complet.":
    "Füge den Link zum Rezept (er beginnt mit https://) oder den ganzen Text ein.",
  "Ce lien ne mène pas à une page de recette.":
    "Dieser Link führt nicht zu einer Rezeptseite.",
  "Aucune recette trouvée à cette adresse.":
    "Unter dieser Adresse wurde kein Rezept gefunden.",
  "L'import de recettes n'est pas encore configuré (clé ANTHROPIC_API_KEY manquante).":
    "Der Rezeptimport ist noch nicht eingerichtet (Schlüssel ANTHROPIC_API_KEY fehlt).",
  "Cette recette n'a pas pu être lue.":
    "Dieses Rezept konnte nicht gelesen werden.",
  "Recette trop longue pour une seule lecture.":
    "Rezept zu lang für einmal Lesen.",
  "La lecture de la recette a échoué. Réessaie dans un moment.":
    "Das Lesen des Rezepts ist fehlgeschlagen. Versuch es gleich nochmals.",
};

const plain = (s: string) => s.replace(/[  ]/g, " ").trim();
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const EXACT = new Map(Object.entries(DE).map(([fr, de]) => [plain(fr), de]));
// Patterns with the most fixed text first: « {what} : valeur invalide. » wins over « {label} » : {problem}
const PATTERNS = Object.entries(DE)
  .filter(([fr]) => fr.includes("{"))
  .map(([fr, de]) => {
    const names = [...fr.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
    const source = escape(plain(fr)).replace(/\\\{\w+\\\}/g, "(.+?)");
    return {
      re: new RegExp(`^${source}$`, "s"),
      names,
      de,
      fixed: fr.replace(/\{\w+\}/g, "").length,
    };
  })
  .sort((a, b) => b.fixed - a.fixed);

/** A part inserted in a message: translated when known, with Swiss German guillemets. */
function part(value: string): string {
  const known = find(value);
  if (known !== null) return known;
  return value
    .replace(/«\s*(.*?)\s*»/g, "«$1»")
    .replace(/ \(archivée\)/g, " (archiviert)")
    .replace(/ et (\d+) autres?$/, " und $1 weitere");
}

function find(fr: string): string | null {
  const text = plain(fr);
  const exact = EXACT.get(text);
  if (exact !== undefined) return exact;
  for (const { re, names, de } of PATTERNS) {
    const m = re.exec(text);
    if (!m) continue;
    return names.reduce(
      (out, name, i) => out.replace(`{${name}}`, () => part(m[i + 1])),
      de,
    );
  }
  return null;
}

/** Whether `fr` has a German version (used by the tests). */
export function hasGerman(fr: string): boolean {
  return find(fr) !== null;
}

/** A French text written by the server, in the member's language (French when unknown). */
export function serverText(lang: Lang, fr: string): string {
  return lang === "de" ? (find(fr) ?? fr) : fr;
}
