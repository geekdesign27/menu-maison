import { Check, Refrigerator, Users } from "lucide-react";
import { daysBetween, formatDayShort } from "../../../convex/domain/dates";
import { cx } from "../ui";
import type { WeekMeal } from "./data";

/** Tappable dish on a day card. */
export function MealPill({
  meal,
  onClick,
}: {
  meal: WeekMeal;
  onClick: () => void;
}) {
  const name = meal.recipe?.name ?? meal.title ?? "Plat";
  const ahead = daysBetween(meal.cookedOn, meal.date);
  const eaten = meal.status === "mangé";
  const notEaten = meal.status === "pas mangé";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "flex min-h-14 w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-left transition active:scale-[0.99]",
        eaten && "bg-herb-soft",
        notEaten && "bg-berry-soft/70",
        meal.status === "prévu" && "bg-cream ring-1 ring-line",
      )}
    >
      <span className="text-3xl leading-none" aria-hidden>
        {meal.recipe?.emoji ?? "🍽️"}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cx(
            "block truncate text-[16px] font-extrabold",
            notEaten && "text-muted line-through decoration-2",
          )}
        >
          {name}
        </span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[14px] font-semibold text-muted">
          <span className="inline-flex items-center gap-1">
            <Users size={14} aria-hidden />
            {meal.persons}
          </span>
          {!!meal.extraPortions && (
            <span className="rounded-full bg-herb-soft px-2 font-extrabold text-herb">
              +{meal.extraPortions}&nbsp;frigo
            </span>
          )}
          {meal.fromLeftoverOf ? (
            <span className="rounded-full bg-sun-soft px-2 font-extrabold text-[#8a6200]">
              restes du {formatDayShort(meal.cookedOn)}
            </span>
          ) : (
            ahead > 0 && (
              <span>
                {ahead === 1
                  ? "préparé la veille"
                  : `préparé le ${formatDayShort(meal.cookedOn)}`}
              </span>
            )
          )}
          {meal.leftoverPortions > 0 && meal.status !== "prévu" && (
            <span className="inline-flex items-center gap-1 text-herb">
              <Refrigerator size={14} aria-hidden />
              {meal.leftoverPortions} au frigo
            </span>
          )}
        </span>
      </span>
      {eaten && (
        <span
          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-herb text-white"
          aria-label="Mangé"
        >
          <Check size={16} strokeWidth={3} />
        </span>
      )}
      {notEaten && (
        <span className="shrink-0 text-[13px] font-extrabold text-berry">
          pas mangé
        </span>
      )}
    </button>
  );
}
