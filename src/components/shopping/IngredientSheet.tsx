import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import type { Unit } from "../../../convex/domain/quantities";
import { formatNumber } from "../../../convex/domain/quantities";
import { useSession } from "../../lib/session";
import { useRun, useToast } from "../../lib/toast";
import { Button, Select, Sheet, TextInput } from "../ui";
import { parseAmount, unitChoiceLabel, unitName, UNITS } from "../../lib/units";
import { ChainsPicker, type Chain } from "./chains";

export interface SavedIngredient {
  _id: Id<"ingredients">;
  name: string;
  unit: Unit;
}

/**
 * Form sheet to create or edit an ingredient and its estimated price.
 * The aisle has no default: it must be chosen explicitly for a new ingredient.
 */
export function IngredientSheet({
  ingredient,
  aisles,
  initialName = "",
  onSaved,
  onClose,
}: {
  ingredient?: Doc<"ingredients">;
  aisles: Doc<"aisles">[];
  initialName?: string;
  onSaved?: (saved: SavedIngredient) => void;
  onClose: () => void;
}) {
  const { token } = useSession();
  const run = useRun();
  const toast = useToast();
  const upsert = useMutation(api.catalog.upsertIngredient);
  const [name, setName] = useState(ingredient?.name ?? initialName);
  const [aisleId, setAisleId] = useState<Id<"aisles"> | "">(
    ingredient?.aisleId ?? "",
  );
  const [unit, setUnit] = useState<Unit>(ingredient?.unit ?? "g");
  const [priceText, setPriceText] = useState(
    ingredient?.priceChf !== undefined ? ingredient.priceChf.toFixed(2) : "",
  );
  const [qtyText, setQtyText] = useState(
    ingredient?.priceQty !== undefined
      ? formatNumber(ingredient.priceQty)
      : "1",
  );
  const [pantry, setPantry] = useState(ingredient?.pantry ?? false);
  const [onlyChains, setOnlyChains] = useState<Chain[]>(ingredient?.onlyChains ?? []);
  const [packText, setPackText] = useState(
    ingredient?.packSize !== undefined ? formatNumber(ingredient.packSize) : "",
  );
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!aisleId) {
      toast("Choisis le rayon de l'ingrédient.", "error");
      return;
    }
    const priceChf = parseAmount(priceText);
    const priceQty = parseAmount(qtyText);
    if (Number.isNaN(priceChf) || Number.isNaN(priceQty)) {
      toast(
        "Le prix et la quantité doivent être des nombres positifs.",
        "error",
      );
      return;
    }
    const packSize = parseAmount(packText);
    if (Number.isNaN(packSize)) {
      toast("Le contenu d'un paquet doit être un nombre positif.", "error");
      return;
    }
    if (priceChf !== undefined && priceQty === undefined) {
      toast("Indique pour quelle quantité vaut ce prix.", "error");
      return;
    }
    setBusy(true);
    const id = await run(
      () =>
        upsert({
          token,
          id: ingredient?._id,
          name,
          aisleId,
          unit,
          priceChf,
          priceQty: priceChf !== undefined ? priceQty : undefined,
          pantry,
          packSize,
          onlyChains,
        }),
      ingredient ? "Ingrédient enregistré." : "Ingrédient ajouté.",
    );
    setBusy(false);
    if (id) {
      onSaved?.({ _id: id, name: name.trim(), unit });
      onClose();
    }
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={ingredient ? ingredient.name : "Nouvel ingrédient"}
      footer={
        <Button size="lg" onClick={save} disabled={busy || !name.trim()}>
          {ingredient ? "Enregistrer" : "Ajouter l'ingrédient"}
        </Button>
      }
    >
      <div className="grid gap-4">
        <TextInput
          label="Nom"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex. Courgettes"
          autoFocus={!ingredient}
        />
        <Select
          label="Rayon"
          value={aisleId}
          onChange={(e) => setAisleId(e.target.value as Id<"aisles">)}
        >
          {!aisleId && <option value="">Choisir un rayon</option>}
          {aisles.map((a) => (
            <option key={a._id} value={a._id}>
              {a.emoji} {a.name}
            </option>
          ))}
        </Select>
        <Select
          label="Unité utilisée dans les recettes"
          value={unit}
          onChange={(e) => setUnit(e.target.value as Unit)}
        >
          {UNITS.map((u) => (
            <option key={u} value={u}>
              {unitChoiceLabel(u)}
            </option>
          ))}
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <TextInput
            label="Prix (CHF)"
            value={priceText}
            onChange={(e) => setPriceText(e.target.value)}
            inputMode="decimal"
            placeholder="Ex. 3.50"
          />
          <TextInput
            label={`Pour (${unitName(unit, parseAmount(qtyText) ?? 1)})`}
            value={qtyText}
            onChange={(e) => setQtyText(e.target.value)}
            inputMode="decimal"
          />
        </div>
        <div>
          <TextInput
            label={`Contenu d'un paquet (en ${unitName(unit, 2)}, facultatif)`}
            value={packText}
            onChange={(e) => setPackText(e.target.value)}
            inputMode="decimal"
            placeholder="Ex. 8 si un paquet contient 8 tranches"
          />
          <p className="mt-1 text-[13px] text-muted">
            Rempli, la liste de courses compte des paquets entiers. Vide, elle garde la quantité exacte.
          </p>
        </div>
        <ChainsPicker value={onlyChains} onChange={setOnlyChains} />
        <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl bg-paper px-4 py-3 ring-1 ring-line">
          <input
            type="checkbox"
            checked={pantry}
            onChange={(e) => setPantry(e.target.checked)}
            className="size-6 shrink-0 accent-carrot"
          />
          <span>
            <span className="block font-bold">On l'a souvent en stock</span>
            <span className="block text-[15px] text-muted">
              Proposé en haut de la liste quand on valide le menu de la semaine, pour le décocher facilement.
            </span>
          </span>
        </label>
        <p className="rounded-2xl bg-sun-soft p-3 text-[15px] font-semibold text-[#6b4d00]">
          Prix estimés, indicatifs : ajuste-les à tes tickets de caisse.
        </p>
      </div>
    </Sheet>
  );
}
