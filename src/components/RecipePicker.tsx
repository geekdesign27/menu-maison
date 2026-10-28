import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { Clock, PencilLine } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { forgottenRecipes } from "../../convex/domain/stats";
import { useBase, useSession, type Member } from "../lib/session";
import { useWeek } from "../lib/week";
import { formatChf, minutes, plural } from "../lib/format";
import { formatDayShort } from "../../convex/domain/dates";
import { repeatWarning, type MealChoice } from "./planning/data";
import {
  isLoved,
  useOverview,
  usePricing,
  useRecipes,
  type RecipeRow,
} from "../lib/queries";
import { searchKey } from "../lib/text";
import {
  Avatar,
  Badge,
  Button,
  Chip,
  EmptyState,
  Loading,
  SearchInput,
  Sheet,
  TextInput,
} from "./ui";

type Filter = "saved" | "all" | "wishes" | "forgotten" | "free";

const FREE_SUGGESTIONS = [
  "Pizza",
  "Restaurant",
  "Chez mamie",
  "Pique-nique",
  "Plat du congélateur",
  "Chacun pour soi",
];

/**
 * Sheet to choose a recipe (or a free title when `allowFreeText`).
 * With `date`, recipes eaten or planned close to that day carry a warning.
 */
export function RecipePicker({
  open,
  onClose,
  onPick,
  date,
  allowFreeText = false,
  showLeftovers = false,
  title = "Choisir un plat",
}: {
  open: boolean;
  onClose: () => void;
  onPick: (choice: MealChoice) => void;
  date?: string;
  allowFreeText?: boolean;
  /** With `date`: offer spare portions still good that day, before the recipes. */
  showLeftovers?: boolean;
  title?: string;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {open && (
        <PickerBody onPick={onPick} date={date} allowFreeText={allowFreeText} showLeftovers={showLeftovers} />
      )}
    </Sheet>
  );
}

