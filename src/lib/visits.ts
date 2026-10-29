// Visit statistics from the browser: one small beacon per event, no cookie, no
// visitor id, nothing written on the device (convex/http.ts /stats,
// convex/domain/visits.ts). Family phones (signed in) are never counted.
import type { Lang } from "../../convex/domain/lang";
import { statsUrlOf, type ClientEvent } from "../../convex/domain/visits";
import { LOGIN_HASH, PRICING_ID, SIGNUP_HASH } from "../landing/entry";
import { hasStoredToken } from "./device";

const STATS_URL = statsUrlOf(
  import.meta.env.VITE_CONVEX_URL as string | undefined,
);
// Counted once per page load (kept in memory only): a visit, and « Essayer »
// however many of its buttons are clicked
const ONCE: ClientEvent[] = ["visit", "trial"];
const counted = new Set<ClientEvent>();

/** The campaign of the address (?utm_source=…) and the site the visitor came from. */
function origin() {
  let ref = "";
  try {
    ref = document.referrer ? new URL(document.referrer).hostname : "";
  } catch {
    // An unreadable referrer counts as direct
  }
  return {
    ref,
    utm: new URLSearchParams(window.location.search).get("utm_source") ?? "",
  };
}

export function track(event: ClientEvent, lang: Lang) {
  if (
    !STATS_URL ||
    hasStoredToken() ||
    typeof navigator.sendBeacon !== "function"
  )
    return;
  if (ONCE.includes(event)) {
    if (counted.has(event)) return;
    counted.add(event);
  }
  try {
    navigator.sendBeacon(
      STATS_URL,
      JSON.stringify({ event, lang, ...origin() }),
    );
  } catch {
    // Statistics never get in the visitor's way
  }
}

/** The event of a click on the landing page, from the link's address; null for the others. */
export function clickEventOf(
  href: string | null,
  contact: string | null,
): ClientEvent | null {
  if (!href) return null;
  if (href === SIGNUP_HASH) return "trial";
  if (href === LOGIN_HASH) return "login";
  if (href === `#${PRICING_ID}`) return "pricing";
  if (contact && href === contact) return "contact";
  return null;
}
