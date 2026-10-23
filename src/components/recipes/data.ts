import { useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { recipeCost } from "../../../convex/domain/shopping";
import { sameFamily, type Unit } from "../../../convex/domain/quantities";
import { useBase, useSession } from "../../lib/session";
import { useRun } from "../../lib/toast";
import { formatChf } from "../../lib/format";

export type RecipeRow = FunctionReturnType<typeof api.recipes.list>[number];

/** Non-breaking space for French punctuation (« », : ; ! ?). */
export const NB = " ";

/** Live list of non-archived recipes, shared by the recipe screens. */
export function useRecipeList() {
  const { token } = useSession();
  return useQuery(api.recipes.list, token ? { token } : "skip");
}

/** Ingredients indexed by id, the shape expected by `recipeCost`. */
export function useIngredientMap() {
  const base = useBase();
  return useMemo(
    () => Object.fromEntries((base?.ingredients ?? []).map((i) => [i._id, i])),
    [base?.ingredients],
  );
}

/** Heart toggle for the current member, applied instantly on screen. */
export function useToggleLike() {
  const { token, memberId } = useSession();
  const run = useRun();
  const toggle = useMutation(api.recipes.toggleLike).withOptimisticUpdate(
    (store, args) => {
      const list = store.getQuery(api.recipes.list, { token: args.token });
      if (!list) return;
      store.setQuery(
        api.recipes.list,
        { token: args.token },
        list.map((r) => {
          if (r._id !== args.recipeId) return r;
          const liked = r.likedBy.includes(args.memberId);
          return {
            ...r,
            saved: liked ? r.saved : true,
            likedBy: liked
              ? r.likedBy.filter((m) => m !== args.memberId)
              : [...r.likedBy, args.memberId],
          };
        }),
      );
    },
  );
  return (recipeId: Id<"recipes">) => {
    if (!memberId) return;
    void run(() => toggle({ token, recipeId, memberId }));
  };
}

/** « CHF 2.40 », « env. CHF 2.40 » when a price is missing, null when nothing is priced. */
export function costText(
  recipe: Pick<RecipeRow, "items">,
  persons: number,
  ingredients: ReturnType<typeof useIngredientMap>,
  priceFactor = 1,
): string | null {
  const { total, complete } = recipeCost(
    recipe,
    persons,
    ingredients,
    priceFactor,
  );
  if (total === 0 && !complete) return null;
  return `${complete ? "" : "env. "}${formatChf(total)}`;
}

/** Lowercase text without accents, for forgiving searches. */
export function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

const PASTELS = [
  "#fde9da", // carrot
  "#def3e6", // herb
  "#fbe2e8", // berry
  "#fdf1cf", // sun
  "#e2eefa", // sky
  "#ece6fb", // lilac
  "#d9f2ec", // mint
  "#ffe3cc", // peach
];

/** Soft background colour derived from the recipe name, stable across renders. */
export function pastelFor(name: string) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + (ch.codePointAt(0) ?? 0)) >>> 0;
  return PASTELS[hash % PASTELS.length];
}

export const UNITS: Unit[] = [
  "g",
  "kg",
  "ml",
  "l",
  "pc",
  "cs",
  "cc",
  "botte",
  "boîte",
  "paquet",
  "pincée",
];

export const UNIT_LABELS: Record<Unit, string> = {
  g: "g",
  kg: "kg",
  ml: "ml",
  l: "l",
  pc: "pièce(s)",
  cs: "c. à s.",
  cc: "c. à c.",
  botte: "botte(s)",
  boîte: "boîte(s)",
  paquet: "paquet(s)",
  pincée: "pincée(s)",
};

/** Units that can be added to `unit` on the shopping list. */
export function compatibleUnits(unit: Unit) {
  return UNITS.filter((u) => sameFamily(u, unit));
}
