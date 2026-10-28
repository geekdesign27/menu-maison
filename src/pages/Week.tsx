import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "convex/react";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Coffee,
  LayoutTemplate,
  Moon,
  Plus,
  ShoppingCart,
  Sun,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  daysBetween,
  formatDateRange,
  formatDayLong,
  weekDays,
  weekStart,
} from "../../convex/domain/dates";
import { useT } from "../i18n/useT";
import { useBase, useSession } from "../lib/session";
import { useStoreChoice, useWeek } from "../lib/week";
import { formatChf } from "../lib/format";
import { PlanMealSheet } from "../components/PlanMealSheet";
import { MealPill } from "../components/planning/MealPill";
import { MealSheet } from "../components/planning/MealSheet";
import { ValidateWeekSheet } from "../components/planning/ValidateWeekSheet";
import {
  capitalize,
  slotInText,
  SLOTS,
  useWeekMeals,
  type Slot,
  type WeekMeal,
} from "../components/planning/data";
import { usePricing, useRecipes } from "../lib/queries";
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
} from "../components/ui";

export function WeekPage() {
  const { start, end, isCurrent, prev, next, goToday } = useWeek();
  const { t, lang } = useT();
  const meals = useWeekMeals(start);
  const [searchParams, setSearchParams] = useSearchParams();
  const planParam = searchParams.get("plan") as Id<"recipes"> | null;
  const [plan, setPlan] = useState<{ date: string; slot: Slot } | null>(null);
  const [selectedId, setSelectedId] = useState<Id<"meals"> | null>(null);
  const [validating, setValidating] = useState(false);
  const selected = meals?.find((m) => m._id === selectedId) ?? null;

  const closePlan = () => {
    setPlan(null);
    if (planParam) setSearchParams({}, { replace: true });
  };

  return (
    <Page
      title={t("nav.week")}
      subtitle={formatDateRange(start, end, lang)}
      action={
        <div className="flex items-center">
          <IconButton label={t("week.prevWeek")} onClick={prev}>
            <ChevronLeft size={26} />
          </IconButton>
          <IconButton label={t("week.nextWeek")} onClick={next}>
            <ChevronRight size={26} />
          </IconButton>
          <Link
            to="/menus-types"
            aria-label={t("week.templates")}
            title={t("week.templates")}
            className="inline-flex size-11 items-center justify-center rounded-full bg-carrot-soft text-carrot-dark transition active:brightness-95"
          >
            <LayoutTemplate size={22} />
          </Link>
        </div>
      }
    >
      {!isCurrent && <OtherWeekBanner start={start} onToday={goToday} />}
      {meals === undefined ? (
        <Loading label={t("week.loading")} />
      ) : (
        <>
          <Summary meals={meals} />
          <WishesStrip />
          <SectionTitle>{t("week.onMenu")}</SectionTitle>
          <div className="space-y-3">
            {weekDays(start).map((date) => (
              <DayCard
                key={date}
                date={date}
                meals={meals.filter((m) => m.date === date)}
                onAdd={(slot) => setPlan({ date, slot })}
                onOpen={(id) => setSelectedId(id)}
              />
            ))}
          </div>
          {meals.some((m) => m.recipe && !m.fromLeftoverOf) && (
            <div className="mt-6">
              <Button
                size="lg"
                variant="herb"
                onClick={() => setValidating(true)}
              >
                <ClipboardCheck size={22} />
                {t("week.validate")}
              </Button>
              <p className="mt-2 text-center text-[15px] text-muted">
                {t("week.validateHint")}
              </p>
            </div>
          )}
        </>
      )}

      <PlanMealSheet
        open={!!plan || !!planParam}
        onClose={closePlan}
        date={plan?.date}
        slot={plan?.slot}
        recipeId={planParam ?? undefined}
      />
      <MealSheet meal={selected} onClose={() => setSelectedId(null)} />
      <ValidateWeekSheet
        open={validating}
        onClose={() => setValidating(false)}
        start={start}
      />
    </Page>
  );
}

function OtherWeekBanner({
  start,
  onToday,
}: {
  start: string;
  onToday: () => void;
}) {
  const base = useBase();
  const { today } = useWeek();
  const { t } = useT();
  const current = weekStart(today, base?.settings.shoppingDay ?? 6);
  const n = Math.round(daysBetween(current, start) / 7);
  const label =
    n === 1
      ? t("week.bannerNext")
      : n === -1
        ? t("week.bannerPrev")
        : n > 0
          ? t("week.bannerIn", { n })
          : t("week.bannerAgo", { n: -n });
  return (
    <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-sun-soft py-1.5 pr-1.5 pl-4">
      <span className="font-extrabold text-[#8a6200]">{label}</span>
      <Button variant="secondary" size="sm" onClick={onToday}>
        {t("week.today")}
      </Button>
    </div>
  );
}

