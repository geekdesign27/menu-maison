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
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import { formatDayLong } from "../../convex/domain/dates";
import { formatQty, NBSP } from "../../convex/domain/quantities";
import { ingredientCost } from "../../convex/domain/shopping";
import { useBase, useSession, type Base } from "../lib/session";
import { useStoreChoice } from "../lib/week";
import { useRun } from "../lib/toast";
import { formatChf, minutes, portions } from "../lib/format";
import { BackButton } from "../components/Layout";
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
  const back = <BackButton fallback="/recettes" />;

  if (!recipes || !base) {
    return (
      <Page title="Recette" back={back}>
        <Loading label="Chargement de la recette" />
      </Page>
    );
  }
  // Looked up in the live list: a malformed or archived id simply shows "not found"
  const recipe = recipes.find((r) => r._id === id);
  if (!recipe) {
    return (
      <Page title="Recette" back={back}>
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
  const [count, setCount] = useState(recipe.defaultPersons ?? base.settings.defaultPersons);
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
      "Recette archivée",
    );
    if (done !== undefined) navigate("/recettes", { replace: true });
  };

  return (
    <Page
      title="Recette"
      back={<BackButton fallback="/recettes" />}
      action={
        <IconButton
          label="Modifier la recette"
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
          <img src={recipe.imageUrl} alt={`Photo\u00a0: ${recipe.name}`} className="size-full object-cover" />
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
            Se garde {recipe.fridgeDays}{" "}
            {recipe.fridgeDays > 1 ? "jours" : "jour"} au frigo
          </Badge>
        ) : (
          <Badge tone="berry">À manger tout de suite</Badge>
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
                aria-label={liked ? "Je n'aime plus" : "J'aime"}
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
          Touche ton portrait pour donner ton cœur.
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
              ? `Mangé ${stat.count12w} fois ces 12 dernières semaines, dernière fois le ${formatDayLong(stat.lastDate)}.`
              : stat
                ? `Pas mangé ces 12 dernières semaines, dernière fois le ${formatDayLong(stat.lastDate)}.`
                : "Pas encore au menu ces derniers mois."}
          </p>
        </div>
      )}

      {/* Ingredients */}
      <SectionTitle>Ingrédients</SectionTitle>
      <Card className="p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-lg font-black">Pour</span>
          <Stepper
            label="Nombre de portions"
            value={count}
            onChange={setCount}
            min={1}
            max={20}
          />
          <span className="w-24 text-right text-lg font-black">
            {count > 1 ? "portions" : "portion"}
          </span>
        </div>
        {recipe.items.length === 0 ? (
          <p className="mt-3 text-muted">Aucun ingrédient pour l'instant.</p>
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
                    {ing?.name ?? "Ingrédient supprimé"}
                  </span>
                  {cost !== undefined && cost >= 0.05 && (
                    <span className="text-[15px] text-muted tabular-nums">
                      {formatChf(cost)}
                    </span>
                  )}
                  <span className="min-w-20 text-right font-black text-carrot-dark tabular-nums">
                    {formatQty(item.qtyPerPerson * count, item.unit)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {totalCost && (
          <div className="mt-3 rounded-2xl bg-herb-soft px-4 py-3">
            <div className="flex items-center justify-between gap-2 font-black text-herb">
              <span>Coût estimé</span>
              <span className="tabular-nums">{totalCost}</span>
            </div>
            <div className="text-[15px] text-muted">
              Pour {portions(count)}
              {store ? `, prix indicatifs chez ${store.name}` : ""}.
            </div>
          </div>
        )}
      </Card>

      {/* Steps */}
      {recipe.steps.length > 0 && (
        <>
          <SectionTitle>Préparation</SectionTitle>
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

      {/* Actions */}
      <div className="mt-6 space-y-3">
        <Button size="lg" onClick={() => navigate(`/?plan=${recipe._id}`)}>
          <CalendarPlus size={22} />
          Planifier
        </Button>
        <div className="grid gap-3">
          <Button variant="secondary" onClick={() => navigate(editPath)}>
            <Pencil size={18} />
            Modifier
          </Button>
          <Button
            variant="secondary"
            onClick={async () => {
              const copyId = await run(
                () => duplicate({ token, id: recipe._id, memberId: memberId ?? undefined }),
                "Copie créée, tu peux l'adapter",
              );
              if (copyId) {
                // The copy takes the original's place in history: saving the editor comes back to it
                navigate(`/recette/${copyId}`, { replace: true });
                navigate(`/recette/${copyId}/modifier`);
              }
            }}
          >
            <Copy size={18} />
            Dupliquer
          </Button>
          {recipe.saved ? (
            <Button
              variant="secondary"
              onClick={() =>
                run(
                  () => setSaved({ token, id: recipe._id, saved: false }),
                  "Retirée de nos recettes",
                )
              }
            >
              <BookmarkMinus size={18} />
              Retirer de nos recettes
            </Button>
          ) : (
            <Button
              variant="herb"
              onClick={() =>
                run(
                  () => setSaved({ token, id: recipe._id, saved: true }),
                  "Gardée dans nos recettes",
                )
              }
            >
              <BookmarkPlus size={18} />
              Garder dans nos recettes
            </Button>
          )}
        </div>
        <Button
          variant="ghost"
          className="w-full text-muted"
          onClick={() => setConfirmArchive(true)}
        >
          <Archive size={18} />
          Archiver la recette
        </Button>
      </div>

      <Sheet
        open={confirmArchive}
        onClose={() => setConfirmArchive(false)}
        title={`Archiver cette recette${NBSP}?`}
        footer={
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="secondary"
              onClick={() => setConfirmArchive(false)}
            >
              Annuler
            </Button>
            <Button variant="danger" onClick={doArchive}>
              Archiver
            </Button>
          </div>
        }
      >
        <p className="text-[17px]">
          «{NBSP}
          {recipe.name}
          {NBSP}» disparaîtra des recettes. Les repas déjà passés la gardent
          dans l'historique.
        </p>
      </Sheet>
    </Page>
  );
}
