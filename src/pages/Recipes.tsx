import { useMemo, useState } from "react";
import { tagText } from "../i18n";
import { useSearchParams } from "react-router-dom";
import { Plus, Zap } from "lucide-react";
import { TAGS } from "../../convex/domain/tags";
import { useBase, useSession } from "../lib/session";
import { plural } from "../lib/format";
import { useT } from "../i18n/useT";
import {
  Button,
  Chip,
  EmptyState,
  Loading,
  Page,
  SearchInput,
  Segmented,
} from "../components/ui";
import { RecipeCard } from "../components/RecipeCard";
import { useToggleLike } from "../components/recipes/data";
import { NewRecipeSheet } from "../components/recipes/NewRecipeSheet";
import { usePricing, useRecipes } from "../lib/queries";
import { searchKey } from "../lib/text";

type View = "saved" | "discover";

const EXPRESS = "express";
const EXPRESS_MAX_MINUTES = 20;
// "Express" is covered by the time-based chip
const FILTER_TAGS = TAGS.filter((t) => t !== "Express");

export function RecipesPage() {
  const recipes = useRecipes();
  const base = useBase();
  const { memberId } = useSession();
  const pricing = usePricing();
  const toggleLike = useToggleLike();
  const { t, lang } = useT();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string | null>(null);
  const [choosing, setChoosing] = useState(false);

  // View kept in the URL so coming back from a recipe lands on the same tab
  const view: View = params.get("vue") === "decouvrir" ? "discover" : "saved";
  const setView = (v: View) =>
    setParams(v === "discover" ? { vue: "decouvrir" } : {}, { replace: true });

  const inView = useMemo(
    () => (recipes ?? []).filter((r) => r.saved === (view === "saved")),
    [recipes, view],
  );

  const shown = useMemo(() => {
    const q = searchKey(query);
    return inView.filter((r) => {
      if (filter === EXPRESS && r.prepMinutes > EXPRESS_MAX_MINUTES)
        return false;
      if (filter && filter !== EXPRESS && !r.tags.includes(filter))
        return false;
      if (!q) return true;
      return searchKey(
        [
          r.name,
          r.description ?? "",
          ...r.tags,
          ...r.tags.map((tag) => tagText(lang, tag)),
        ].join(" "),
      ).includes(q);
    });
  }, [inView, query, filter]);

  const newButton = (
    <Button
      size="sm"
      className="rounded-full pr-4 pl-3"
      onClick={() => setChoosing(true)}
    >
      <Plus size={20} strokeWidth={3} />
      {t("recipes.newShort")}
    </Button>
  );

  if (!recipes || !base) {
    return (
      <Page title={t("nav.recipes")} action={newButton}>
        <Loading label={t("recipes.loadingMany")} />
      </Page>
    );
  }

  const savedCount = recipes.filter((r) => r.saved).length;
  const filtering = query.trim() !== "" || filter !== null;

  return (
    <Page
      title={t("nav.recipes")}
      subtitle={plural(
        shown.length,
        t("recipes.recipeOne"),
        t("recipes.recipeMany"),
      )}
      action={newButton}
    >
      <div className="space-y-3" data-tour="recipes">
        <Segmented
          label={t("recipes.viewLabel")}
          value={view}
          onChange={setView}
          options={[
            {
              value: "saved",
              label: t("recipes.viewSaved", { count: savedCount }),
            },
            {
              value: "discover",
              label: t("recipes.viewDiscover", {
                count: recipes.length - savedCount,
              }),
            },
          ]}
        />
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder={t("recipes.searchPlaceholder")}
        />
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <Chip selected={filter === null} onClick={() => setFilter(null)}>
            {t("recipes.filterAll")}
          </Chip>
          <Chip
            selected={filter === EXPRESS}
            onClick={() => setFilter(filter === EXPRESS ? null : EXPRESS)}
          >
            <Zap size={16} strokeWidth={2.6} aria-hidden />
            Express
          </Chip>
          {FILTER_TAGS.map((tag) => (
            <Chip
              key={tag}
              selected={filter === tag}
              onClick={() => setFilter(filter === tag ? null : tag)}
            >
              {tagText(lang, tag)}
            </Chip>
          ))}
        </div>
      </div>

      {shown.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {shown.map((r) => (
            <RecipeCard
              key={r._id}
              recipe={r}
              members={base.members}
              cost={pricing.text(r, 1, lang)}
              liked={!!memberId && r.likedBy.includes(memberId)}
              onToggleLike={memberId ? () => toggleLike(r._id) : undefined}
            />
          ))}
        </div>
      ) : filtering ? (
        <EmptyState
          emoji="🔍"
          title={t("recipes.noMatchTitle")}
          text={t("recipes.noMatchText")}
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setQuery("");
                setFilter(null);
              }}
            >
              {t("recipes.clearFilters")}
            </Button>
          }
        />
      ) : view === "saved" ? (
        <EmptyState
          emoji="💛"
          title={t("recipes.noSavedTitle")}
          text={t("recipes.noSavedText")}
          action={
            <Button onClick={() => setView("discover")}>
              {t("recipes.discover")}
            </Button>
          }
        />
      ) : (
        <EmptyState
          emoji="🎉"
          title={t("recipes.allSavedTitle")}
          text={t("recipes.allSavedText")}
        />
      )}
      <NewRecipeSheet open={choosing} onClose={() => setChoosing(false)} />
    </Page>
  );
}
