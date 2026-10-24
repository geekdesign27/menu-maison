import {
  recipeAllergens,
  recipeNutrition,
  type OffData,
} from "../../../convex/domain/openFoodFacts";
import {
  formatNumber,
  NBSP,
  type Unit,
} from "../../../convex/domain/quantities";
import { Card, SectionTitle } from "../ui";
import { plural } from "../../lib/format";

type Items = { ingredientId: string; qtyPerPerson: number; unit: Unit }[];

/** Allergens and nutrition of one portion, from the ingredients completed with Open Food Facts. */
export function RecipeNutrition({
  items,
  ingredients,
}: {
  items: Items;
  ingredients: Record<string, { off?: OffData } | undefined>;
}) {
  const allergens = recipeAllergens(items, ingredients);
  const nutrition = recipeNutrition(items, ingredients);
  const grams = (n: number) => `${formatNumber(n, 1)}${NBSP}g`;

  return (
    <>
      <SectionTitle>Allergènes et nutrition</SectionTitle>
      <Card className="grid gap-3 p-4 text-[15px]">
        {allergens.known === 0 ? (
          <p className="text-muted">
            Complète les ingrédients depuis Open Food Facts (fiche d'un
            ingrédient) pour voir ici les allergènes et les calories.
          </p>
        ) : (
          <>
            <p>
              <span className="font-bold">Allergènes{NBSP}: </span>
              {allergens.labels.length
                ? allergens.labels.join(", ")
                : "aucun indiqué"}
              {allergens.known < allergens.total && (
                <span className="block text-[13px] text-muted">
                  {`D'après ${plural(allergens.known, "ingrédient", "ingrédients")} sur ${allergens.total}, les autres ne sont pas encore complétés.`}
                </span>
              )}
            </p>
            <p className="rounded-xl bg-sun-soft px-3 py-2 text-[13px] font-semibold text-[#6b4d00]">
              Données d'Open Food Facts, parfois incomplètes. En cas d'allergie,
              vérifie toujours l'emballage.
            </p>
            {nutrition.covered > 0 && (
              <div>
                <p>
                  <span className="font-bold">
                    {nutrition.covered < nutrition.total
                      ? "Au moins "
                      : "Environ "}
                    {nutrition.kcal}
                    {NBSP}kcal
                  </span>{" "}
                  par portion
                </p>
                <p className="text-muted">
                  Protéines {grams(nutrition.proteins)}, glucides{" "}
                  {grams(nutrition.carbs)} dont sucres {grams(nutrition.sugars)}
                  , lipides {grams(nutrition.fat)}, sel {grams(nutrition.salt)}.
                </p>
                {nutrition.covered < nutrition.total && (
                  <p className="text-[13px] text-muted">
                    {`Calcul partiel${NBSP}: ${plural(nutrition.covered, "ingrédient", "ingrédients")} sur ${nutrition.total} avec des valeurs et une quantité en grammes, millilitres ou cuillères.`}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </Card>
    </>
  );
}
