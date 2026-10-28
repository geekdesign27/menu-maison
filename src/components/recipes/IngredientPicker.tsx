import { useMemo, useState } from "react";
import { ChevronRight, Package, Pencil, Plus } from "lucide-react";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import type { Unit } from "../../../convex/domain/quantities";
import { useT } from "../../i18n/useT";
import { searchKey } from "../../lib/text";
import { unitChoiceLabel } from "../../lib/units";
import { Card, IconButton, SearchInput, Sheet } from "../ui";
import { IngredientSheet } from "../shopping/IngredientSheet";
import { ConfirmSheet } from "../shopping/ConfirmSheet";
import { OffResults } from "../off/OffSearch";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  findExisting,
  shortName,
  suggestAisleName,
  type OffHit,
} from "../../../convex/domain/openFoodFacts";
import { useSession, type Base } from "../../lib/session";
import { useRun } from "../../lib/toast";

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
  // Open Food Facts product to create as a new ingredient, or to complete an existing one with
  const [fromOff, setFromOff] = useState<OffHit | null>(null);
  const [completing, setCompleting] = useState<{
    ingredient: Doc<"ingredients">;
    hit: OffHit;
  } | null>(null);
  const { token } = useSession();
  const run = useRun();
  const { t, lang } = useT();
  const importProduct = useAction(api.openFoodFacts.importProduct);

  const close = () => {
    setQuery("");
    setCreating(false);
    setFromOff(null);
    setCompleting(null);
    onClose();
  };

  /** Same barcode: reuse it; same name: offer to complete it; else create it. */
  const chooseOff = (hit: OffHit) => {
    const found = findExisting(
      base.ingredients,
      hit.code,
      shortName(hit.productName, hit.brands, query),
    );
    if (found?.by === "code") pick(found.ingredient);
    else if (found) setCompleting({ ingredient: found.ingredient, hit });
    else setFromOff(hit);
  };
  const aisleFor = (hit: OffHit) => {
    const name = suggestAisleName(hit.categories);
    return name
      ? base.aisles.find((a) => searchKey(a.name) === searchKey(name))?._id
      : undefined;
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
      <Sheet open={open} onClose={close} title={t("recipes.pickIngredient")}>
        <div className="space-y-3">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder={t("recipes.searchIngredient")}
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
                {t("recipes.createNamed", { name: query.trim() })}
              </span>
              <ChevronRight className="text-muted" />
            </Card>
          )}
          {matches.length === 0 && !q && (
            <p className="py-6 text-center text-muted">
              {t("recipes.noIngredients")}
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
                          <Package size={13} aria-hidden />{" "}
                          {t("recipes.oftenInStock")}
                        </span>
                      )}
                    </span>
                    <span className="text-[15px] text-muted">
                      {unitChoiceLabel(i.unit, lang)}
                    </span>
                  </button>
                  <IconButton
                    label={t("recipes.editIngredientNamed", { name: i.name })}
                    onClick={() => setEditing(i)}
                    className="mr-1 text-muted"
                  >
                    <Pencil size={18} />
                  </IconButton>
                </li>
              );
            })}
          </ul>
          <OffResults query={query} onChoose={chooseOff} />
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
      {open && fromOff && (
        <IngredientSheet
          key={fromOff.code}
          aisles={base.aisles}
          initialName={shortName(fromOff.productName, fromOff.brands, query)}
          initialAisleId={aisleFor(fromOff)}
          initialUnit={fromOff.liquid ? "ml" : "g"}
          initialOff={fromOff}
          onSaved={pick}
          onClose={() => setFromOff(null)}
        />
      )}
      <ConfirmSheet
        open={open && completing !== null}
        onClose={() => setCompleting(null)}
        title={t("recipes.completeTitle", {
          name: completing?.ingredient.name ?? "",
        })}
        text={t("recipes.completeText")}
        confirmLabel={t("recipes.completeConfirm")}
        onConfirm={async () => {
          if (!completing) return;
          const { ingredient, hit } = completing;
          const done = await run(
            () => importProduct({ token, id: ingredient._id, code: hit.code }),
            t("recipes.offImported"),
          );
          if (done) pick(ingredient);
        }}
      />
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
