import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "convex/react";
import {
  CalendarDays,
  Check,
  ChevronRight,
  Refrigerator,
  Trash,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { formatDayLong } from "../../../convex/domain/dates";
import { useSession } from "../../lib/session";
import { useRun } from "../../lib/toast";
import { plural } from "../../lib/format";
import { Button, cx, Segmented, Sheet, Stepper } from "../ui";
import { WeekDayPicker } from "./DayPicker";
import { Field, SLOT_OPTIONS } from "./controls";
import { capitalize, SLOT_LABEL, type Slot, type WeekMeal } from "./data";

type StatusChoice = "prévu" | "mangé" | "pas mangé" | "reste";

function currentChoice(meal: WeekMeal): StatusChoice {
  if (meal.status === "mangé" && meal.leftoverPortions > 0) return "reste";
  return meal.status;
}

/** Actions on one planned dish: persons, move, status, delete. */
export function MealSheet({
  meal,
  onClose,
}: {
  meal: WeekMeal | null;
  onClose: () => void;
}) {
  return (
    <Sheet
      open={!!meal}
      onClose={onClose}
      title={meal ? (meal.recipe?.name ?? meal.title ?? "Plat") : ""}
    >
      {meal && <MealActions key={meal._id} meal={meal} onClose={onClose} />}
    </Sheet>
  );
}

function MealActions({
  meal,
  onClose,
}: {
  meal: WeekMeal;
  onClose: () => void;
}) {
  const { token } = useSession();
  const run = useRun();
  const update = useMutation(api.meals.update);
  const setStatus = useMutation(api.meals.setStatus);
  const remove = useMutation(api.meals.remove);

  const [persons, setPersons] = useState(meal.persons);
  const [askPortions, setAskPortions] = useState(false);
  const [portions, setPortions] = useState(
    meal.leftoverPortions > 0 ? meal.leftoverPortions : 1,
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const choice = currentChoice(meal);

  const changePersons = (n: number) => {
    setPersons(n);
    void run(() => update({ token, id: meal._id, persons: n }));
  };

  const move = (patch: { date?: string; slot?: Slot }) =>
    run(() => update({ token, id: meal._id, ...patch }), "Plat déplacé");

  const status = (
    next: "prévu" | "mangé" | "pas mangé",
    leftoverPortions?: number,
    message?: string,
  ) =>
    run(
      () => setStatus({ token, id: meal._id, status: next, leftoverPortions }),
      message,
    );

  const STATUSES: {
    value: StatusChoice;
    label: string;
    icon: LucideIcon;
    tone: string;
    onClick: () => void;
  }[] = [
    {
      value: "prévu",
      label: "Prévu",
      icon: CalendarDays,
      tone: "bg-carrot text-white",
      onClick: () => {
        setAskPortions(false);
        void status("prévu");
      },
    },
    {
      value: "mangé",
      label: "Mangé",
      icon: Check,
      tone: "bg-herb text-white",
      onClick: () => {
        setAskPortions(false);
        void status("mangé", 0, "Bon appétit !");
      },
    },
    {
      value: "pas mangé",
      label: "Pas mangé",
      icon: Utensils,
      tone: "bg-berry text-white",
      onClick: () => {
        setAskPortions(false);
        void status("pas mangé", undefined, "Le plat est au frigo");
      },
    },
    {
      value: "reste",
      label: "Il en reste",
      icon: Refrigerator,
      tone: "bg-sun text-ink",
      onClick: () => setAskPortions(true),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span
          className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-carrot-soft text-4xl"
          aria-hidden
        >
          {meal.recipe?.emoji ?? "🍽️"}
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-extrabold">
            {capitalize(formatDayLong(meal.date))},{" "}
            {SLOT_LABEL[meal.slot].toLowerCase()}
          </div>
          {meal.cookedOn !== meal.date && (
            <div className="text-[15px] text-muted">
              {meal.fromLeftoverOf ? "Restes cuisinés le " : "Préparé le "}
              {formatDayLong(meal.cookedOn)}
            </div>
          )}
          {meal.recipe && (
            <Link
              to={`/recette/${meal.recipe._id}`}
              className="mt-0.5 inline-flex min-h-11 items-center gap-0.5 font-extrabold text-carrot-dark"
            >
              Voir la recette <ChevronRight size={18} />
            </Link>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] bg-paper p-4 ring-1 ring-line">
        <span className="font-extrabold">Personnes</span>
        <Stepper label="Personnes" value={persons} onChange={changePersons} />
      </div>

      <Field label="Statut">
        <div className="grid grid-cols-2 gap-2">
          {STATUSES.map((s) => {
            const active =
              choice === s.value || (s.value === "reste" && askPortions);
            const Icon = s.icon;
            return (
              <button
                key={s.value}
                type="button"
                aria-pressed={active}
                onClick={s.onClick}
                className={cx(
                  "flex min-h-14 items-center justify-center gap-2 rounded-2xl px-3 font-extrabold transition active:scale-[0.98]",
                  active ? s.tone : "bg-paper ring-1 ring-line",
                )}
              >
                <Icon size={20} aria-hidden />
                {s.label}
              </button>
            );
          })}
        </div>
        {askPortions && (
          <div className="mt-3 rounded-[var(--radius-card)] bg-sun-soft p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="font-extrabold">Portions restantes</span>
              <Stepper
                label="Portions restantes"
                value={portions}
                min={1}
                max={60}
                onChange={setPortions}
              />
            </div>
            <Button
              variant="herb"
              className="mt-3 w-full"
              onClick={async () => {
                await status(
                  "mangé",
                  portions,
                  `${plural(portions, "portion", "portions")} au frigo`,
                );
                setAskPortions(false);
              }}
            >
              <Refrigerator size={20} />
              Mettre au frigo
            </Button>
          </div>
        )}
        {!askPortions && meal.leftoverPortions > 0 && (
          <p className="mt-2 text-[15px] font-semibold text-muted">
            {plural(meal.leftoverPortions, "portion", "portions")} au frigo.
          </p>
        )}
      </Field>

      <Field label="Déplacer">
        <WeekDayPicker value={meal.date} onChange={(date) => move({ date })} />
        <div className="mt-2">
          <Segmented
            label="Repas"
            value={meal.slot}
            options={SLOT_OPTIONS}
            onChange={(slot) => move({ slot })}
          />
        </div>
      </Field>

      {confirmDelete ? (
        <div className="rounded-[var(--radius-card)] bg-berry-soft p-4">
          <p className="font-extrabold text-berry">Retirer ce plat du menu ?</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              Annuler
            </Button>
            <button
              type="button"
              className="min-h-12 rounded-2xl bg-berry px-4 font-extrabold text-white active:brightness-95"
              onClick={async () => {
                onClose();
                await run(() => remove({ token, id: meal._id }), "Plat retiré");
              }}
            >
              Retirer
            </button>
          </div>
        </div>
      ) : (
        <Button
          variant="danger"
          className="w-full"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash size={20} />
          Retirer du menu
        </Button>
      )}
    </div>
  );
}
