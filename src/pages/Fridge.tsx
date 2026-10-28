import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Link } from "react-router-dom";
import { CalendarPlus, Check, ChevronRight, Info, Trash } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { formatDayLong, formatDayShort } from "../../convex/domain/dates";
import { useSession } from "../lib/session";
import { useWeek } from "../lib/week";
import { useRun } from "../lib/toast";
import { plural } from "../lib/format";
import { PlanLeftoverSheet } from "../components/planning/PlanLeftoverSheet";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Loading,
  Page,
  SectionTitle,
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
  const stock = useQuery(api.homeStock.list, token ? { token } : "skip");
  const [planning, setPlanning] = useState<FridgeRow | null>(null);
  const hasStock = !!stock && stock.items.length > 0;

  return (
    <Page title="Frigo" subtitle="Les restes à manger">
      {hasStock && <HomeStock stock={stock} />}
      {hasStock && <SectionTitle>Restes</SectionTitle>}
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

      <PlanLeftoverSheet source={planning} onClose={() => setPlanning(null)} />
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

type Stock = FunctionReturnType<typeof api.homeStock.list>;

/** Ingredients bought for a dish that was not cooked, and recipes to use them up. */
function HomeStock({ stock }: { stock: Stock }) {
  const { token } = useSession();
  const run = useRun();
  const remove = useMutation(api.homeStock.remove);
  return (
    <>
      <SectionTitle>À utiliser</SectionTitle>
      <Card className="overflow-hidden">
        <ul className="divide-y divide-line">
          {stock.items.map((i) => (
            <li key={i._id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <div className="font-extrabold">
                  {i.name}{" "}
                  <span className="font-semibold text-muted">
                    · {i.display}
                  </span>
                </div>
                <div className="text-[15px] text-muted">
                  Depuis le {formatDayShort(i.since)}
                  {i.from ? `, plat « ${i.from} » pas cuisiné` : ""}
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  run(() => remove({ token, id: i._id }), `${i.name} retiré`)
                }
              >
                <Check size={18} /> Utilisé ou jeté
              </Button>
            </li>
          ))}
        </ul>
      </Card>
      {stock.ideas.length > 0 && (
        <>
          <p className="mt-4 mb-2 text-[15px] font-bold text-muted">
            Des idées pour les utiliser
          </p>
          <Card className="overflow-hidden">
            <ul className="divide-y divide-line">
              {stock.ideas.map((r) => (
                <li key={r._id}>
                  <Link
                    to={`/recette/${r._id}`}
                    className="flex min-h-14 items-center gap-3 px-3 py-2"
                  >
                    <span className="text-3xl" aria-hidden>
                      {r.emoji}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-extrabold">
                        {r.name}
                      </span>
                      <span className="block truncate text-[15px] text-muted">
                        avec {r.uses.join(", ").toLowerCase()}
                      </span>
                    </span>
                    <ChevronRight size={20} className="shrink-0 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </>
  );
}
