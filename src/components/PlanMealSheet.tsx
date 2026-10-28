import { useState } from "react";
import { useMutation } from "convex/react";
import { RefreshCw } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  addDays,
  dayOfWeek,
  dayShortName,
  formatDayLong,
  weekStart,
} from "../../convex/domain/dates";
import { useT } from "../i18n/useT";
import { useBase, useSession } from "../lib/session";
import { useWeek } from "../lib/week";
import { useRun, useToast } from "../lib/toast";
import { RecipePicker } from "./RecipePicker";
import { WeekDayPicker } from "./planning/DayPicker";
import { Field, Toggle, useSlotOptions } from "./planning/controls";
import {
  capitalize,
  repeatWarning,
  useWeekMeals,
  type MealChoice,
  type Slot,
} from "./planning/data";
import { useOverview, useRecipes } from "../lib/queries";
import { Badge, Button, cx, Segmented, Sheet, Stepper } from "./ui";
import { plural } from "../lib/format";

interface Props {
  open: boolean;
  onClose: () => void;
  date?: string;
  slot?: Slot;
  recipeId?: Id<"recipes">;
}

/** Sheet to add a dish to the menu. State starts fresh at every opening. */
export function PlanMealSheet(props: Props) {
  if (!props.open) return null;
  return <PlanMealForm {...props} />;
}

