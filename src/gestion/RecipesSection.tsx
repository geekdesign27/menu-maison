import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Plus } from "lucide-react";
import { TAGS } from "../../convex/domain/tags";
import { formatDayShort } from "../../convex/domain/dates";
import { searchKey } from "../lib/text";
import { minutes, plural } from "../lib/format";
import {
  useOverview,
  usePricing,
  useRecipes,
  type RecipeRow,
} from "../lib/queries";
import {
  Badge,
  Button,
  EmptyState,
  Loading,
  SearchInput,
  Segmented,
  Select,
} from "../components/ui";
import { DataTable, Thumb, type Column } from "./DataTable";
import { GestionHeader } from "./GestionLayout";

type Status = "all" | "saved" | "catalog";

export function RecipesSection() {
  const navigate = useNavigate();
  const recipes = useRecipes();
  const overview = useOverview();
  const pricing = usePricing();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [tag, setTag] = useState("");

  const stats = useMemo(
    () =>
      new Map((overview?.stats ?? []).map((s) => [s.recipeId as string, s])),
    [overview],
  );

  if (!recipes || !pricing.ready) return <Loading />;

  const needle = searchKey(search);
  const shown = recipes.filter(
    (r) =>
      (!needle || searchKey(r.name).includes(needle)) &&
      (status === "all" || r.saved === (status === "saved")) &&
      (!tag || r.tags.includes(tag)),
  );
  // Cost of one portion, null when no ingredient has a price
  const portionCost = (r: RecipeRow) => {
    const { total, complete } = pricing.cost(r, 1);
    return total === 0 && !complete ? null : total;
  };

  const columns: Column<RecipeRow>[] = [
    {
      key: "name",
      className: "min-w-48",
      label: "Recette",
      sort: (r) => r.name,
      render: (r) => (
        <span className="flex items-center gap-3">
          <Thumb url={r.imageUrl} emoji={r.emoji} />
          <span className="font-extrabold">{r.name}</span>
        </span>
      ),
    },
    {
      key: "tags",
      className: "min-w-48",
      label: "Étiquettes",
      sort: (r) => r.tags.join(", "),
      render: (r) => (
        <span className="flex flex-wrap gap-1 whitespace-nowrap">
          {r.tags.map((t) => (
            <Badge key={t}>{t}</Badge>
          ))}
        </span>
      ),
    },
    {
      key: "prep",
      label: "Temps",
      align: "right",
      sort: (r) => r.prepMinutes,
      render: (r) => minutes(r.prepMinutes),
    },
    {
      key: "items",
      label: "Ingrédients",
      align: "right",
      sort: (r) => r.items.length,
      render: (r) => r.items.length,
    },
    {
      key: "cost",
      label: "Coût / portion",
      align: "right",
      sort: portionCost,
      render: (r) =>
        pricing.text(r, 1) ?? <span className="text-muted">?</span>,
    },
    {
      key: "fridge",
      label: "Frigo",
      align: "right",
      sort: (r) => r.fridgeDays,
      render: (r) => plural(r.fridgeDays, "jour", "jours"),
    },
    {
      key: "likes",
      label: "Cœurs",
      align: "right",
      sort: (r) => r.likedBy.length,
      render: (r) =>
        r.likedBy.length > 0 ? (
          <span className="inline-flex items-center gap-1 font-bold text-berry">
            <Heart size={14} className="fill-current" /> {r.likedBy.length}
          </span>
        ) : null,
    },
    {
      key: "last",
      label: "Cuisinée",
      className: "whitespace-nowrap",
      sort: (r) => stats.get(r._id)?.lastDate,
      render: (r) => {
        const stat = stats.get(r._id);
        return stat ? (
          <>
            {formatDayShort(stat.lastDate)}
            <span className="text-muted">
              {" "}
              ({plural(stat.countAll, "fois", "fois")})
            </span>
          </>
        ) : (
          <span className="text-muted">Jamais</span>
        );
      },
    },
    {
      key: "status",
      className: "whitespace-nowrap",
      label: "Statut",
      sort: (r) => (r.saved ? 0 : 1),
      render: (r) =>
        r.saved ? (
          <Badge tone="herb">Nos recettes</Badge>
        ) : (
          <Badge>Catalogue</Badge>
        ),
    },
  ];

  return (
    <>
      <GestionHeader
        title="Recettes"
        subtitle={plural(recipes.length, "recette", "recettes")}
        actions={
          <Button onClick={() => navigate("/gestion/recette/nouvelle")}>
            <Plus size={20} /> Nouvelle recette
          </Button>
        }
      />
      <div className="px-6 pb-10">
        <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_22rem_14rem]">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Chercher une recette"
          />
          <Segmented
            label="Statut"
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "Toutes" },
              { value: "saved", label: "Nos recettes" },
              { value: "catalog", label: "Catalogue" },
            ]}
          />
          <Select
            aria-label="Étiquette"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
          >
            <option value="">Étiquettes</option>
            {TAGS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </div>
        {shown.length === 0 ? (
          <EmptyState
            emoji="🔎"
            title="Aucune recette ne correspond"
            text="Change la recherche ou les filtres."
          />
        ) : (
          <DataTable
            rows={shown}
            columns={columns}
            rowKey={(r) => r._id}
            onOpen={(r) => navigate(`/gestion/recette/${r._id}/modifier`)}
            openLabel={(r) => `Modifier ${r.name}`}
          />
        )}
      </div>
    </>
  );
}
