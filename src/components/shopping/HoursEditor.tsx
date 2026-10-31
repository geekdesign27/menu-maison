import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Doc } from "../../../convex/_generated/dataModel";
import { dayName } from "../../../convex/domain/dates";
import {
  formatRange,
  normalizeHours,
  toMinutes,
  type OpeningSlot,
} from "../../../convex/domain/hours";
import { useSession } from "../../lib/session";
import { useRun } from "../../lib/toast";
import { dayButtonClass, dayButtonLabel, WEEKDAYS } from "../../lib/weekdays";
import { useT } from "../../i18n/useT";
import { Button, Card, IconButton, SectionTitle, TextInput } from "../ui";
import { useUpdateStore } from "./useUpdateStore";

/** Opening hours of a market or small shop: slots listed, then a form to add one for several days. */
export function HoursEditor({ store }: { store: Doc<"stores"> }) {
  const { token } = useSession();
  const run = useRun();
  const update = useUpdateStore();
  const { t, lang } = useT();
  const hours = normalizeHours(store.hours ?? []);
  const [days, setDays] = useState<number[]>([]);
  const [open, setOpen] = useState("07:00");
  const [close, setClose] = useState("12:00");

  const reversed = !!open && !!close && toMinutes(close) <= toMinutes(open);
  // True once saved: the mutation itself returns nothing
  const save = (next: OpeningSlot[], success?: string) =>
    run(async () => {
      await update({ token, id: store._id, hours: next });
      return true;
    }, success);

  const add = async () => {
    const saved = await save(
      [...hours, ...days.map((day) => ({ day, open, close }))],
      t("shopping.store.hoursAdded"),
    );
    if (saved) setDays([]);
  };
  const toggle = (day: number) =>
    setDays(
      days.includes(day) ? days.filter((d) => d !== day) : [...days, day],
    );

  return (
    <>
      <SectionTitle>{t("shopping.store.hours")}</SectionTitle>
      <p className="mb-3 px-1 text-[15px] text-muted">
        {t("shopping.store.hoursHelp")}
      </p>
      <Card className="grid gap-4 p-4">
        {hours.length === 0 ? (
          <p className="text-[15px] text-muted">
            {t("shopping.store.hoursEmpty")}
          </p>
        ) : (
          <ul className="-my-1 divide-y divide-line">
            {hours.map((slot, i) => {
              const range = formatRange(slot, lang);
              return (
                <li
                  key={`${slot.day}-${slot.open}`}
                  className="flex min-h-12 items-center gap-2 py-1"
                >
                  <span className="min-w-0 flex-1 text-[17px]">
                    <span className="font-extrabold capitalize">
                      {dayName(slot.day, lang)}
                    </span>
                    {" · "}
                    {range}
                  </span>
                  <IconButton
                    label={t("shopping.store.hoursRemove", {
                      day: dayName(slot.day, lang),
                      range,
                    })}
                    onClick={() => save(hours.filter((_, j) => j !== i))}
                  >
                    <Trash2 size={20} />
                  </IconButton>
                </li>
              );
            })}
          </ul>
        )}

        <div className="grid gap-3 border-t border-line pt-4">
          <div>
            <span className="mb-1 block text-[15px] font-bold">
              {t("shopping.store.hoursDays")}
            </span>
            <div className="grid grid-cols-7 gap-1.5">
              {WEEKDAYS.map((day) => (
                <button
                  key={day}
                  type="button"
                  aria-pressed={days.includes(day)}
                  aria-label={dayName(day, lang)}
                  onClick={() => toggle(day)}
                  className={dayButtonClass(days.includes(day))}
                >
                  {dayButtonLabel(day, lang)}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextInput
              label={t("shopping.store.hoursFrom")}
              type="time"
              step={300}
              value={open}
              onChange={(e) => setOpen(e.target.value)}
            />
            <TextInput
              label={t("shopping.store.hoursTo")}
              type="time"
              step={300}
              value={close}
              onChange={(e) => setClose(e.target.value)}
            />
          </div>
          {reversed && (
            <p className="text-[15px] font-bold text-berry">
              {t("shopping.store.hoursOrder")}
            </p>
          )}
          {!days.length && (
            <p className="text-[15px] text-muted">
              {t("shopping.store.hoursPickDay")}
            </p>
          )}
          <Button
            variant="secondary"
            onClick={add}
            disabled={!days.length || !open || !close || reversed}
          >
            <Plus size={20} /> {t("shopping.store.hoursAdd")}
          </Button>
        </div>
      </Card>
    </>
  );
}
