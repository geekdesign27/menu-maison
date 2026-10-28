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
import { useT } from "../../i18n/useT";
import { allergenNames } from "./allergens";

type Items = { ingredientId: string; qtyPerPerson: number; unit: Unit }[];

/** Allergens and nutrition of one portion, from the ingredients completed with Open Food Facts. */
export function RecipeNutrition({
  items,
  ingredients,
}: {
  items: Items;
  ingredients: Record<string, { off?: OffData } | undefined>;
}) {
  const { t, lang } = useT();
  const allergens = recipeAllergens(items, ingredients);
  const nutrition = recipeNutrition(items, ingredients);
  const allergenTags = [...new Set(items.map((i) => i.ingredientId))].flatMap(
    (id) => ingredients[id]?.off?.allergens ?? [],
  );
  const labels = allergenNames(allergenTags, t, lang);
  const grams = (n: number) => `${formatNumber(n, 1, lang)}${NBSP}g`;
  const ingredientCount = (n: number) =>
    plural(n, t("recipes.ingredientOne"), t("recipes.ingredientMany"));

  return (
    <>
      <SectionTitle>{t("recipes.allergensAndNutrition")}</SectionTitle>
      <Card className="grid gap-3 p-4 text-[15px]">
        {allergens.known === 0 ? (
          <p className="text-muted">{t("recipes.nutritionEmpty")}</p>
        ) : (
          <>
            <p>
              <span className="font-bold">{t("recipes.allergensLabel")}</span>
              {labels.length ? labels.join(", ") : t("recipes.noneIndicated")}
              {allergens.known < allergens.total && (
                <span className="block text-[13px] text-muted">
                  {t("recipes.allergensPartial", {
                    known: ingredientCount(allergens.known),
                    total: allergens.total,
                  })}
                </span>
              )}
            </p>
            <p className="rounded-xl bg-sun-soft px-3 py-2 text-[13px] font-semibold text-[#6b4d00]">
              {t("recipes.allergyWarning")}
            </p>
            {nutrition.covered > 0 && (
              <div>
                <p>
                  <span className="font-bold">
                    {t(
                      nutrition.covered < nutrition.total
                        ? "recipes.kcalAtLeast"
                        : "recipes.kcalAbout",
                      { kcal: nutrition.kcal },
                    )}
                  </span>{" "}
                  {t("recipes.perPortion")}
                </p>
                <p className="text-muted">
                  {t("recipes.nutrients", {
                    proteins: grams(nutrition.proteins),
                    carbs: grams(nutrition.carbs),
                    sugars: grams(nutrition.sugars),
                    fat: grams(nutrition.fat),
                    salt: grams(nutrition.salt),
                  })}
                </p>
                {nutrition.covered < nutrition.total && (
                  <p className="text-[13px] text-muted">
                    {t("recipes.nutritionPartial", {
                      covered: ingredientCount(nutrition.covered),
                      total: nutrition.total,
                    })}
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
