import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Link2, Plus } from "lucide-react";
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
import { useT } from "../i18n/useT";

type Status = "all" | "saved" | "catalog";

export function RecipesSection() {
  const navigate = useNavigate();
  const recipes = useRecipes();
  const overview = useOverview();
  const pricing = usePricing();
  const { t, lang } = useT();
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
      label: t("admin.recipes.colRecipe"),
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
      label: t("admin.recipes.tags"),
      sort: (r) => r.tags.join(", "),
      render: (r) => (
        <span className="flex flex-wrap gap-1 whitespace-nowrap">
          {r.tags.map((tag) => (
            <Badge key={tag}>{tag}</Badge>
          ))}
        </span>
      ),
    },
    {
      key: "prep",
      label: t("admin.recipes.colTime"),
      align: "right",
      sort: (r) => r.prepMinutes,
      render: (r) => minutes(r.prepMinutes),
    },
    {
      key: "items",
      label: t("admin.recipes.colIngredients"),
      align: "right",
      sort: (r) => r.items.length,
      render: (r) => r.items.length,
    },
    {
      key: "cost",
      label: t("admin.recipes.colCost"),
      align: "right",
      sort: portionCost,
      render: (r) =>
        pricing.text(r, 1) ?? <span className="text-muted">?</span>,
    },
    {
      key: "fridge",
      label: t("admin.recipes.colFridge"),
      align: "right",
      sort: (r) => r.fridgeDays,
      render: (r) =>
        plural(
          r.fridgeDays,
          t("admin.recipes.dayOne"),
          t("admin.recipes.dayMany"),
        ),
    },
    {
      key: "likes",
      label: t("admin.recipes.colHearts"),
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
      label: t("admin.recipes.colCooked"),
      className: "whitespace-nowrap",
      sort: (r) => stats.get(r._id)?.lastDate,
      render: (r) => {
        const stat = stats.get(r._id);
        return stat ? (
          <>
            {formatDayShort(stat.lastDate, lang)}
            <span className="text-muted">
              {" "}
              (
              {plural(
                stat.countAll,
                t("admin.recipes.timesOne"),
                t("admin.recipes.timesMany"),
              )}
              )
            </span>
          </>
        ) : (
          <span className="text-muted">{t("admin.recipes.never")}</span>
        );
      },
    },
    {
      key: "status",
      className: "whitespace-nowrap",
      label: t("admin.recipes.status"),
      sort: (r) => (r.saved ? 0 : 1),
      render: (r) =>
        r.saved ? (
          <Badge tone="herb">{t("admin.recipes.saved")}</Badge>
        ) : (
          <Badge>{t("admin.recipes.catalog")}</Badge>
        ),
    },
  ];

  return (
    <>
      <GestionHeader
        title={t("admin.recipes.title")}
        subtitle={plural(
          recipes.length,
          t("admin.recipes.one"),
          t("admin.recipes.many"),
        )}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => navigate("/gestion/recette/importer")}
            >
              <Link2 size={20} /> {t("admin.recipes.import")}
            </Button>
            <Button onClick={() => navigate("/gestion/recette/nouvelle")}>
              <Plus size={20} /> {t("admin.recipes.new")}
            </Button>
          </>
        }
      />
      <div className="px-6 pb-10">
        <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_22rem_14rem]">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={t("admin.recipes.search")}
          />
          <Segmented
            label={t("admin.recipes.status")}
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: t("admin.recipes.all") },
              { value: "saved", label: t("admin.recipes.saved") },
              { value: "catalog", label: t("admin.recipes.catalog") },
            ]}
          />
          <Select
            aria-label={t("admin.recipes.tag")}
            value={tag}
            onChange={(e) => setTag(e.target.value)}
          >
            <option value="">{t("admin.recipes.tags")}</option>
            {TAGS.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </Select>
        </div>
        {shown.length === 0 ? (
          <EmptyState
            emoji="🔎"
            title={t("admin.recipes.noMatchTitle")}
            text={t("admin.recipes.noMatchText")}
          />
        ) : (
          <DataTable
            rows={shown}
            columns={columns}
            rowKey={(r) => r._id}
            onOpen={(r) => navigate(`/gestion/recette/${r._id}/modifier`)}
            openLabel={(r) => t("admin.editName", { name: r.name })}
          />
        )}
      </div>
    </>
  );
}
