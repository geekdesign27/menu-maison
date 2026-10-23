import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { ChevronRight, Plus } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { Unit } from "../../../convex/domain/quantities";
import { useSession, type Base } from "../../lib/session";
import { useRun } from "../../lib/toast";
import { Button, Card, SearchInput, Sheet, TextInput } from "../ui";
import { NB, normalize, UNIT_LABELS, UNITS } from "./data";

export interface PickedIngredient {
  _id: Id<"ingredients">;
  name: string;
  unit: Unit;
}

const MAX_RESULTS = 60;

export const selectClass =
  "min-h-12 w-full rounded-2xl bg-paper px-3 font-bold ring-1 ring-line outline-none focus:ring-2 focus:ring-carrot";

/** Sheet to pick an ingredient, or create it on the spot when it is missing. */
export function IngredientPicker({
  open,
  onClose,
  onPick,
  base,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (ingredient: PickedIngredient) => void;
  base: Base;
}) {
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);

  const close = () => {
    setQuery("");
    setCreating(false);
    onClose();
  };
  const pick = (ingredient: PickedIngredient) => {
    onPick(ingredient);
    close();
  };

  const aisleById = useMemo(
    () => new Map(base.aisles.map((a) => [a._id, a])),
    [base.aisles],
  );
  const q = normalize(query);
  const matches = useMemo(
    () =>
      base.ingredients
        .filter((i) => normalize(i.name).includes(q))
        .slice(0, MAX_RESULTS),
    [base.ingredients, q],
  );
  const exact = base.ingredients.some((i) => normalize(i.name) === q);

  return (
    <Sheet
      open={open}
      onClose={close}
      title={creating ? "Nouvel ingrédient" : "Choisir un ingrédient"}
    >
      {creating ? (
        <CreateIngredient
          base={base}
          initialName={query.trim()}
          onCancel={() => setCreating(false)}
          onCreated={pick}
        />
      ) : (
        <div className="space-y-3">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Chercher un ingrédient"
          />
          {q && !exact && (
            <Card
              onClick={() => setCreating(true)}
              className="flex min-h-14 items-center gap-3 p-3 ring-2 ring-carrot/40"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-carrot text-white">
                <Plus size={22} strokeWidth={3} />
              </span>
              <span className="min-w-0 flex-1 font-extrabold">
                Créer «{NB}
                {query.trim()}
                {NB}»
              </span>
              <ChevronRight className="text-muted" />
            </Card>
          )}
          {matches.length === 0 && !q && (
            <p className="py-6 text-center text-muted">
              Aucun ingrédient pour l'instant.
            </p>
          )}
          <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-paper">
            {matches.map((i) => {
              const aisle = aisleById.get(i.aisleId);
              return (
                <li key={i._id}>
                  <button
                    type="button"
                    onClick={() => pick(i)}
                    className="flex min-h-13 w-full items-center gap-3 px-4 py-2 text-left active:bg-carrot-soft"
                  >
                    <span aria-hidden className="text-xl">
                      {aisle?.emoji ?? "🛒"}
                    </span>
                    <span className="min-w-0 flex-1 font-bold">{i.name}</span>
                    <span className="text-[15px] text-muted">
                      {UNIT_LABELS[i.unit]}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Sheet>
  );
}

function CreateIngredient({
  base,
  initialName,
  onCancel,
  onCreated,
}: {
  base: Base;
  initialName: string;
  onCancel: () => void;
  onCreated: (ingredient: PickedIngredient) => void;
}) {
  const { token } = useSession();
  const run = useRun();
  const upsert = useMutation(api.catalog.upsertIngredient);
  const [name, setName] = useState(initialName);
  const [aisleId, setAisleId] = useState(base.aisles[0]?._id ?? "");
  const [unit, setUnit] = useState<Unit>("g");
  const [saving, setSaving] = useState(false);

  const create = async () => {
    if (!aisleId) return;
    setSaving(true);
    const id = await run(
      () =>
        upsert({
          token,
          name,
          aisleId: aisleId as Id<"aisles">,
          unit,
        }),
      "Ingrédient ajouté",
    );
    setSaving(false);
    if (id) onCreated({ _id: id, name: name.trim(), unit });
  };

  return (
    <div className="space-y-4">
      <TextInput
        label="Nom"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ex. Patate douce"
      />
      <label className="block">
        <span className="mb-1 block text-[15px] font-bold">Rayon</span>
        <select
          className={selectClass}
          value={aisleId}
          onChange={(e) => setAisleId(e.target.value as Id<"aisles">)}
        >
          {base.aisles.map((a) => (
            <option key={a._id} value={a._id}>
              {a.emoji} {a.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-[15px] font-bold">
          Unité sur la liste de courses
        </span>
        <select
          className={selectClass}
          value={unit}
          onChange={(e) => setUnit(e.target.value as Unit)}
        >
          {UNITS.map((u) => (
            <option key={u} value={u}>
              {UNIT_LABELS[u]}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3 pt-1">
        <Button variant="secondary" onClick={onCancel}>
          Retour
        </Button>
        <Button onClick={create} disabled={saving || !name.trim()}>
          Créer
        </Button>
      </div>
    </div>
  );
}
