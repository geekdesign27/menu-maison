// Weekday buttons shared by Réglages and the family set-up of the guide.
import type { Lang } from "../../convex/domain/lang";
import { dayName } from "../../convex/domain/dates";

// Monday first, as on a Swiss calendar; values follow Date.getDay()
export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0];

/** « Lun », « Mar »… in French; « Mo », « Di »… in German. */
export function dayButtonLabel(weekday: number, lang: Lang) {
  const long = dayName(weekday, lang);
  return lang === "de"
    ? long.slice(0, 2)
    : long.charAt(0).toUpperCase() + long.slice(1, 3);
}

/** Classes of a weekday button, picked or not. */
export function dayButtonClass(selected: boolean) {
  return selected
    ? "min-h-12 rounded-2xl bg-carrot text-[15px] font-black text-white shadow-sm"
    : "min-h-12 rounded-2xl bg-cream text-[15px] font-extrabold text-ink ring-1 ring-line active:bg-carrot-soft";
}
