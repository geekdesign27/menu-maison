import { useState } from "react";
import { useMutation } from "convex/react";
import { RefreshCw } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { addDays, formatDayLong, weekStart } from "../../convex/domain/dates";
import { useBase, useSession } from "../lib/session";
import { useWeek } from "../lib/week";
import { useRun } from "../lib/toast";
import { RecipePicker } from "./RecipePicker";
import { WeekDayPicker } from "./planning/DayPicker";
import { Field, SLOT_OPTIONS, Toggle } from "./planning/controls";
import {
  capitalize,
  repeatWarning,
  useWeekMeals,
  type MealChoice,
  type Slot,
} from "./planning/data";
import { useOverview, useRecipes } from "../lib/queries";
import { Badge, Button, cx, Segmented, Sheet, Stepper } from "./ui";
import { portions } from "../lib/format";

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
  const base = useBase();
  const { start, today } = useWeek();
  const recipes = useRecipes();
  const overview = useOverview();
  const add = useMutation(api.meals.add);
  const run = useRun();

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
  const defaultPersons = recipe?.defaultPersons ?? base?.settings.defaultPersons ?? 3;
  const effectivePersons = persons ?? defaultPersons;
  const effectiveTomorrowPersons = tomorrowPersons ?? effectivePersons;
  const isRecipe = !!choice && "recipeId" in choice;
  const cookedPortions =
    effectivePersons + (slot === "soir" && alsoTomorrow ? effectiveTomorrowPersons : 0) + extraPortions;
  const warning =
    choice && "recipeId" in choice
      ? repeatWarning(overview?.meals, choice.recipeId, date, today)
      : null;

  const submit = async () => {
    if (!choice || !token) return;
    setSaving(true);
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
          extraPortions: isRecipe && extraPortions > 0 ? extraPortions : undefined,
        }),
      "Ajouté au menu",
    );
    setSaving(false);
    if (id) onClose();
  };

  return (
    <>
      <Sheet
        open
        onClose={onClose}
        title="Ajouter au menu"
        footer={
          <Button
            size="lg"
            onClick={submit}
            disabled={!choice || saving}
            className="mb-2"
          >
            Ajouter au menu
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
              {recipe?.emoji ?? (choice ? "🍽️" : "➕")}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-lg font-black">
                {recipe?.name ??
                  (choice && "title" in choice
                    ? choice.title
                    : choice
                      ? "Chargement…"
                      : "Choisir un plat")}
              </span>
              <span className="inline-flex items-center gap-1 text-[15px] font-bold text-carrot-dark">
                <RefreshCw size={15} aria-hidden />
                {choice ? "Changer" : "Recette ou texte libre"}
              </span>
            </span>
          </button>
          {warning && (
            <div className="-mt-2">
              <Badge tone="sun">⚠️ Déjà {warning}</Badge>
            </div>
          )}

          <Field label="Jour">
            <WeekDayPicker value={date} onChange={setDate} />
            <p className="mt-1 text-[15px] font-semibold text-muted">
              {capitalize(formatDayLong(date))}
            </p>
          </Field>

          <Field label="Repas">
            <Segmented
              label="Repas"
              value={slot}
              options={SLOT_OPTIONS}
              onChange={setSlot}
            />
          </Field>

          <Field label={slot === "soir" ? "Portions ce soir" : slot === "midi" ? "Portions ce midi" : "Portions ce matin"}>
            <Stepper
              label="Portions"
              value={effectivePersons}
              onChange={setPersons}
            />
          </Field>

          {slot === "soir" ? (
            <div
              className={cx(
                "rounded-[var(--radius-card)] p-4 transition",
                alsoTomorrow ? "bg-herb-soft" : "bg-paper ring-1 ring-line",
              )}
            >
              <Toggle
                checked={alsoTomorrow}
                onChange={setTomorrow}
                label="Aussi pour demain midi"
                hint={
                  tomorrowTaken && !alsoTomorrow
                    ? "Un plat est déjà prévu demain midi."
                    : "On cuisine une fois, les quantités s'additionnent."
                }
              />
              {alsoTomorrow && (
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="font-bold">Portions demain midi</span>
                  <Stepper
                    label="Portions demain midi"
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
                label="Préparé la veille au soir"
                hint="Les restes se comptent à partir de la veille."
              />
            </div>
          )}

          {isRecipe && (
            <div className="rounded-[var(--radius-card)] bg-paper p-4 ring-1 ring-line">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold">En plus pour le frigo</div>
                  <div className="text-[15px] text-muted">À manger plus tard dans la semaine</div>
                </div>
                <Stepper label="Portions en plus pour le frigo" value={extraPortions} onChange={setExtraPortions} min={0} />
              </div>
              <p className="mt-3 rounded-2xl bg-carrot-soft px-3 py-2 text-center font-extrabold text-carrot-dark">
                Tu prépares {portions(cookedPortions)}
                {extraPortions > 0 ? `, dont ${portions(extraPortions)} pour le frigo` : ""}
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
        onPick={(c) => {
          setChoice(c);
          setPersons(null);
          setPicking(false);
        }}
      />
    </>
  );
}
