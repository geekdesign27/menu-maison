import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Zap } from "lucide-react";
import { TAGS } from "../../convex/domain/tags";
import { useBase, useSession } from "../lib/session";
import { useStoreChoice } from "../lib/week";
import { plural } from "../lib/format";
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
import {
  costText,
  normalize,
  useIngredientMap,
  useRecipeList,
  useToggleLike,
} from "../components/recipes/data";

type View = "saved" | "discover";

const EXPRESS = "express";
const EXPRESS_MAX_MINUTES = 20;
// "Express" is covered by the time-based chip
const FILTER_TAGS = TAGS.filter((t) => t !== "Express");

export function RecipesPage() {
  const recipes = useRecipeList();
  const base = useBase();
  const { memberId } = useSession();
  const { store } = useStoreChoice();
  const ingredients = useIngredientMap();
  const toggleLike = useToggleLike();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string | null>(null);

  // View kept in the URL so coming back from a recipe lands on the same tab
  const view: View = params.get("vue") === "decouvrir" ? "discover" : "saved";
  const setView = (v: View) =>
    setParams(v === "discover" ? { vue: "decouvrir" } : {}, { replace: true });

  const inView = useMemo(
    () => (recipes ?? []).filter((r) => r.saved === (view === "saved")),
    [recipes, view],
  );

  const shown = useMemo(() => {
    const q = normalize(query);
    return inView.filter((r) => {
      if (filter === EXPRESS && r.prepMinutes > EXPRESS_MAX_MINUTES)
        return false;
      if (filter && filter !== EXPRESS && !r.tags.includes(filter))
        return false;
      if (!q) return true;
      return normalize(
        [r.name, r.description ?? "", ...r.tags].join(" "),
      ).includes(q);
    });
  }, [inView, query, filter]);

  const newButton = (
    <Button
      size="sm"
      className="rounded-full pr-4 pl-3"
      onClick={() => navigate("/recette/nouvelle")}
    >
        <Plus size={20} strokeWidth={3} />
        Nouvelle
      </Button>
  );

  if (!recipes || !base) {
    return (
      <Page title="Recettes" action={newButton}>
        <Loading label="Chargement des recettes" />
      </Page>
    );
  }

  const savedCount = recipes.filter((r) => r.saved).length;
  const filtering = query.trim() !== "" || filter !== null;

  return (
    <Page
      title="Recettes"
      subtitle={plural(shown.length, "recette", "recettes")}
      action={newButton}
    >
      <div className="space-y-3">
        <Segmented
          label="Choix des recettes"
          value={view}
          onChange={setView}
          options={[
            { value: "saved", label: `Nos recettes (${savedCount})` },
            {
              value: "discover",
              label: `Découvrir (${recipes.length - savedCount})`,
            },
          ]}
        />
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Chercher une recette"
        />
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <Chip selected={filter === null} onClick={() => setFilter(null)}>
            Tout
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
              {tag}
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
              cost={costText(r, 1, ingredients, store?.priceFactor)}
              liked={!!memberId && r.likedBy.includes(memberId)}
              onToggleLike={memberId ? () => toggleLike(r._id) : undefined}
            />
          ))}
        </div>
      ) : filtering ? (
        <EmptyState
          emoji="🔍"
          title="Aucune recette ne correspond"
          text="Essaie un autre mot ou un autre style."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setQuery("");
                setFilter(null);
              }}
            >
              Effacer les filtres
            </Button>
          }
        />
      ) : view === "saved" ? (
        <EmptyState
          emoji="💛"
          title="Pas encore de recettes à nous"
          text="Aime des recettes dans Découvrir pour les garder ici."
          action={
            <Button onClick={() => setView("discover")}>Découvrir</Button>
          }
        />
      ) : (
        <EmptyState
          emoji="🎉"
          title="Tout le catalogue est à vous"
          text="Toutes les recettes sont déjà dans Nos recettes. Ajoute les tiennes avec « Nouvelle »."
        />
      )}
    </Page>
  );
}
