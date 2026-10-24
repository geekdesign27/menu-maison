import { useMemo, useState } from "react";
import { ChevronRight, Package, Pencil, Plus } from "lucide-react";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { NBSP, type Unit } from "../../../convex/domain/quantities";
import type { Base } from "../../lib/session";
import { searchKey } from "../../lib/text";
import { unitChoiceLabel } from "../../lib/units";
import { Card, IconButton, SearchInput, Sheet } from "../ui";
import { IngredientSheet } from "../shopping/IngredientSheet";

export interface PickedIngredient {
  _id: Id<"ingredients">;
  name: string;
  unit: Unit;
}

const MAX_RESULTS = 60;

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
  const [editing, setEditing] = useState<Doc<"ingredients"> | null>(null);

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
  const q = searchKey(query);
  const matches = useMemo(
    () =>
      base.ingredients
        .filter((i) => searchKey(i.name).includes(q))
        .slice(0, MAX_RESULTS),
    [base.ingredients, q],
  );
  const exact = base.ingredients.some((i) => searchKey(i.name) === q);

  return (
    <>
      <Sheet open={open} onClose={close} title="Choisir un ingrédient">
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
                Créer «{NBSP}
                {query.trim()}
                {NBSP}»
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
                <li key={i._id} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => pick(i)}
                    className="flex min-h-13 min-w-0 flex-1 items-center gap-3 py-2 pr-1 pl-4 text-left active:bg-carrot-soft"
                  >
                    <span aria-hidden className="text-xl">
                      {aisle?.emoji ?? "🛒"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold">{i.name}</span>
                      {i.pantry && (
                        <span className="flex items-center gap-1 text-[13px] font-bold text-herb">
                          <Package size={13} aria-hidden /> Souvent en stock
                        </span>
                      )}
                    </span>
                    <span className="text-[15px] text-muted">
                      {unitChoiceLabel(i.unit)}
                    </span>
                  </button>
                  <IconButton
                    label={`Modifier l'ingrédient${NBSP}: ${i.name}`}
                    onClick={() => setEditing(i)}
                    className="mr-1 text-muted"
                  >
                    <Pencil size={18} />
                  </IconButton>
                </li>
              );
            })}
          </ul>
        </div>
      </Sheet>
      {/* Editing name, aisle, unit, price or "souvent en stock" without leaving the picker */}
      {open && editing && (
        <IngredientSheet
          ingredient={editing}
          aisles={base.aisles}
          onClose={() => setEditing(null)}
        />
      )}
      {/* Quick creation stacks the regular ingredient form over the picker */}
      {open && creating && (
        <IngredientSheet
          aisles={base.aisles}
          initialName={query.trim()}
          onSaved={pick}
          onClose={() => setCreating(false)}
        />
      )}
    </>
  );
}