function Summary({ meals }: { meals: WeekMeal[] }) {
  const recipes = useRecipes();
  const pricing = usePricing();
  const { store } = useStoreChoice();
  const { t } = useT();

  const cost = useMemo(() => {
    if (!recipes || !pricing.ready) return null;
    const byId = new Map(recipes.map((r) => [r._id, r]));
    let total = 0;
    for (const m of meals) {
      if (!m.recipeId || m.fromLeftoverOf) continue;
      const recipe = byId.get(m.recipeId);
      if (recipe) total += pricing.cost(recipe, m.persons).total;
    }
    return total;
  }, [meals, recipes, pricing]);

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-carrot-soft to-paper p-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-3xl font-black tabular-nums">{meals.length}</div>
          <div className="text-[15px] font-bold text-muted">
            {meals.length > 1 ? t("week.plannedMany") : t("week.plannedOne")}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-black tabular-nums">
            {cost === null
              ? "…"
              : t("week.approxCost", { amount: formatChf(cost) })}
          </div>
          <div className="text-[15px] font-bold text-muted">
            {store
              ? t("week.estimatedAt", { store: store.name })
              : t("week.estimatedCost")}
          </div>
        </div>
      </div>
      <Link
        to="/courses"
        className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-carrot px-4 font-extrabold text-white shadow-sm active:bg-carrot-dark"
      >
        <ShoppingCart size={20} />
        {t("week.shoppingList")}
      </Link>
    </Card>
  );
}

function WishesStrip() {
  const { token } = useSession();
  const base = useBase();
  const { t } = useT();
  const wishes = useQuery(api.wishes.list, token ? { token } : "skip");
  if (!wishes || !base) return null;
  const open = wishes.filter((w) => !w.done);
  const members = new Map(base.members.map((m) => [m._id, m]));
  return (
    <>
      <SectionTitle
        action={
          <Link
            to="/envies"
            className="inline-flex min-h-11 items-center px-1 text-[15px] font-extrabold text-carrot-dark"
          >
            {open.length > 0 ? t("week.seeAll") : t("week.add")}
          </Link>
        }
      >
        {t("week.wishes")}
      </SectionTitle>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {open.length === 0 ? (
          <Link
            to="/envies"
            className="flex min-h-12 items-center gap-2 rounded-full border-2 border-dashed border-line px-4 font-bold text-muted"
          >
            {t("week.wishPrompt")}
          </Link>
        ) : (
          open.map((w) => {
            const member = members.get(w.memberId);
            return (
              <Link
                key={w._id}
                to="/envies"
                className="flex min-h-12 max-w-[15rem] shrink-0 items-center gap-2 rounded-full bg-paper py-1 pr-4 pl-1 shadow-[0_2px_8px_rgba(43,36,32,0.06)]"
              >
                {member && <Avatar member={member} size={36} />}
                <span className="truncate font-bold">
                  {w.recipe ? `${w.recipe.emoji} ${w.recipe.name}` : w.text}
                </span>
              </Link>
            );
          })
        )}
      </div>
    </>
  );
}

function DayCard({
  date,
  meals,
  onAdd,
  onOpen,
}: {
  date: string;
  meals: WeekMeal[];
  onAdd: (slot: Slot) => void;
  onOpen: (id: Id<"meals">) => void;
}) {
  const { today, start } = useWeek();
  const { t, lang } = useT();
  const isToday = date === today;
  const past = date < today;
  return (
    <Card className={cx("p-3", isToday && "ring-2 ring-carrot")}>
      <div className="flex flex-wrap items-center gap-2 px-1 pb-1">
        <h3 className={cx("text-lg font-black", past && "text-muted")}>
          {capitalize(formatDayLong(date, lang))}
        </h3>
        {isToday && <Badge tone="carrot">{t("week.today")}</Badge>}
        {date === start && <Badge tone="herb">{t("week.shoppingDay")}</Badge>}
      </div>
      {SLOTS.map((slot) => {
        const list = meals.filter((m) => m.slot === slot);
        const Icon = slot === "matin" ? Coffee : slot === "midi" ? Sun : Moon;
        return (
          <div
            key={slot}
            className={cx(
              "flex gap-2 py-2",
              slot !== "matin" && "border-t border-line/70",
            )}
          >
            <div className="flex w-11 shrink-0 flex-col items-center pt-2.5 text-muted">
              <Icon size={18} aria-hidden />
              <span className="text-[13px] font-extrabold">
                {t(`slot.${slot}`)}
              </span>
            </div>
            <div className="min-w-0 flex-1 space-y-1.5" data-tour="slot-meals">
              {list.map((m) => (
                <MealPill key={m._id} meal={m} onClick={() => onOpen(m._id)} />
              ))}
              {list.length === 0 && (
                <button
                  type="button"
                  data-tour="add-meal"
                  onClick={() => onAdd(slot)}
                  className="flex min-h-14 w-full items-center gap-2 rounded-2xl border-2 border-dashed border-line px-3 font-bold text-muted transition active:bg-carrot-soft"
                >
                  <Plus size={20} aria-hidden />
                  {t("week.add")}
                </button>
              )}
            </div>
            {list.length > 0 && (
              <IconButton
                label={t("week.addDishSlot", { slot: slotInText(slot, lang) })}
                onClick={() => onAdd(slot)}
                className="self-center bg-carrot-soft text-carrot-dark"
              >
                <Plus size={22} />
              </IconButton>
            )}
          </div>
        );
      })}
    </Card>
  );
}
