import { ConvexError } from "convex/values";

/** Swiss price format: « CHF 12.40 ». */
export function formatChf(amount: number) {
  return `CHF ${amount.toFixed(2)}`;
}

/** « 1 personne », « 3 personnes ». */
export function persons(n: number) {
  return `${n} ${n > 1 ? "personnes" : "personne"}`;
}

export function minutes(n: number) {
  if (n < 60) return `${n} min`;
  const h = Math.floor(n / 60);
  const m = n % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}

/** Human message from a Convex or network error. */
export function errorMessage(e: unknown) {
  if (e instanceof ConvexError)
    return typeof e.data === "string"
      ? e.data
      : "Action refusée par le serveur.";
  if (e instanceof Error && /network|fetch|connection/i.test(e.message))
    return "Pas de connexion. Réessaie dans un instant.";
  return "Une erreur est survenue. Réessaie.";
}

export function plural(n: number, one: string, many: string) {
  return `${n} ${n > 1 ? many : one}`;
}
