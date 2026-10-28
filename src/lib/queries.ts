// Live Convex queries and derived helpers shared by several screens.
import type { Lang } from "../../convex/domain/lang";
import { useMemo } from "react";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../convex/_generated/api";
import { recipeCost } from "../../convex/domain/shopping";
import { useBase, useSession } from "./session";
import { useStoreChoice, useWeek } from "./week";
import { formatChf } from "./format";

export type RecipeRow = FunctionReturnType<typeof api.recipes.list>[number];

/** Live list of non-archived recipes. */
export function useRecipes() {
  const { token } = useSession();
  return useQuery(api.recipes.list, token ? { token } : "skip");
}

/** Meal history and per-recipe statistics, relative to today. */
export function useOverview() {
  const { token } = useSession();
  const { today } = useWeek();
  return useQuery(api.stats.overview, token ? { token, today } : "skip");
}

/** A recipe the family cares about: kept in « Nos recettes » or liked by someone. */
export function isLoved(recipe: Pick<RecipeRow, "saved" | "likedBy">) {
  return recipe.saved || recipe.likedBy.length > 0;
}

/** Ingredients indexed by id, the shape expected by `recipeCost`. */
export function useIngredientMap() {
  const base = useBase();
  return useMemo(
    () => Object.fromEntries((base?.ingredients ?? []).map((i) => [i._id, i])),
    [base?.ingredients],
  );
}

/** Cost helpers bound to the ingredient catalog and the store chosen on this phone. */
export function usePricing() {
  const base = useBase();
  const ingredients = useIngredientMap();
  const { store } = useStoreChoice();
  const priceFactor = store?.priceFactor ?? 1;
  const chain = store?.chain;
  return useMemo(() => {
    const cost = (recipe: Pick<RecipeRow, "items">, persons: number) =>
      recipeCost(recipe, persons, ingredients, priceFactor, chain);
    return {
      ready: !!base,
      cost,
      /** « CHF 2.40 », « env. CHF 2.40 » (« ca. » in German) when a price is missing, null when nothing is priced. */
      text: (
        recipe: Pick<RecipeRow, "items">,
        persons: number,
        lang: Lang = "fr",
      ) => {
        const { total, complete } = cost(recipe, persons);
        if (total === 0 && !complete) return null;
        const about = lang === "de" ? "ca. " : "env. ";
        return `${complete ? "" : about}${formatChf(total)}`;
      },
    };
  }, [base, ingredients, priceFactor, chain]);
}
