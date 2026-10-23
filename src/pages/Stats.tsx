import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CalendarPlus } from "lucide-react";
import { daysBetween, weekStart } from "../../convex/domain/dates";
import { forgottenRecipes } from "../../convex/domain/stats";
import { NBSP } from "../../convex/domain/quantities";
import { useBase } from "../lib/session";
import { useWeek } from "../lib/week";
import { plural } from "../lib/format";
import { BackButton } from "../components/Layout";
import {
  Button,
  Card,
  EmptyState,
  Loading,
  Page,
  SectionTitle,
} from "../components/ui";
import { RecipeEmoji } from "../components/RecipeCard";
import { isLoved, useOverview, useRecipes } from "../lib/queries";

const TOP_SIZE = 8;
const FORGOTTEN_SIZE = 6;
const TOO_OFTEN_4W = 3;

function Bar({
  value,
  max,
  tone,
}: {
  value: number;
  max: number;
  tone: string;
}) {
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-line/70">
      <div
        className={`h-full rounded-full ${tone}`}
        style={{ width: `${Math.max(6, (value / max) * 100)}%` }}
      />
    </div>
  );
}

export function StatsPage() {
  const { today } = useWeek();
  const base = useBase();
  const recipes = useRecipes();
  const navigate = useNavigate();
  const overview = useOverview();

  const data = useMemo(() => {
    if (!overview || !recipes || !base) return null;
    const byId = new Map(recipes.map((r) => [r._id as string, r]));
    // Stats of archived recipes are left out: they are no longer in the list
    const stats = overview.stats.filter((s) => byId.has(s.recipeId));

    const start = weekStart(today, base.settings.shoppingDay);
    const thisWeek = new Set(
      overview.meals
        .filter(
          (m) =>
            m.recipeId &&
            m.status !== "pas mangé" &&
            !m.fromLeftoverOf &&
            m.date <= today &&
            m.cookedOn >= start,
        )
        .map((m) => `${m.recipeId}|${m.cookedOn}`),
    ).size;
    const fourWeeks = stats.reduce((sum, s) => sum + s.count4w, 0);

    const top = stats
      .filter((s) => s.count12w > 0)
      .sort((a, b) => b.count12w - a.count12w)
      .slice(0, TOP_SIZE)
      .map((s) => ({ recipe: byId.get(s.recipeId)!, count: s.count12w }));

    const tagCounts = new Map<string, number>();
    for (const s of stats) {
      if (!s.count12w) continue;
      for (const tag of byId.get(s.recipeId)!.tags)
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + s.count12w);
    }
    const styles = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]);

    const loved = recipes.filter(isLoved).map((r) => r._id as string);
    const lastById = new Map(stats.map((s) => [s.recipeId, s.lastDate]));
    const forgotten = forgottenRecipes(loved, stats, today)
      .slice(0, FORGOTTEN_SIZE)
      .map((id) => {
        const last = lastById.get(id);
        return {
          recipe: byId.get(id)!,
          days: last ? daysBetween(last, today) : null,
        };
      });

    const tooOften = stats
      .filter((s) => s.count4w >= TOO_OFTEN_4W)
      .map((s) => ({ recipe: byId.get(s.recipeId)!, count: s.count4w }));

    return {
      hasHistory: stats.length > 0,
      thisWeek,
      fourWeeks,
      top,
      styles,
      forgotten,
      tooOften,
    };
  }, [overview, recipes, base, today]);

  const back = <BackButton fallback="/plus" />;

  if (!data) {
    return (
      <Page title="Statistiques" back={back}>
        <Loading label="Calcul des statistiques" />
      </Page>
    );
  }

  if (!data.hasHistory) {
    return (
      <Page title="Statistiques" back={back}>
        <EmptyState
          emoji="📊"
          title="Pas encore de statistiques"
          text="Elles se remplissent au fil des repas. Planifie la semaine et marque les plats comme mangés, on te dira ce que vous mangez souvent et ce qui manque au menu."
          action={
            <Button onClick={() => navigate("/")}>Planifier la semaine</Button>
          }
        />
      </Page>
    );
  }

  const topMax = data.top[0]?.count ?? 1;
  const styleMax = data.styles[0]?.[1] ?? 1;

  return (
    <Page title="Statistiques" subtitle="Pour varier les menus" back={back}>
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-carrot-soft p-4">
          <div className="text-4xl font-black text-carrot-dark tabular-nums">
            {data.thisWeek}
          </div>
          <div className="text-[15px] font-extrabold">
            {data.thisWeek > 1 ? "plats cuisinés" : "plat cuisiné"} cette
            semaine
          </div>
        </Card>
        <Card className="bg-herb-soft p-4">
          <div className="text-4xl font-black text-herb tabular-nums">
            {data.fourWeeks}
          </div>
          <div className="text-[15px] font-extrabold">
            {data.fourWeeks > 1 ? "plats cuisinés" : "plat cuisiné"} en 4
            semaines
          </div>
        </Card>
      </div>

      {data.tooOften.length > 0 && (
        <>
          <SectionTitle>Plats trop fréquents</SectionTitle>
          <Card className="bg-berry-soft p-4">
            <ul className="space-y-3">
              {data.tooOften.map(({ recipe, count }) => (
                <li key={recipe._id} className="flex items-center gap-3">
                  <RecipeEmoji
                    name={recipe.name}
                    emoji={recipe.emoji}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-black">{recipe.name}</div>
                    <div className="text-[15px] font-bold text-berry">
                      {count} fois en 4 semaines
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[15px] font-bold">
              Et si on variait un peu{NBSP}? Jette un œil à « Ça fait
              longtemps » juste en dessous.
            </p>
          </Card>
        </>
      )}

      {data.top.length > 0 && (
        <>
          <SectionTitle>Top des 12 dernières semaines</SectionTitle>
          <Card className="p-4">
            <ol className="space-y-3">
              {data.top.map(({ recipe, count }) => (
                <li key={recipe._id}>
                  <Link
                    to={`/recette/${recipe._id}`}
                    className="flex items-center gap-3 rounded-2xl active:bg-cream"
                  >
                    <RecipeEmoji
                      name={recipe.name}
                      emoji={recipe.emoji}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate font-extrabold">
                          {recipe.name}
                        </span>
                        <span className="shrink-0 text-[15px] font-black text-carrot-dark tabular-nums">
                          {count}
                          {NBSP}×
                        </span>
                      </div>
                      <Bar value={count} max={topMax} tone="bg-carrot" />
                    </div>
                  </Link>
                </li>
              ))}
            </ol>
          </Card>
        </>
      )}

      {data.forgotten.length > 0 && (
        <>
          <SectionTitle>Ça fait longtemps</SectionTitle>
          <Card className="divide-y divide-line">
            {data.forgotten.map(({ recipe, days }) => (
              <div key={recipe._id} className="flex items-center gap-3 p-3">
                <Link
                  to={`/recette/${recipe._id}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <RecipeEmoji
                    name={recipe.name}
                    emoji={recipe.emoji}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <div className="truncate font-extrabold">{recipe.name}</div>
                    <div className="text-[15px] text-muted">
                      {days === null
                        ? "Pas au menu depuis plus de 6 mois"
                        : `Il y a ${plural(days, "jour", "jours")}`}
                    </div>
                  </div>
                </Link>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => navigate(`/?plan=${recipe._id}`)}
                  aria-label={`Planifier ${recipe.name}`}
                  className="min-h-11"
                >
                  <CalendarPlus size={18} />
                  Planifier
                </Button>
              </div>
            ))}
          </Card>
        </>
      )}

      {data.styles.length > 0 && (
        <>
          <SectionTitle>Répartition par style</SectionTitle>
          <Card className="space-y-3 p-4">
            {data.styles.map(([tag, count]) => (
              <div key={tag} className="space-y-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-extrabold">{tag}</span>
                  <span className="text-[15px] font-bold text-muted tabular-nums">
                    {plural(count, "plat", "plats")}
                  </span>
                </div>
                <Bar value={count} max={styleMax} tone="bg-herb" />
              </div>
            ))}
          </Card>
          <p className="mt-2 px-1 text-[15px] text-muted">
            Sur 12 semaines. Un plat peut compter dans plusieurs styles.
          </p>
        </>
      )}
    </Page>
  );
}
