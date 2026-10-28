import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import {
  Ban,
  CalendarDays,
  CalendarPlus,
  Check,
  ChevronRight,
  Refrigerator,
  Trash,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { formatDayLong } from "../../../convex/domain/dates";
import { formatQty } from "../../../convex/domain/quantities";
import { useSession } from "../../lib/session";
import { useRun } from "../../lib/toast";
import { plural } from "../../lib/format";
import { Button, cx, Segmented, Sheet, Stepper } from "../ui";
import { WeekDayPicker } from "./DayPicker";
import { Field, SLOT_OPTIONS } from "./controls";
import { capitalize, SLOT_LABEL, type Slot, type WeekMeal } from "./data";
import { PlanLeftoverSheet } from "./PlanLeftoverSheet";

type StatusChoice = "prévu" | "mangé" | "pas mangé" | "pas cuisiné" | "reste";

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
  const [extra, setExtra] = useState(meal.extraPortions ?? 0);
  const [planningLeftovers, setPlanningLeftovers] = useState(false);
  const changeExtra = (n: number) => {
    setExtra(n);
    void run(() => update({ token, id: meal._id, extraPortions: n }));
  };
  const [askPortions, setAskPortions] = useState(false);
  const [portions, setPortions] = useState(
    meal.leftoverPortions > 0 ? meal.leftoverPortions : 1,
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [askNotCooked, setAskNotCooked] = useState(false);
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
        setAskNotCooked(false);
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
        setAskNotCooked(false);
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
        setAskNotCooked(false);
        void status("pas mangé", undefined, "Le plat est au frigo");
      },
    },
    {
      value: "reste",
      label: "Il en reste",
      icon: Refrigerator,
      tone: "bg-sun text-ink",
      onClick: () => {
        setAskNotCooked(false);
        setAskPortions(true);
      },
    },
    // Leftovers are never cooked: only a dish of its own can be « pas cuisiné »
    ...(meal.fromLeftoverOf
      ? []
      : [
          {
            value: "pas cuisiné" as const,
            label: "Pas cuisiné",
            icon: Ban,
            tone: "bg-muted text-white",
            onClick: () => {
              setAskPortions(false);
              setAskNotCooked(true);
            },
          },
        ]),
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
        <span className="font-extrabold">Portions</span>
        <Stepper label="Portions" value={persons} onChange={changePersons} />
      </div>
      {meal.leftoverPortions > 0 && !meal.fromLeftoverOf && (
        <Button
          variant="herb"
          size="lg"
          className="mt-2"
          onClick={() => setPlanningLeftovers(true)}
        >
          <CalendarPlus size={20} />
          Planifier les restes (
          {plural(meal.leftoverPortions, "portion", "portions")})
        </Button>
      )}
      {meal.recipe && !meal.fromLeftoverOf && meal.status === "prévu" && (
        <div className="mt-2 flex items-center justify-between gap-3 rounded-[var(--radius-card)] bg-paper p-4 ring-1 ring-line">
          <div>
            <div className="font-extrabold">En plus pour le frigo</div>
            <div className="text-[15px] text-muted">
              Achetées avec, au frigo une fois cuisinées
            </div>
          </div>
          <Stepper
            label="Portions en plus pour le frigo"
            value={extra}
            onChange={changeExtra}
            min={0}
          />
        </div>
      )}

      <Field label="Statut">
        <div className="grid grid-cols-2 gap-2">
          {STATUSES.map((s, i) => {
            const active =
              choice === s.value ||
              (s.value === "reste" && askPortions) ||
              (s.value === "pas cuisiné" && askNotCooked);
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
                  // An odd last choice takes the whole row
                  i === STATUSES.length - 1 &&
                    STATUSES.length % 2 === 1 &&
                    "col-span-2",
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
        {askNotCooked && meal.status !== "pas cuisiné" && (
          <NotCookedPanel meal={meal} onDone={() => setAskNotCooked(false)} />
        )}
        {meal.status === "pas cuisiné" && (
          <p className="mt-2 text-[15px] font-semibold text-muted">
            Pas cuisiné : retiré de la liste de courses. Les ingrédients gardés
            sont dans le Frigo, «{"\u00a0"}À utiliser{"\u00a0"}». «{"\u00a0"}
            Prévu{"\u00a0"}» le remet au menu.
          </p>
        )}
        {!askPortions &&
          meal.leftoverPortions > 0 &&
          meal.status !== "prévu" && (
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
      <PlanLeftoverSheet
        source={planningLeftovers ? meal : null}
        onClose={() => setPlanningLeftovers(false)}
      />
    </div>
  );
}

/**
 * « Pas cuisiné »: the dish leaves the shopping list; the ingredients already
 * bought (checked on the list) are proposed as staying at home.
 */
function NotCookedPanel({
  meal,
  onDone,
}: {
  meal: WeekMeal;
  onDone: () => void;
}) {
  const { token } = useSession();
  const run = useRun();
  const preview = useQuery(api.meals.notCookedPreview, { token, id: meal._id });
  const markNotCooked = useMutation(api.meals.markNotCooked);
  const [kept, setKept] = useState<Set<string> | null>(null);
  const [busy, setBusy] = useState(false);

  // Bought ones are kept by default, once the preview is there
  useEffect(() => {
    if (preview && kept === null)
      setKept(
        new Set(
          preview.items
            .filter((i) => i.bought)
            .map((i) => `${i.ingredientId}:${i.unit}`),
        ),
      );
  }, [preview, kept]);

  if (!preview || !kept)
    return <p className="mt-3 text-[15px] text-muted">Chargement…</p>;
  const toggle = (key: string) =>
    setKept((k) => {
      const next = new Set(k);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const confirm = async () => {
    setBusy(true);
    const keep = preview.items
      .filter((i) => kept.has(`${i.ingredientId}:${i.unit}`))
      .map((i) => ({ ingredientId: i.ingredientId, qty: i.qty, unit: i.unit }));
    const done = await run(
      () => markNotCooked({ token, id: meal._id, keep }),
      keep.length
        ? `Retiré de la liste. ${plural(keep.length, "ingrédient", "ingrédients")} à utiliser dans le Frigo.`
        : "Retiré de la liste de courses.",
    );
    setBusy(false);
    if (done !== undefined) onDone();
  };

  return (
    <div className="mt-3 grid gap-3 rounded-[var(--radius-card)] bg-line/40 p-4">
      <p className="text-[15px]">
        Le plat sort de la liste de courses : ce qui n'est pas encore acheté
        disparaît. Pour le cuisiner un autre jour, change plutôt le jour dans «
        {"\u00a0"}Déplacer{"\u00a0"}», plus bas.
      </p>
      {preview.items.length > 0 && (
        <div>
          <p className="mb-1 font-extrabold">Déjà à la maison</p>
          <p className="mb-2 text-[15px] text-muted">
            Coche ce qui a été acheté : ça ira dans le Frigo, «{"\u00a0"}À
            utiliser{"\u00a0"}».
          </p>
          <ul className="grid gap-1.5">
            {preview.items.map((i) => {
              const key = `${i.ingredientId}:${i.unit}`;
              const on = kept.has(key);
              return (
                <li key={key}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => toggle(key)}
                    className={cx(
                      "flex min-h-12 w-full items-center gap-3 rounded-2xl px-3 text-left ring-1 transition",
                      on ? "bg-herb-soft ring-herb" : "bg-paper ring-line",
                    )}
                  >
                    <span
                      className={cx(
                        "flex size-6 shrink-0 items-center justify-center rounded-md ring-2",
                        on ? "bg-herb text-white ring-herb" : "ring-line",
                      )}
                    >
                      {on && <Check size={16} strokeWidth={3} />}
                    </span>
                    <span className="min-w-0 flex-1 font-bold">{i.name}</span>
                    <span className="shrink-0 text-[15px] text-muted">
                      {formatQty(i.qty, i.unit)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {preview.together.length > 0 && (
        <p className="text-[15px] font-bold">
          Cuisiné en même temps,{" "}
          {preview.together.length > 1
            ? "ces repas sont aussi annulés"
            : "ce repas est aussi annulé"}
          {"\u00a0"}:{" "}
          {preview.together
            .map(
              (m) =>
                `${formatDayLong(m.date)}, ${SLOT_LABEL[m.slot].toLowerCase()}`,
            )
            .join(", ")}
          .
        </p>
      )}
      {preview.leftoversPlanned > 0 && (
        <p className="text-[15px] font-bold text-berry">
          {preview.leftoversPlanned > 1
            ? `${preview.leftoversPlanned} repas de restes prévus avec ce plat seront retirés du menu.`
            : "Le repas de restes prévu avec ce plat sera retiré du menu."}
        </p>
      )}
      <Button size="lg" onClick={confirm} disabled={busy}>
        <Ban size={20} /> {busy ? "Un instant…" : "Pas cuisiné, on l'enlève"}
      </Button>
    </div>
  );
}
