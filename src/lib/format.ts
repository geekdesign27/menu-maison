import { ConvexError } from "convex/values";
import type { Lang } from "../../convex/domain/lang";
import { serverText } from "../i18n/serverText";

/** Swiss price format: « CHF 12.40 ». */
export function formatChf(amount: number) {
  return `CHF ${amount.toFixed(2)}`;
}

/** « 1 portion », « 3 portions ». */
export function portions(n: number) {
  return `${n} ${n > 1 ? "portions" : "portion"}`;
}

export function minutes(n: number) {
  if (n < 60) return `${n} min`;
  const h = Math.floor(n / 60);
  const m = n % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}

/** Human message from a Convex or network error. Server messages come in their own language. */
export function errorMessage(e: unknown, lang: Lang = "fr") {
  const de = lang === "de";
  if (e instanceof ConvexError)
    return typeof e.data === "string"
      ? serverText(lang, e.data)
      : de
        ? "Vom Server abgelehnt."
        : "Action refusée par le serveur.";
  if (e instanceof Error && /network|fetch|connection/i.test(e.message))
    return de
      ? "Keine Verbindung. Versuch es gleich nochmals."
      : "Pas de connexion. Réessaie dans un instant.";
  return de
    ? "Ein Fehler ist aufgetreten. Versuch es nochmals."
    : "Une erreur est survenue. Réessaie.";
}

export function plural(n: number, one: string, many: string) {
  return `${n} ${n > 1 ? many : one}`;
}
