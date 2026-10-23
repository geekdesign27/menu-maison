import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { CalendarPlus, Info, Trash } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { formatDayLong, weekDays } from "../../convex/domain/dates";
import { useSession } from "../lib/session";
import { useWeek } from "../lib/week";
import { useRun } from "../lib/toast";
import { plural } from "../lib/format";
import { DayGrid } from "../components/planning/DayPicker";
import { Field, SLOT_OPTIONS } from "../components/planning/controls";
import { capitalize, type Slot } from "../components/planning/data";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Loading,
  Page,
  Segmented,
  Sheet,
  Stepper,
} from "../components/ui";

type FridgeRow = FunctionReturnType<typeof api.meals.fridge>[number];

const KEEP_TONE = {
  bon: "herb",
  "aujourd'hui": "sun",
  périmé: "berry",
} as const;

function keepLabel(row: FridgeRow) {
  const { state, until } = row.keep;
  if (state === "aujourd'hui") return "À manger aujourd'hui";
  if (state === "périmé") return `Périmé depuis le ${formatDayLong(until)}`;
  return `Bon jusqu'au ${formatDayLong(until)}`;
}

export function FridgePage() {
  const { token } = useSession();
  const { today } = useWeek();
  const rows = useQuery(api.meals.fridge, token ? { token, today } : "skip");
  const [planning, setPlanning] = useState<FridgeRow | null>(null);

  return (
    <Page title="Frigo" subtitle="Les restes à manger">
      {rows === undefined ? (
        <Loading label="Ouverture du frigo" />
      ) : rows.length === 0 ? (
        <Card className="mt-2">
          <EmptyState
            emoji="🧊"
            title="Le frigo est vide"
            text="Pas de restes en attente. Tout a été mangé, bravo."
          />
        </Card>
      ) : (
        <ul className="mt-2 space-y-3">
          {rows.map((row) => (
            <li key={row._id}>
              <FridgeCard row={row} onPlan={() => setPlanning(row)} />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 flex gap-3 rounded-[var(--radius-card)] bg-paper/70 p-4 text-[15px] text-muted ring-1 ring-line">
        <Info size={20} className="mt-0.5 shrink-0 text-carrot" aria-hidden />
        <p>
          Comment des restes arrivent ici{" "}? Sur la semaine, touche un plat
          puis choisis «{" "}Pas mangé{" "}» ou «{" "}Il en reste{" "}». La
          durée de conservation vient de la recette.
        </p>
      </div>

      <PlanLeftoverSheet row={planning} onClose={() => setPlanning(null)} />
    </Page>
  );
}

function FridgeCard({ row, onPlan }: { row: FridgeRow; onPlan: () => void }) {
  const { token } = useSession();
  const run = useRun();
  const discard = useMutation(api.meals.discardLeftover);
  const name = row.recipe?.name ?? row.title ?? "Plat";
  const expired = row.keep.state === "périmé";
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <span
          className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-cream text-4xl"
          aria-hidden
        >
          {row.recipe?.emoji ?? "🍽️"}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-lg font-black">{name}</div>
          <div className="text-[15px] font-semibold text-muted">
            {plural(row.leftoverPortions, "portion", "portions")} · cuisiné le{" "}
            {formatDayLong(row.cookedOn)}
          </div>
          <div className="mt-1.5">
            <Badge tone={KEEP_TONE[row.keep.state]}>{keepLabel(row)}</Badge>
          </div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          variant={expired ? "secondary" : "herb"}
          onClick={onPlan}
          disabled={expired}
        >
          <CalendarPlus size={20} />
          Planifier
        </Button>
        <Button
          variant={expired ? "primary" : "secondary"}
          onClick={() =>
            run(() => discard({ token, id: row._id }), "Retiré du frigo")
          }
        >
          <Trash size={20} />
          Jeté
        </Button>
      </div>
    </Card>
  );
}

function PlanLeftoverSheet({
  row,
  onClose,
}: {
  row: FridgeRow | null;
  onClose: () => void;
}) {
  return (
    <Sheet open={!!row} onClose={onClose} title="Planifier les restes">
      {row && <PlanLeftoverForm key={row._id} row={row} onClose={onClose} />}
    </Sheet>
  );
}

function PlanLeftoverForm({
  row,
  onClose,
}: {
  row: FridgeRow;
  onClose: () => void;
}) {
  const { token } = useSession();
  const { today } = useWeek();
  const run = useRun();
  const planLeftover = useMutation(api.meals.planLeftover);
  const [date, setDate] = useState(today);
  const [slot, setSlot] = useState<Slot>("midi");
  const [persons, setPersons] = useState(row.leftoverPortions);
  const [saving, setSaving] = useState(false);
  const days = weekDays(today);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="text-4xl" aria-hidden>
          {row.recipe?.emoji ?? "🍽️"}
        </span>
        <div className="min-w-0">
          <div className="truncate text-lg font-black">
            {row.recipe?.name ?? row.title}
          </div>
          <div className="text-[15px] text-muted">{keepLabel(row)}</div>
        </div>
      </div>
      <Field label="Jour">
        <DayGrid days={days} value={date} onChange={setDate} />
        <p className="mt-2 text-[15px] font-semibold text-muted">
          {capitalize(formatDayLong(date))}
          {date > row.keep.until && (
            <span className="text-berry"> · après la date limite</span>
          )}
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
      <div className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] bg-paper p-4 ring-1 ring-line">
        <span className="font-extrabold">Portions</span>
        <Stepper
          label="Portions"
          value={persons}
          max={row.leftoverPortions}
          onChange={setPersons}
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
              planLeftover({ token, sourceId: row._id, date, slot, persons }),
            "Restes ajoutés au menu",
          );
          setSaving(false);
          if (id) onClose();
        }}
      >
        Ajouter au menu
      </Button>
    </div>
  );
}
