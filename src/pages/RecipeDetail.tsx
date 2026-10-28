import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation } from "convex/react";
import {
  Archive,
  BookmarkMinus,
  BookmarkPlus,
  CalendarPlus,
  Clock,
  Copy,
  Heart,
  Pencil,
  Refrigerator,
  ExternalLink,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import { formatDayLong } from "../../convex/domain/dates";
import { formatQty } from "../../convex/domain/quantities";
import { ingredientCost } from "../../convex/domain/shopping";
import { useBase, useSession, type Base } from "../lib/session";
import { useStoreChoice } from "../lib/week";
import { useRun } from "../lib/toast";
import { formatChf, minutes, plural } from "../lib/format";
import { useT } from "../i18n/useT";
import { BackButton } from "../components/Layout";
import { RecipeNutrition } from "../components/off/RecipeNutrition";
import {
  Avatar,
  Badge,
  Button,
  Card,
  cx,
  IconButton,
  Loading,
  Page,
  SectionTitle,
  Sheet,
  Stepper,
} from "../components/ui";
import { pastelFor, useToggleLike } from "../components/recipes/data";
import {
  useIngredientMap,
  useOverview,
  usePricing,
  useRecipes,
  type RecipeRow,
} from "../lib/queries";
import { RecipeNotFound } from "../components/recipes/RecipeNotFound";

export function RecipeDetailPage() {
  const { id } = useParams();
  const recipes = useRecipes();
  const base = useBase();
  const { t } = useT();
  const back = <BackButton fallback="/recettes" />;

  if (!recipes || !base) {
    return (
      <Page title={t("recipes.recipe")} back={back}>
        <Loading label={t("recipes.loadingOne")} />
      </Page>
    );
  }
  // Looked up in the live list: a malformed or archived id simply shows "not found"
  const recipe = recipes.find((r) => r._id === id);
  if (!recipe) {
    return (
      <Page title={t("recipes.recipe")} back={back}>
        <RecipeNotFound />
      </Page>
    );
  }
  return <RecipeView key={recipe._id} recipe={recipe} base={base} />;
}

function RecipeView({ recipe, base }: { recipe: RecipeRow; base: Base }) {
  const { token, memberId } = useSession();
  const { store } = useStoreChoice();
  const navigate = useNavigate();
  const run = useRun();
  const ingredients = useIngredientMap();
  const toggleLike = useToggleLike();
  const setSaved = useMutation(api.recipes.setSaved);
  const archive = useMutation(api.recipes.archive);
  const duplicate = useMutation(api.recipes.duplicate);
  const overview = useOverview();
  const { t, lang } = useT();
  const [count, setCount] = useState(
    recipe.defaultPersons ?? base.settings.defaultPersons,
  );
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [taps, setTaps] = useState(0);

  const pricing = usePricing();
  const factor = store?.priceFactor ?? 1;
  const totalCost = pricing.text(recipe, count);
  const stat = overview?.stats.find((s) => s.recipeId === recipe._id);
  const editPath = `/recette/${recipe._id}/modifier`;

  const doArchive = async () => {
    const done = await run(
      () => archive({ token, id: recipe._id }),
      t("recipes.archived"),
    );
    if (done !== undefined) navigate("/recettes", { replace: true });
  };

  return (
    <Page
      title={t("recipes.recipe")}
      back={<BackButton fallback="/recettes" />}
      action={
        <IconButton
          label={t("recipes.editRecipe")}
          onClick={() => navigate(editPath)}
        >
          <Pencil size={22} />
        </IconButton>
      }
    >
      {/* Hero */}
      <div
        className="flex aspect-[16/9] items-center justify-center overflow-hidden rounded-[1.75rem] text-[96px] leading-none"
        style={{ background: pastelFor(recipe.name) }}
      >
        {recipe.imageUrl ? (
          <img
            src={recipe.imageUrl}
            alt={t("recipes.photoAlt", { name: recipe.name })}
            className="size-full object-cover"
          />
        ) : (
          <span aria-hidden className="drop-shadow">
            {recipe.emoji}
          </span>
        )}
      </div>
      <h2 className="mt-4 text-3xl leading-tight font-black tracking-tight">
        {recipe.name}
      </h2>
      {recipe.description && (
        <p className="mt-1 text-[17px] text-muted">{recipe.description}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge tone="sun">
          <Clock size={14} strokeWidth={2.8} aria-hidden />
          {minutes(recipe.prepMinutes)}
        </Badge>
        {recipe.fridgeDays > 0 ? (
          <Badge tone="herb">
            <Refrigerator size={14} strokeWidth={2.8} aria-hidden />
            {t(
              recipe.fridgeDays > 1
                ? "recipes.keepsDaysMany"
                : "recipes.keepsDaysOne",
              { count: recipe.fridgeDays },
            )}
          </Badge>
        ) : (
          <Badge tone="berry">{t("recipes.eatRightAway")}</Badge>
        )}
        {recipe.tags.map((t) => (
          <Badge key={t}>{t}</Badge>
        ))}
      </div>

      {/* Hearts */}
      <Card className="mt-5 p-4">
        <div className="flex justify-around">
          {base.members.map((m) => {
            const liked = recipe.likedBy.includes(m._id);
            const mine = m._id === memberId;
            const content = (
              <>
                <span className="relative">
                  <Avatar member={m} size={52} />
                  <span
                    className={cx(
                      "absolute -right-1 -bottom-1 flex size-7 items-center justify-center rounded-full bg-paper shadow",
                      liked ? "text-berry" : "text-line",
                    )}
                  >
                    <Heart
                      key={mine ? taps : undefined}
                      size={17}
                      strokeWidth={2.6}
                      fill={liked ? "currentColor" : "none"}
                      className={mine && taps > 0 ? "animate-pop" : undefined}
                    />
                  </span>
                </span>
                <span
                  className={cx(
                    "text-[15px] font-extrabold",
                    !liked && "text-muted",
                  )}
                >
                  {m.name}
                </span>
              </>
            );
            return mine ? (
              <button
                key={m._id}
                type="button"
                aria-pressed={liked}
                aria-label={t(liked ? "recipes.unlike" : "recipes.like")}
                onClick={() => {
                  setTaps((n) => n + 1);
                  toggleLike(recipe._id);
                }}
                className="flex min-w-20 flex-col items-center gap-1.5 rounded-2xl p-2 transition active:bg-carrot-soft"
              >
                {content}
              </button>
            ) : (
              <div
                key={m._id}
                className="flex min-w-20 flex-col items-center gap-1.5 p-2"
              >
                {content}
              </div>
            );
          })}
        </div>
        <p className="mt-1 text-center text-[15px] text-muted">
          {t("recipes.heartHint")}
        </p>
      </Card>

      {/* Stats */}
      {overview && (
        <div className="mt-3 flex items-start gap-3 rounded-2xl bg-sun-soft p-4 text-[15px] font-bold">
          <span aria-hidden className="text-xl leading-none">
            📊
          </span>
          <p>
            {stat && stat.count12w > 0
              ? t("recipes.statEaten", {
                  count: stat.count12w,
                  date: formatDayLong(stat.lastDate, lang),
                })
              : stat
                ? t("recipes.statNotEaten", {
                    date: formatDayLong(stat.lastDate, lang),
                  })
                : t("recipes.statNever")}
          </p>
        </div>
      )}

      {/* Ingredients */}
      <SectionTitle>{t("recipes.ingredients")}</SectionTitle>
      <Card className="p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-lg font-black">{t("recipes.for")}</span>
          <Stepper
            label={t("recipes.portionCount")}
            value={count}
            onChange={setCount}
            min={1}
            max={20}
          />
          <span className="w-24 text-right text-lg font-black">
            {t(count > 1 ? "recipes.portionMany" : "recipes.portionOne")}
          </span>
        </div>
        {recipe.items.length === 0 ? (
          <p className="mt-3 text-muted">{t("recipes.noIngredients")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {recipe.items.map((item, i) => {
              const ing = ingredients[item.ingredientId];
              const cost = ing
                ? ingredientCost(
                    ing,
                    item.qtyPerPerson * count,
                    item.unit,
                    factor,
                  )
                : undefined;
              return (
                <li
                  key={`${item.ingredientId}-${i}`}
                  className="flex min-h-12 items-center gap-3 py-2"
                >
                  <span className="min-w-0 flex-1 font-bold">
                    {ing?.name ?? t("recipes.ingredientDeleted")}
                  </span>
                  {cost !== undefined && cost >= 0.05 && (
                    <span className="text-[15px] text-muted tabular-nums">
                      {formatChf(cost)}
                    </span>
                  )}
                  <span className="min-w-20 text-right font-black text-carrot-dark tabular-nums">
                    {formatQty(item.qtyPerPerson * count, item.unit, lang)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {totalCost && (
          <div className="mt-3 rounded-2xl bg-herb-soft px-4 py-3">
            <div className="flex items-center justify-between gap-2 font-black text-herb">
              <span>{t("recipes.estimatedCost")}</span>
              <span className="tabular-nums">{totalCost}</span>
            </div>
            <div className="text-[15px] text-muted">
              {(() => {
                const persons = plural(
                  count,
                  t("recipes.portionOne"),
                  t("recipes.portionMany"),
                );
                return store
                  ? t("recipes.costNoteStore", { persons, store: store.name })
                  : t("recipes.costNote", { persons });
              })()}
            </div>
          </div>
        )}
      </Card>

      <RecipeNutrition items={recipe.items} ingredients={ingredients} />

      {/* Steps */}
      {recipe.steps.length > 0 && (
        <>
          <SectionTitle>{t("recipes.steps")}</SectionTitle>
          <Card className="p-4">
            <ol className="space-y-4">
              {recipe.steps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-carrot font-black text-white">
                    {i + 1}
                  </span>
                  <p className="pt-0.5 text-[17px] leading-relaxed">{step}</p>
                </li>
              ))}
            </ol>
          </Card>
        </>
      )}

      {recipe.sourceUrl && (
        <a
          href={recipe.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex min-h-11 items-center gap-2 px-1 font-bold text-carrot-dark"
        >
          <ExternalLink size={18} aria-hidden />
          {t("recipes.sourceOn", {
            site: new URL(recipe.sourceUrl).hostname.replace(/^www\./, ""),
          })}
        </a>
      )}

      {/* Actions */}
      <div className="mt-6 space-y-3">
        <Button size="lg" onClick={() => navigate(`/?plan=${recipe._id}`)}>
          <CalendarPlus size={22} />
          {t("recipes.plan")}
        </Button>
        <div className="grid gap-3">
          <Button variant="secondary" onClick={() => navigate(editPath)}>
            <Pencil size={18} />
            {t("recipes.edit")}
          </Button>
          <Button
            variant="secondary"
            onClick={async () => {
              const copyId = await run(
                () =>
                  duplicate({
                    token,
                    id: recipe._id,
                    memberId: memberId ?? undefined,
                  }),
                t("recipes.duplicated"),
              );
              if (copyId) {
                // The copy takes the original's place in history: saving the editor comes back to it
                navigate(`/recette/${copyId}`, { replace: true });
                navigate(`/recette/${copyId}/modifier`);
              }
            }}
          >
            <Copy size={18} />
            {t("recipes.duplicate")}
          </Button>
          {recipe.saved ? (
            <Button
              variant="secondary"
              onClick={() =>
                run(
                  () => setSaved({ token, id: recipe._id, saved: false }),
                  t("recipes.unsavedToast"),
                )
              }
            >
              <BookmarkMinus size={18} />
              {t("recipes.unsave")}
            </Button>
          ) : (
            <Button
              variant="herb"
              onClick={() =>
                run(
                  () => setSaved({ token, id: recipe._id, saved: true }),
                  t("recipes.savedToast"),
                )
              }
            >
              <BookmarkPlus size={18} />
              {t("recipes.save")}
            </Button>
          )}
        </div>
        <Button
          variant="ghost"
          className="w-full text-muted"
          onClick={() => setConfirmArchive(true)}
        >
          <Archive size={18} />
          {t("recipes.archiveRecipe")}
        </Button>
      </div>

      <Sheet
        open={confirmArchive}
        onClose={() => setConfirmArchive(false)}
        title={t("recipes.archiveConfirmTitle")}
        footer={
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="secondary"
              onClick={() => setConfirmArchive(false)}
            >
              {t("recipes.cancel")}
            </Button>
            <Button variant="danger" onClick={doArchive}>
              {t("recipes.archive")}
            </Button>
          </div>
        }
      >
        <p className="text-[17px]">
          {t("recipes.archiveConfirmText", { name: recipe.name })}
        </p>
      </Sheet>
    </Page>
  );
}
