import { useState } from "react";
import {
  addDays,
  dayOfWeek,
  dayShortName,
  weekDays,
} from "../../../convex/domain/dates";
import { useT } from "../../i18n/useT";
import { useWeek } from "../../lib/week";
import { cx } from "../ui";

/** Grid of day tiles; tapping one selects it. */
export function DayGrid({
  days,
  value,
  onChange,
}: {
  days: string[];
  value: string;
  onChange: (date: string) => void;
}) {
  const { today } = useWeek();
  const { t, lang } = useT();
  return (
    <div
      className="grid grid-cols-7 gap-1.5"
      role="radiogroup"
      aria-label={t("week.day")}
    >
      {days.map((d) => {
        const selected = d === value;
        return (
          <button
            key={d}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(d)}
            className={cx(
              "flex min-h-14 flex-col items-center justify-center rounded-2xl text-center transition",
              selected
                ? "bg-carrot text-white shadow-sm"
                : "bg-paper ring-1 ring-line active:bg-carrot-soft",
              !selected && d === today && "ring-2 ring-carrot",
              !selected && d < today && "opacity-60",
            )}
          >
            <span className="text-[13px] font-bold leading-none">
              {dayShortName(dayOfWeek(d), lang)}
            </span>
            <span className="mt-1 text-lg font-black leading-none tabular-nums">
              {Number(d.slice(8))}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Days of the displayed planning week, with a switch to the following one. */
export function WeekDayPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (date: string) => void;
}) {
  const { start } = useWeek();
  const { t } = useT();
  const nextStart = addDays(start, 7);
  const [showNext, setShowNext] = useState(value >= nextStart);
  const days = weekDays(showNext ? nextStart : start);
  return (
    <div>
      <DayGrid days={days} value={value} onChange={onChange} />
      <button
        type="button"
        onClick={() => setShowNext((s) => !s)}
        className="mt-1 min-h-11 px-1 text-[15px] font-extrabold text-carrot-dark"
      >
        {showNext ? t("week.backToShownWeek") : t("week.nextWeek")}
      </button>
    </div>
  );
}
