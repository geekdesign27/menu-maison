import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { Trash2 } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import type { Unit } from "../../../convex/domain/quantities";
import { formatNumber, toBase } from "../../../convex/domain/quantities";
import type { OffHit } from "../../../convex/domain/openFoodFacts";
import { OffIngredientSection } from "../off/OffIngredientSection";
import { useSession } from "../../lib/session";
import { useRun, useToast } from "../../lib/toast";
import { Button, Select, Sheet, TextInput } from "../ui";
import { parseAmount, unitChoiceLabel, unitName, UNITS } from "../../lib/units";
import { ChainsPicker, type Chain } from "./chains";
import { ProductPhotoField } from "./ProductPhotoField";
import { useT } from "../../i18n/useT";
import { frenchName, namesToSave } from "../../lib/catalogNames";
import { NameFields } from "./NameFields";

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
  initialAisleId,
  initialUnit,
  initialOff,
  onSaved,
  onDelete,
  onClose,
}: {
  ingredient?: Doc<"ingredients">;
  aisles: Doc<"aisles">[];
  initialName?: string;
  initialAisleId?: Id<"aisles">;
  initialUnit?: Unit;
  /** Open Food Facts product chosen before creating the ingredient. */
  initialOff?: OffHit;
  onSaved?: (saved: SavedIngredient) => void;
  /** Shown as a « Supprimer » button when editing an existing ingredient. */
  onDelete?: () => void;
  onClose: () => void;
}) {
  const { token } = useSession();
  const run = useRun();
  const toast = useToast();
  const { t, lang } = useT();
  const upsert = useMutation(api.catalog.upsertIngredient);
  const importProduct = useAction(api.openFoodFacts.importProduct);
  const [pendingOff, setPendingOff] = useState<OffHit | null>(
    initialOff ?? null,
  );
  const [name, setName] = useState(ingredient ? frenchName(ingredient) : (lang === "fr" ? initialName : ""));
  const [nameDe, setNameDe] = useState(ingredient?.nameDe ?? (lang === "de" ? initialName : ""));
  const [aisleId, setAisleId] = useState<Id<"aisles"> | "">(
    ingredient?.aisleId ?? initialAisleId ?? "",
  );
  const [unit, setUnit] = useState<Unit>(
    ingredient?.unit ?? initialUnit ?? "g",
  );
  const [priceText, setPriceText] = useState(
    ingredient?.priceChf !== undefined ? ingredient.priceChf.toFixed(2) : "",
  );
  const [qtyText, setQtyText] = useState(
    ingredient?.priceQty !== undefined
      ? formatNumber(ingredient.priceQty, 2, lang)
      : "1",
  );
  const [pantry, setPantry] = useState(ingredient?.pantry ?? false);
  const [onlyChains, setOnlyChains] = useState<Chain[]>(
    ingredient?.onlyChains ?? [],
  );
  const [image, setImage] = useState<{
    id: Id<"_storage"> | null;
    url: string | null;
  }>({
    id: ingredient?.imageId ?? null,
    url:
      (ingredient as { imageUrl?: string | null } | undefined)?.imageUrl ??
      null,
  });
  const [packText, setPackText] = useState(
    ingredient?.packSize !== undefined
      ? formatNumber(ingredient.packSize, 2, lang)
      : "",
  );
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!aisleId) {
      toast(t("recipes.errAisle"), "error");
      return;
    }
    const priceChf = parseAmount(priceText);
    const priceQty = parseAmount(qtyText);
    if (Number.isNaN(priceChf) || Number.isNaN(priceQty)) {
      toast(t("recipes.errPriceQty"), "error");
      return;
    }
    const packSize = parseAmount(packText);
    if (Number.isNaN(packSize)) {
      toast(t("recipes.errPack"), "error");
      return;
    }
    if (priceChf !== undefined && priceQty === undefined) {
      toast(t("recipes.errPriceFor"), "error");
      return;
    }
    setBusy(true);
    const id = await run(
      () =>
        upsert({
          token,
          id: ingredient?._id,
          ...namesToSave(name, nameDe),
          aisleId,
          unit,
          priceChf,
          priceQty: priceChf !== undefined ? priceQty : undefined,
          pantry,
          packSize,
          onlyChains,
          imageId: image.id ?? undefined,
        }),
      t(ingredient ? "recipes.ingredientSaved" : "recipes.ingredientAdded"),
    );
    if (id && !ingredient && pendingOff) {
      // The ingredient exists even if Open Food Facts fails: the error is only shown
      await run(
        () => importProduct({ token, id, code: pendingOff.code }),
        t("recipes.offImported"),
      );
    }
    setBusy(false);
    if (id) {
      onSaved?.({ _id: id, name: (lang === "de" && nameDe.trim()) || namesToSave(name, nameDe).name, unit });
      onClose();
    }
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={ingredient ? ingredient.name : t("recipes.newIngredient")}
      footer={
        <Button size="lg" onClick={save} disabled={busy || !(name.trim() || nameDe.trim())}>
          {t(ingredient ? "recipes.saveShort" : "recipes.addThisIngredient")}
        </Button>
      }
    >
      <div className="grid gap-4">
        <NameFields
          name={name}
          nameDe={nameDe}
          onName={setName}
          onNameDe={setNameDe}
          placeholder={t("recipes.ingredientNamePlaceholder")}
          autoFocus={!ingredient}
        />
        <Select
          label={t("recipes.aisle")}
          value={aisleId}
          onChange={(e) => setAisleId(e.target.value as Id<"aisles">)}
        >
          {!aisleId && <option value="">{t("recipes.pickAisle")}</option>}
          {aisles.map((a) => (
            <option key={a._id} value={a._id}>
              {a.emoji} {a.name}
            </option>
          ))}
        </Select>
        <Select
          label={t("recipes.recipeUnit")}
          value={unit}
          onChange={(e) => setUnit(e.target.value as Unit)}
        >
          {UNITS.map((u) => (
            <option key={u} value={u}>
              {unitChoiceLabel(u, lang)}
            </option>
          ))}
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <TextInput
            label={t("recipes.priceChf")}
            value={priceText}
            onChange={(e) => setPriceText(e.target.value)}
            inputMode="decimal"
            placeholder={t("recipes.pricePlaceholder")}
          />
          <TextInput
            label={t("recipes.priceForUnit", {
              unit: unitName(unit, parseAmount(qtyText) ?? 1, lang),
            })}
            value={qtyText}
            onChange={(e) => setQtyText(e.target.value)}
            inputMode="decimal"
          />
        </div>
        <div>
          <TextInput
            label={t("recipes.packSize", { unit: unitName(unit, 2, lang) })}
            value={packText}
            onChange={(e) => setPackText(e.target.value)}
            inputMode="decimal"
            placeholder={t("recipes.packPlaceholder")}
          />
          <p className="mt-1 text-[13px] text-muted">{t("recipes.packHint")}</p>
        </div>
        <OffIngredientSection
          ingredientId={ingredient?._id}
          name={name}
          liquid={toBase(1, unit).unit === "ml"}
          pending={pendingOff}
          onPending={setPendingOff}
          onImported={(img) =>
            img.imageId && setImage({ id: img.imageId, url: img.imageUrl })
          }
        />
        <ProductPhotoField
          imageUrl={image.url}
          onChange={(img) =>
            setImage(
              img ? { id: img.id, url: img.url } : { id: null, url: null },
            )
          }
        />
        <ChainsPicker value={onlyChains} onChange={setOnlyChains} />
        <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl bg-paper px-4 py-3 ring-1 ring-line">
          <input
            type="checkbox"
            checked={pantry}
            onChange={(e) => setPantry(e.target.checked)}
            className="size-6 shrink-0 accent-carrot"
          />
          <span>
            <span className="block font-bold">{t("recipes.pantryTitle")}</span>
            <span className="block text-[15px] text-muted">
              {t("recipes.pantryText")}
            </span>
          </span>
        </label>
        <p className="rounded-2xl bg-sun-soft p-3 text-[15px] font-semibold text-[#6b4d00]">
          {t("recipes.priceWarning")}
        </p>
        {ingredient && onDelete && (
          <Button variant="danger" onClick={onDelete}>
            <Trash2 size={18} /> {t("recipes.deleteIngredient")}
          </Button>
        )}
      </div>
    </Sheet>
  );
}