function PickerBody({
  onPick,
  date,
  allowFreeText,
  showLeftovers,
}: {
  onPick: (choice: MealChoice) => void;
  date?: string;
  allowFreeText: boolean;
  showLeftovers: boolean;
}) {
  const { token } = useSession();
  const leftovers = useQuery(api.meals.leftoversFor, token && date && showLeftovers ? { token, date } : "skip");
  const { today } = useWeek();
  const base = useBase();
  const pricing = usePricing();
  const recipes = useRecipes();
  const overview = useOverview();
  const wishes = useQuery(api.wishes.list, token ? { token } : "skip");
  const [chosenFilter, setFilter] = useState<Filter | null>(null);
  // First use: "Nos recettes" is still empty, so start on the whole catalog
  const filter: Filter =
    chosenFilter ??
    (recipes && !recipes.some((r) => r.saved) ? "all" : "saved");
  const [search, setSearch] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [freeTitle, setFreeTitle] = useState("");

  const tags = useMemo(
    () =>
      [...new Set((recipes ?? []).flatMap((r) => r.tags))].sort((a, b) =>
        a.localeCompare(b, "fr"),
      ),
    [recipes],
  );

  const rows = useMemo(() => {
    if (!recipes) return undefined;
    let list: RecipeRow[];
    if (filter === "saved") list = recipes.filter((r) => r.saved);
    else if (filter === "wishes") {
      const wanted = new Set(
        (wishes ?? [])
          .filter((w) => !w.done && w.recipeId)
          .map((w) => w.recipeId),
      );
      list = recipes.filter((r) => wanted.has(r._id));
    } else if (filter === "forgotten") {
      // Without the history every recipe would look never eaten
      if (!overview) return undefined;
      const loved = recipes.filter(isLoved);
      const order = forgottenRecipes(
        loved.map((r) => r._id),
        overview.stats,
        today,
      );
      const byId = new Map(loved.map((r) => [r._id as string, r]));
      list = order.flatMap((id) => byId.get(id) ?? []);
    } else list = recipes;
    if (tag) list = list.filter((r) => r.tags.includes(tag));
    const q = searchKey(search);
    if (q) list = list.filter((r) => searchKey(r.name).includes(q));
    return list;
  }, [recipes, wishes, overview, filter, tag, search, today]);

  const filters: { value: Filter; label: string }[] = [
    { value: "saved", label: "❤️ Nos recettes" },
    { value: "all", label: "Tout" },
    { value: "wishes", label: "💭 Envies" },
    { value: "forgotten", label: "🕰️ Oubliées" },
  ];
  if (allowFreeText) filters.push({ value: "free", label: "✏️ Texte libre" });

  const pickFree = (text: string) => {
    if (text.trim()) onPick({ title: text.trim() });
  };

  return (
    <div className="space-y-3">
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1" data-tour="picker-filters">
        {filters.map((f) => (
          <Chip
            key={f.value}
            selected={filter === f.value}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </Chip>
        ))}
      </div>

      {filter === "free" ? (
        <form
          className="space-y-3 pt-1"
          onSubmit={(e) => {
            e.preventDefault();
            pickFree(freeTitle);
          }}
        >
          <TextInput
            label="Ce qu'on mange"
            value={freeTitle}
            onChange={(e) => setFreeTitle(e.target.value)}
            placeholder="Pizza, restaurant, chez mamie…"
            maxLength={60}
            autoFocus
          />
          <div className="flex flex-wrap gap-2">
            {FREE_SUGGESTIONS.map((s) => (
              <Chip key={s} onClick={() => pickFree(s)}>
                {s}
              </Chip>
            ))}
          </div>
          <Button type="submit" size="lg" disabled={!freeTitle.trim()}>
            <PencilLine size={20} />
            Utiliser ce titre
          </Button>
        </form>
      ) : (
        <>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Chercher une recette"
          />
          {tags.length > 0 && (
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
              {tags.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={tag === t}
                  onClick={() => setTag(tag === t ? null : t)}
                  className={
                    tag === t
                      ? "min-h-10 shrink-0 rounded-full bg-herb px-3 text-[15px] font-bold text-white"
                      : "min-h-10 shrink-0 rounded-full bg-herb-soft px-3 text-[15px] font-bold text-herb"
                  }
                >
                  #{t}
                </button>
              ))}
            </div>
          )}
          {leftovers && leftovers.length > 0 && !tag && (
            <section>
              <h3 className="mb-2 text-[13px] font-extrabold tracking-wider text-herb uppercase">♻️ Restes à finir</h3>
              <ul className="space-y-2">
                {leftovers
                  .filter((m) => !search || searchKey(m.recipe?.name ?? m.title ?? "").includes(searchKey(search)))
                  .map((m) => (
                    <li key={m._id}>
                      <button
                        type="button"
                        onClick={() =>
                          onPick({
                            leftoverOf: m._id,
                            available: m.leftoverPortions,
                            name: m.recipe?.name ?? m.title ?? "Plat",
                            emoji: m.recipe?.emoji ?? "🍽️",
                            until: m.until,
                          })
                        }
                        className="flex w-full items-center gap-3 rounded-[var(--radius-card)] bg-herb-soft p-3 text-left ring-1 ring-herb/30 transition active:scale-[0.99]"
                      >
                        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-paper text-3xl" aria-hidden>
                          {m.recipe?.emoji ?? "🍽️"}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[17px] font-black">{m.recipe?.name ?? m.title}</span>
                          <span className="block text-[15px] font-semibold text-herb">
                            {plural(m.leftoverPortions, "portion", "portions")}, bon jusqu'au {formatDayShort(m.until)}
                          </span>
                          <span className="block text-[13px] text-muted">Cuisiné le {formatDayShort(m.cookedOn)}</span>
                        </span>
                      </button>
                    </li>
                  ))}
              </ul>
              <h3 className="mt-4 mb-2 text-[13px] font-extrabold tracking-wider text-muted uppercase">Recettes</h3>
            </section>
          )}
          {rows === undefined ? (
            <Loading label="Chargement des recettes" />
          ) : rows.length === 0 ? (
            <EmptyState
              emoji={filter === "forgotten" ? "🎉" : "🔍"}
              title={emptyTitle(filter, !!search || !!tag)}
              text={emptyText(filter)}
            />
          ) : (
            <ul className="space-y-2">
              {rows.map((r) => (
                <li key={r._id}>
                  <RecipeLine
                    recipe={r}
                    members={base?.members ?? []}
                    perPerson={pricing.cost(r, 1).total}
                    warning={
                      date
                        ? repeatWarning(overview?.meals, r._id, date, today)
                        : null
                    }
                    onPick={() => onPick({ recipeId: r._id })}
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function emptyTitle(filter: Filter, narrowed: boolean) {
  if (narrowed) return "Aucune recette ne correspond";
  if (filter === "saved") return "Pas encore de recettes à vous";
  if (filter === "wishes") return "Aucune envie avec recette";
  if (filter === "forgotten") return "Rien d'oublié";
  return "Aucune recette";
}

function emptyText(filter: Filter) {
  if (filter === "saved")
    return "Mets un cœur sur une recette pour la retrouver ici.";
  if (filter === "forgotten")
    return "Toutes les recettes aimées ont été mangées ce mois-ci.";
  return undefined;
}

function RecipeLine({
  recipe,
  members,
  perPerson,
  warning,
  onPick,
}: {
  recipe: RecipeRow;
  members: Member[];
  perPerson: number;
  warning: string | null;
  onPick: () => void;
}) {
  const likers = members.filter((m) => recipe.likedBy.includes(m._id));
  return (
    <button
      type="button"
      onClick={onPick}
      className="flex w-full items-center gap-3 rounded-[var(--radius-card)] bg-paper p-3 text-left shadow-[0_1px_0_rgba(43,36,32,0.04),0_4px_14px_rgba(43,36,32,0.06)] transition active:scale-[0.99] active:bg-carrot-soft"
    >
      <span
        className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-cream text-3xl"
        aria-hidden
      >
        {recipe.imageUrl ? <img src={recipe.imageUrl} alt="" loading="lazy" className="size-full object-cover" /> : recipe.emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[17px] font-black">
          {recipe.name}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px] font-semibold text-muted">
          <span className="inline-flex items-center gap-1">
            <Clock size={15} aria-hidden />
            {minutes(recipe.prepMinutes)}
          </span>
          {perPerson > 0 && <span>env. {formatChf(perPerson)} / pers.</span>}
        </span>
        {warning && (
          <span className="mt-1 block">
            <Badge tone="sun">⚠️ {warning}</Badge>
          </span>
        )}
      </span>
      {likers.length > 0 && (
        <span
          className="flex shrink-0 -space-x-2"
          aria-label={`Aimée par ${likers.map((m) => m.name).join(", ")}`}
        >
          {likers.map((m) => (
            <Avatar key={m._id} member={m} size={26} />
          ))}
        </span>
      )}
    </button>
  );
}