function PlanMealForm({
  onClose,
  date: initialDate,
  slot: initialSlot,
  recipeId,
}: Props) {
  const { token } = useSession();
  const { t, lang } = useT();
  const slotOptions = useSlotOptions();
  const base = useBase();
  const { start, today } = useWeek();
  const recipes = useRecipes();
  const overview = useOverview();
  const add = useMutation(api.meals.add);
  const addRecurring = useMutation(api.meals.addRecurring);
  const planLeftover = useMutation(api.meals.planLeftover);
  const toast = useToast();
  const run = useRun();

  const portions = (n: number) =>
    plural(n, t("week.portionOne"), t("week.portionMany"));
  const mealsText = (n: number) =>
    plural(n, t("week.mealOne"), t("week.mealMany"));

  const [choice, setChoice] = useState<MealChoice | null>(
    recipeId ? { recipeId } : null,
  );
  const [picking, setPicking] = useState(!recipeId);
  const [date, setDate] = useState(
    initialDate ??
      (today >= start && today <= addDays(start, 6) ? today : start),
  );
  const [slot, setSlot] = useState<Slot>(initialSlot ?? "soir");
  const [persons, setPersons] = useState<number | null>(null);
  const [tomorrow, setTomorrow] = useState<boolean | null>(null);
  const [tomorrowPersons, setTomorrowPersons] = useState<number | null>(null);
  const [eveningBefore, setEveningBefore] = useState(false);
  // Portions cooked on top, kept in the fridge for later in the week
  const [extraPortions, setExtraPortions] = useState(0);
  // « Répéter » : same dish on chosen weekdays for a few weeks (birchermüesli every morning)
  const [repeat, setRepeat] = useState(false);
  const [repeatDays, setRepeatDays] = useState<number[] | null>(null);
  const [repeatWeeks, setRepeatWeeks] = useState(3);
  const [saving, setSaving] = useState(false);

  // Default "also tomorrow lunch" to on, unless tomorrow's lunch is already planned
  const tomorrowDate = addDays(date, 1);
  const tomorrowWeek = useWeekMeals(
    weekStart(tomorrowDate, base?.settings.shoppingDay ?? 6),
  );
  const tomorrowTaken = tomorrowWeek?.some(
    (m) => m.date === tomorrowDate && m.slot === "midi",
  );
  const alsoTomorrow = tomorrow ?? tomorrowTaken === false;

  const recipe =
    choice && "recipeId" in choice
      ? recipes?.find((r) => r._id === choice.recipeId)
      : undefined;
  // The recipe's usual servings (1 for a personal breakfast), else the household default
  const defaultPersons =
    recipe?.defaultPersons ?? base?.settings.defaultPersons ?? 3;
  const effectivePersons = persons ?? defaultPersons;
  const effectiveTomorrowPersons = tomorrowPersons ?? effectivePersons;
  const isRecipe = !!choice && "recipeId" in choice;
  // Spare portions of a dish already cooked: no shopping, no repeat, no extra portions
  const leftover = choice && "leftoverOf" in choice ? choice : null;
  const cookedPortions =
    effectivePersons +
    (slot === "soir" && alsoTomorrow ? effectiveTomorrowPersons : 0) +
    extraPortions;
  const warning =
    choice && "recipeId" in choice
      ? repeatWarning(overview?.meals, choice.recipeId, date, today, lang)
      : null;

  const chosenDays = repeatDays ?? [dayOfWeek(date)];
  const repeatCount = (() => {
    let n = 0;
    for (let i = 0; i < repeatWeeks * 7; i++)
      if (chosenDays.includes(dayOfWeek(addDays(date, i)))) n++;
    return n;
  })();

  const submit = async () => {
    if (!choice || !token) return;
    setSaving(true);
    if ("leftoverOf" in choice) {
      const id = await run(
        () =>
          planLeftover({
            token,
            sourceId: choice.leftoverOf,
            date,
            slot,
            persons: Math.min(effectivePersons, choice.available),
          }),
        t("week.leftoversAdded"),
      );
      setSaving(false);
      if (id) onClose();
      return;
    }
    if (repeat && !("leftoverOf" in choice)) {
      const res = await run(() =>
        addRecurring({
          token,
          date,
          slot,
          persons: effectivePersons,
          ...("recipeId" in choice
            ? { recipeId: choice.recipeId }
            : { title: choice.title }),
          weekdays: chosenDays,
          weeks: repeatWeeks,
        }),
      );
      setSaving(false);
      if (res) {
        toast(
          res.added > 0
            ? t(
                res.added > 1 ? "week.addedToMenuMany" : "week.addedToMenuOne",
                {
                  meals: mealsText(res.added),
                },
              )
            : t("week.alreadyThere"),
        );
        onClose();
      }
      return;
    }
    const id = await run(
      () =>
        add({
          token,
          date,
          slot,
          persons: effectivePersons,
          ...("recipeId" in choice
            ? { recipeId: choice.recipeId }
            : { title: choice.title }),
          tomorrowLunchPersons:
            slot === "soir" && alsoTomorrow
              ? effectiveTomorrowPersons
              : undefined,
          cookedTheEveningBefore: slot !== "soir" ? eveningBefore : undefined,
          extraPortions:
            isRecipe && extraPortions > 0 ? extraPortions : undefined,
        }),
      t("week.added"),
    );
    setSaving(false);
    if (id) onClose();
  };

  return (
    <>
      <Sheet
        open
        onClose={onClose}
        title={t("week.addToMenu")}
        footer={
          <Button
            size="lg"
            onClick={submit}
            disabled={
              !choice ||
              saving ||
              (repeat && !leftover && repeatCount === 0) ||
              (!!leftover && date > leftover.until)
            }
            className="mb-2"
          >
            {repeat && !leftover
              ? t("week.addMeals", { meals: mealsText(repeatCount) })
              : t("week.addToMenu")}
          </Button>
        }
      >
        <div className="space-y-5">
          <button
            type="button"
            onClick={() => setPicking(true)}
            className="flex w-full items-center gap-3 rounded-[var(--radius-card)] bg-paper p-3 text-left ring-1 ring-line transition active:bg-carrot-soft"
          >
            <span
              className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-carrot-soft text-4xl"
              aria-hidden
            >
              {leftover?.emoji ?? recipe?.emoji ?? (choice ? "🍽️" : "➕")}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-lg font-black">
                {(leftover && t("week.leftoversOf", { name: leftover.name })) ??
                  recipe?.name ??
                  (choice && "title" in choice
                    ? choice.title
                    : choice
                      ? t("week.loadingShort")
                      : t("week.chooseDish"))}
              </span>
              <span className="inline-flex items-center gap-1 text-[15px] font-bold text-carrot-dark">
                <RefreshCw size={15} aria-hidden />
                {choice ? t("week.change") : t("week.recipeOrText")}
              </span>
            </span>
          </button>
          {leftover && (
            <div className="-mt-2">
              <Badge tone="herb">
                {t("week.goodUntil", {
                  portions: plural(
                    leftover.available,
                    t("week.portionAvailableOne"),
                    t("week.portionAvailableMany"),
                  ),
                  date: formatDayLong(leftover.until, lang),
                })}
              </Badge>
              {date > leftover.until && (
                <p className="mt-1 text-[15px] font-bold text-berry">
                  {t("week.tooLate")}
                </p>
              )}
            </div>
          )}
          {warning && !leftover && (
            <div className="-mt-2">
              <Badge tone="sun">{t("week.alreadyWarning", { warning })}</Badge>
            </div>
          )}

          <Field label={t("week.day")}>
            <WeekDayPicker value={date} onChange={setDate} />
            <p className="mt-1 text-[15px] font-semibold text-muted">
              {capitalize(formatDayLong(date, lang))}
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

          <Field
            label={
              slot === "soir"
                ? t("week.portionsEvening")
                : slot === "midi"
                  ? t("week.portionsNoon")
                  : t("week.portionsMorning")
            }
          >
            <Stepper
              label={t("week.portions")}
              value={
                leftover
                  ? Math.min(effectivePersons, leftover.available)
                  : effectivePersons
              }
              max={leftover ? leftover.available : undefined}
              onChange={setPersons}
            />
          </Field>

          {!leftover && (
            <div
              className={cx(
                "rounded-[var(--radius-card)] p-4 transition",
                repeat ? "bg-sun-soft" : "bg-paper ring-1 ring-line",
              )}
            >
              <Toggle
                checked={repeat}
                onChange={setRepeat}
                label={t("week.repeat")}
                hint={t("week.repeatHint")}
              />
              {repeat && (
                <div className="mt-3 space-y-3">
                  <div
                    className="flex flex-wrap gap-1.5"
                    role="group"
                    aria-label={t("week.repeatDays")}
                  >
                    {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                      const on = chosenDays.includes(d);
                      return (
                        <button
                          key={d}
                          type="button"
                          aria-pressed={on}
                          onClick={() =>
                            setRepeatDays(
                              on
                                ? chosenDays.filter((x) => x !== d)
                                : [...chosenDays, d],
                            )
                          }
                          className={cx(
                            "min-h-11 min-w-11 rounded-full px-2 font-extrabold transition",
                            on
                              ? "bg-ink text-white"
                              : "bg-paper text-ink ring-1 ring-line",
                          )}
                        >
                          {dayShortName(d, lang)}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold">
                      {t("week.during", {
                        weeks: plural(
                          repeatWeeks,
                          t("week.weekOne"),
                          t("week.weekMany"),
                        ),
                      })}
                    </span>
                    <Stepper
                      label={t("week.weekCount")}
                      value={repeatWeeks}
                      onChange={setRepeatWeeks}
                      min={1}
                      max={12}
                    />
                  </div>
                  <p className="text-[15px] font-semibold text-muted">
                    {repeatCount > 0
                      ? t("week.repeatFrom", {
                          meals: mealsText(repeatCount),
                          date: formatDayLong(date, lang),
                        })
                      : t("week.pickOneDay")}
                  </p>
                </div>
              )}
            </div>
          )}

          {repeat || leftover ? null : slot === "soir" ? (
            <div
              className={cx(
                "rounded-[var(--radius-card)] p-4 transition",
                alsoTomorrow ? "bg-herb-soft" : "bg-paper ring-1 ring-line",
              )}
            >
              <Toggle
                checked={alsoTomorrow}
                onChange={setTomorrow}
                label={t("week.tomorrowToo")}
                hint={
                  tomorrowTaken && !alsoTomorrow
                    ? t("week.tomorrowTaken")
                    : t("week.tomorrowHint")
                }
              />
              {alsoTomorrow && (
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="font-bold">
                    {t("week.portionsTomorrow")}
                  </span>
                  <Stepper
                    label={t("week.portionsTomorrow")}
                    value={effectiveTomorrowPersons}
                    onChange={setTomorrowPersons}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-[var(--radius-card)] bg-paper p-4 ring-1 ring-line">
              <Toggle
                checked={eveningBefore}
                onChange={setEveningBefore}
                label={t("week.eveningBefore")}
                hint={t("week.eveningBeforeHint")}
              />
            </div>
          )}

          {isRecipe && !repeat && (
            <div className="rounded-[var(--radius-card)] bg-paper p-4 ring-1 ring-line">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold">{t("week.extraForFridge")}</div>
                  <div className="text-[15px] text-muted">
                    {t("week.laterInWeek")}
                  </div>
                </div>
                <Stepper
                  label={t("week.extraForFridgeLabel")}
                  value={extraPortions}
                  onChange={setExtraPortions}
                  min={0}
                />
              </div>
              <p className="mt-3 rounded-2xl bg-carrot-soft px-3 py-2 text-center font-extrabold text-carrot-dark">
                {extraPortions > 0
                  ? t("week.youCookExtra", {
                      portions: portions(cookedPortions),
                      extra: portions(extraPortions),
                    })
                  : t("week.youCook", { portions: portions(cookedPortions) })}
              </p>
            </div>
          )}
        </div>
      </Sheet>
      <RecipePicker
        open={picking}
        onClose={() => setPicking(false)}
        date={date}
        allowFreeText
        showLeftovers
        onPick={(c) => {
          setChoice(c);
          setPersons(null);
          setPicking(false);
        }}
      />
    </>
  );
}
