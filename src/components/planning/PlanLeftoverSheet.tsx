import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { addDays, formatDayLong, weekDays } from "../../../convex/domain/dates";
import { useT } from "../../i18n/useT";
import { useSession } from "../../lib/session";
import { useWeek } from "../../lib/week";
import { useRun } from "../../lib/toast";
import { plural } from "../../lib/format";
import { Button, Segmented, Sheet, Stepper } from "../ui";
import { DayGrid } from "./DayPicker";
import { Field, useSlotOptions } from "./controls";
import { capitalize, type Slot } from "./data";

/** A dish whose spare portions can be put on another meal. */
export interface LeftoverSource {
  _id: Id<"meals">;
  leftoverPortions: number;
  cookedOn: string;
  title?: string;
  recipe: { name: string; emoji: string; fridgeDays: number } | null;
}

/**
 * Puts spare portions on another day and meal: from the fridge, or straight from
 * a planned dish cooked with « portions en plus » (before it is even cooked).
 */
export function PlanLeftoverSheet({
  source,
  onClose,
}: {
  source: LeftoverSource | null;
  onClose: () => void;
}) {
  const { t } = useT();
  return (
    <Sheet open={!!source} onClose={onClose} title={t("week.planLeftovers")}>
      {source && (
        <PlanLeftoverForm key={source._id} source={source} onClose={onClose} />
      )}
    </Sheet>
  );
}

function PlanLeftoverForm({
  source,
  onClose,
}: {
  source: LeftoverSource;
  onClose: () => void;
}) {
  const { token } = useSession();
  const { today } = useWeek();
  const { t, lang } = useT();
  const slotOptions = useSlotOptions();
  const run = useRun();
  const planLeftover = useMutation(api.meals.planLeftover);
  // Leftovers exist from the cooking day on; offer the 7 days from then (never before today)
  const first = source.cookedOn > today ? source.cookedOn : today;
  const until = addDays(source.cookedOn, source.recipe?.fridgeDays ?? 2);
  const [date, setDate] = useState(
    addDays(first, first === source.cookedOn ? 1 : 0),
  );
  const [slot, setSlot] = useState<Slot>("midi");
  const [portions, setPortions] = useState(source.leftoverPortions);
  const [saving, setSaving] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="text-4xl" aria-hidden>
          {source.recipe?.emoji ?? "🍽️"}
        </span>
        <div className="min-w-0">
          <div className="truncate text-lg font-black">
            {source.recipe?.name ?? source.title}
          </div>
          <div className="text-[15px] text-muted">
            {t("week.toPlace", {
              portions: plural(
                source.leftoverPortions,
                t("week.portionOne"),
                t("week.portionMany"),
              ),
              date: formatDayLong(until, lang),
            })}
          </div>
        </div>
      </div>
      <Field label={t("week.day")}>
        <DayGrid days={weekDays(first)} value={date} onChange={setDate} />
        <p className="mt-2 text-[15px] font-semibold text-muted">
          {capitalize(formatDayLong(date, lang))}
          {date > until && (
            <span className="text-berry">{t("week.afterLimit")}</span>
          )}
        </p>
      </Field>
      <Field label={t("week.meal")}>
        <Segmented
          label={t("week.meal")}
          value={slot}
          options={slotOptions}
          onChange={setSlot}
        />
      </Field>
      <div className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] bg-paper p-4 ring-1 ring-line">
        <span className="font-extrabold">{t("week.portions")}</span>
        <Stepper
          label={t("week.portions")}
          value={portions}
          max={source.leftoverPortions}
          onChange={setPortions}
        />
      </div>
      <Button
        size="lg"
        variant="herb"
        disabled={saving}
        onClick={async () => {
          setSaving(true);
          const id = await run(
            () =>
              planLeftover({
                token,
                sourceId: source._id,
                date,
                slot,
                persons: portions,
              }),
            t("week.leftoversAdded"),
          );
          setSaving(false);
          if (id) onClose();
        }}
      >
        {t("week.addToMenu")}
      </Button>
    </div>
  );
}
