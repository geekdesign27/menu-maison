import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { Search, Unlink } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  allergenLabels,
  type OffData,
  type OffHit,
} from "../../../convex/domain/openFoodFacts";
import { NBSP } from "../../../convex/domain/quantities";
import { useBase, useSession } from "../../lib/session";
import { useRun } from "../../lib/toast";
import { Button } from "../ui";
import { NutriscoreBadge, OffPickSheet } from "./OffSearch";

export type ImportedImage = {
  imageId: Id<"_storage"> | null;
  imageUrl: string | null;
};

/** Allergens, Nutri-Score and calories borrowed from Open Food Facts. */
export function OffSummary({
  off,
  liquid,
}: {
  off: OffData;
  liquid?: boolean;
}) {
  const allergens = allergenLabels(off.allergens);
  const kcal = off.per100?.kcal;
  return (
    <div className="grid gap-2 text-[15px]">
      <div className="flex flex-wrap items-center gap-2">
        {off.nutriscore && <NutriscoreBadge grade={off.nutriscore} size="md" />}
        {kcal !== undefined && (
          <span className="font-bold">
            {Math.round(kcal)}
            {NBSP}kcal pour 100{NBSP}
            {liquid ? "ml" : "g"}
          </span>
        )}
      </div>
      <p>
        <span className="font-bold">Allergènes{NBSP}: </span>
        {allergens.length ? allergens.join(", ") : "aucun indiqué sur Open Food Facts"}
      </p>
      <p className="text-[13px] text-muted">
        D'après le produit «{NBSP}
        {off.productName}
        {NBSP}» d'Open Food Facts. L'ingrédient reste achetable dans n'importe
        quelle marque.
      </p>
    </div>
  );
}

/**
 * Open Food Facts block of the ingredient form. An existing ingredient is
 * linked right away; a new one keeps the chosen product until it is saved.
 */
export function OffIngredientSection({
  ingredientId,
  name,
  liquid,
  pending,
  onPending,
  onImported,
}: {
  ingredientId?: Id<"ingredients">;
  name: string;
  /** Measured in ml: nutrition reads per 100 ml. */
  liquid: boolean;
  pending?: OffHit | null;
  onPending: (hit: OffHit | null) => void;
  onImported: (image: ImportedImage) => void;
}) {
  const base = useBase();
  const { token } = useSession();
  const run = useRun();
  const importProduct = useAction(api.openFoodFacts.importProduct);
  const detach = useMutation(api.openFoodFacts.detach);
  const [searching, setSearching] = useState(false);
  const [busyCode, setBusyCode] = useState<string | null>(null);
  // Live document: the link changes while the form stays open
  const off = ingredientId
    ? base?.ingredients.find((i) => i._id === ingredientId)?.off
    : pending;

  const choose = async (hit: OffHit) => {
    if (!ingredientId) {
      onPending(hit);
      setSearching(false);
      return;
    }
    setBusyCode(hit.code);
    const image = await run(
      () => importProduct({ token, id: ingredientId, code: hit.code }),
      "Allergènes et nutrition ajoutés.",
    );
    setBusyCode(null);
    if (image) {
      onImported(image);
      setSearching(false);
    }
  };

  return (
    <div className="rounded-2xl bg-paper p-4 ring-1 ring-line">
      <div className="mb-2 font-bold">Open Food Facts</div>
      {off ? (
        <>
          <OffSummary off={off} liquid={liquid} />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setSearching(true)}
            >
              <Search size={16} /> Autre produit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                ingredientId
                  ? run(
                      () => detach({ token, id: ingredientId }),
                      "Lien retiré, la photo reste.",
                    )
                  : onPending(null)
              }
            >
              <Unlink size={16} /> Retirer
            </Button>
          </div>
          {!ingredientId && (
            <p className="mt-2 text-[13px] text-muted">
              La photo, les allergènes et la nutrition seront ajoutés à
              l'enregistrement.
            </p>
          )}
        </>
      ) : (
        <>
          <p className="mb-3 text-[15px] text-muted">
            Photo, allergènes et valeurs nutritionnelles d'un produit semblable,
            pour les recettes.
          </p>
          <Button variant="secondary" onClick={() => setSearching(true)}>
            <Search size={18} /> Compléter depuis Open Food Facts
          </Button>
        </>
      )}
      {searching && (
        <OffPickSheet
          initialQuery={name}
          busyCode={busyCode}
          onChoose={choose}
          onClose={() => setSearching(false)}
        />
      )}
    </div>
  );
}
