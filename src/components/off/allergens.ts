import type { Lang } from "../../../convex/domain/lang";
import type { MessageKey } from "../../i18n";

// Open Food Facts tags of the 14 declared allergens (see ALLERGENS in
// convex/domain/openFoodFacts.ts) and their label in the dictionary.
const ALLERGEN_KEYS: Record<string, MessageKey> = {
  "en:gluten": "recipes.allergenGluten",
  "en:crustaceans": "recipes.allergenCrustaceans",
  "en:eggs": "recipes.allergenEggs",
  "en:fish": "recipes.allergenFish",
  "en:peanuts": "recipes.allergenPeanuts",
  "en:soybeans": "recipes.allergenSoybeans",
  "en:milk": "recipes.allergenMilk",
  "en:nuts": "recipes.allergenNuts",
  "en:celery": "recipes.allergenCelery",
  "en:mustard": "recipes.allergenMustard",
  "en:sesame-seeds": "recipes.allergenSesame",
  "en:sulphur-dioxide-and-sulphites": "recipes.allergenSulphites",
  "en:lupin": "recipes.allergenLupin",
  "en:molluscs": "recipes.allergenMolluscs",
};

/** Labels of the known allergen tags in `lang`, without duplicates, sorted. */
export function allergenNames(
  tags: string[],
  t: (key: MessageKey) => string,
  lang: Lang,
): string[] {
  const names = tags
    .map((tag) => ALLERGEN_KEYS[tag])
    .filter((key): key is MessageKey => key !== undefined)
    .map((key) => t(key));
  return [...new Set(names)].sort((a, b) => a.localeCompare(b, lang));
}
