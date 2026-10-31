import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { dayName } from "../../../convex/domain/dates";
import { formatClock, openState, zurichClock, type OpeningSlot } from "../../../convex/domain/hours";
import { useT } from "../../i18n/useT";
import { cx } from "../ui";

/** « Ouvert jusqu'à 12 h » under the store chips, for a market or shop with hours. */
export function StoreOpenNow({ hours }: { hours?: OpeningSlot[] }) {
  const { t, lang } = useT();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  const { weekday, minutes } = zurichClock(now);
  const state = openState(hours ?? [], weekday, minutes);
  if (state.kind === "none") return null;
  const text =
    state.kind === "open"
      ? t("shopping.hours.openUntil", { time: formatClock(state.until, lang) })
      : state.kind === "later"
        ? t("shopping.hours.opensToday", { time: formatClock(state.from, lang) })
        : state.inDays === 1
          ? t("shopping.hours.opensTomorrow", { time: formatClock(state.from, lang) })
          : t("shopping.hours.opensOn", { day: dayName(state.day, lang), time: formatClock(state.from, lang) });
  return (
    <p
      className={cx(
        "mt-2 inline-flex min-h-9 items-center gap-2 rounded-2xl px-3 text-[15px] font-extrabold",
        state.kind === "open" ? "bg-herb-soft text-herb" : "bg-sun-soft text-[#8a6200]",
      )}
    >
      <Clock size={17} aria-hidden /> {text}
    </p>
  );
}
