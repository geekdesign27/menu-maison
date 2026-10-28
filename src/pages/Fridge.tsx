import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Link } from "react-router-dom";
import { CalendarPlus, Check, ChevronRight, Info, Trash } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { formatDayLong, formatDayShort } from "../../convex/domain/dates";
import type { Lang } from "../../convex/domain/lang";
import { translate } from "../i18n";
import { useT } from "../i18n/useT";
import { useSession } from "../lib/session";
import { useWeek } from "../lib/week";
import { useRun } from "../lib/toast";
import { plural } from "../lib/format";
import { PlanLeftoverSheet } from "../components/planning/PlanLeftoverSheet";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Loading,
  Page,
  SectionTitle,
} from "../components/ui";

type FridgeRow = FunctionReturnType<typeof api.meals.fridge>[number];

const KEEP_TONE = {
  bon: "herb",
  "aujourd'hui": "sun",
  périmé: "berry",
} as const;

function keepLabel(row: FridgeRow, lang: Lang) {
  const { state, until } = row.keep;
  const date = formatDayLong(until, lang);
  if (state === "aujourd'hui") return translate(lang, "shopping.fridge.eatToday");
  if (state === "périmé")
    return translate(lang, "shopping.fridge.expiredSince", { date });
  return translate(lang, "shopping.fridge.goodUntil", { date });
}

export function FridgePage() {
  const { token } = useSession();
  const { today } = useWeek();
  const { t } = useT();
  const rows = useQuery(api.meals.fridge, token ? { token, today } : "skip");
  const stock = useQuery(api.homeStock.list, token ? { token } : "skip");
  const [planning, setPlanning] = useState<FridgeRow | null>(null);
  const hasStock = !!stock && stock.items.length > 0;

  return (
    <Page title={t("nav.fridge")} subtitle={t("shopping.fridge.subtitle")}>
      {hasStock && <HomeStock stock={stock} />}
      {hasStock && <SectionTitle>{t("shopping.fridge.leftovers")}</SectionTitle>}
      {rows === undefined ? (
        <Loading label={t("shopping.fridge.loading")} />
      ) : rows.length === 0 ? (
        <Card className="mt-2">
          <EmptyState
            emoji="🧊"
            title={t("shopping.fridge.emptyTitle")}
            text={t("shopping.fridge.emptyText")}
          />
        </Card>
      ) : (
        <ul className="mt-2 space-y-3">
          {rows.map((row) => (
            <li key={row._id}>
              <FridgeCard row={row} onPlan={() => setPlanning(row)} />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 flex gap-3 rounded-[var(--radius-card)] bg-paper/70 p-4 text-[15px] text-muted ring-1 ring-line">
        <Info size={20} className="mt-0.5 shrink-0 text-carrot" aria-hidden />
        <p>{t("shopping.fridge.help")}</p>
      </div>

      <PlanLeftoverSheet source={planning} onClose={() => setPlanning(null)} />
    </Page>
  );
}

function FridgeCard({ row, onPlan }: { row: FridgeRow; onPlan: () => void }) {
  const { token } = useSession();
  const run = useRun();
  const discard = useMutation(api.meals.discardLeftover);
  const { t, lang } = useT();
  const name = row.recipe?.name ?? row.title ?? t("shopping.fridge.dish");
  const expired = row.keep.state === "périmé";
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <span
          className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-cream text-4xl"
          aria-hidden
        >
          {row.recipe?.emoji ?? "🍽️"}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-lg font-black">{name}</div>
          <div className="text-[15px] font-semibold text-muted">
            {t("shopping.fridge.cookedOn", {
              portions: plural(
                row.leftoverPortions,
                t("shopping.fridge.portionOne"),
                t("shopping.fridge.portionMany"),
              ),
              date: formatDayLong(row.cookedOn, lang),
            })}
          </div>
          <div className="mt-1.5">
            <Badge tone={KEEP_TONE[row.keep.state]}>{keepLabel(row, lang)}</Badge>
          </div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          variant={expired ? "secondary" : "herb"}
          onClick={onPlan}
          disabled={expired}
        >
          <CalendarPlus size={20} />
          {t("shopping.fridge.plan")}
        </Button>
        <Button
          variant={expired ? "primary" : "secondary"}
          onClick={() =>
            run(
              () => discard({ token, id: row._id }),
              t("shopping.fridge.removed"),
            )
          }
        >
          <Trash size={20} />
          {t("shopping.fridge.thrown")}
        </Button>
      </div>
    </Card>
  );
}

type Stock = FunctionReturnType<typeof api.homeStock.list>;

/** Ingredients bought for a dish that was not cooked, and recipes to use them up. */
function HomeStock({ stock }: { stock: Stock }) {
  const { token } = useSession();
  const run = useRun();
  const remove = useMutation(api.homeStock.remove);
  const { t, lang } = useT();
  return (
    <>
      <SectionTitle>{t("shopping.fridge.toUse")}</SectionTitle>
      <Card className="overflow-hidden">
        <ul className="divide-y divide-line">
          {stock.items.map((i) => (
            <li key={i._id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <div className="font-extrabold">
                  {i.name}{" "}
                  <span className="font-semibold text-muted">
                    · {i.display}
                  </span>
                </div>
                <div className="text-[15px] text-muted">
                  {i.from
                    ? t("shopping.fridge.sinceFrom", {
                        date: formatDayShort(i.since, lang),
                        from: i.from,
                      })
                    : t("shopping.fridge.since", {
                        date: formatDayShort(i.since, lang),
                      })}
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  run(
                    () => remove({ token, id: i._id }),
                    t("shopping.fridge.stockRemoved", { name: i.name }),
                  )
                }
              >
                <Check size={18} /> {t("shopping.fridge.usedOrThrown")}
              </Button>
            </li>
          ))}
        </ul>
      </Card>
      {stock.ideas.length > 0 && (
        <>
          <p className="mt-4 mb-2 text-[15px] font-bold text-muted">
            {t("shopping.fridge.ideas")}
          </p>
          <Card className="overflow-hidden">
            <ul className="divide-y divide-line">
              {stock.ideas.map((r) => (
                <li key={r._id}>
                  <Link
                    to={`/recette/${r._id}`}
                    className="flex min-h-14 items-center gap-3 px-3 py-2"
                  >
                    <span className="text-3xl" aria-hidden>
                      {r.emoji}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-extrabold">
                        {r.name}
                      </span>
                      <span className="block truncate text-[15px] text-muted">
                        {t("shopping.fridge.uses", {
                          // German nouns keep their capital letter
                          list:
                            lang === "de"
                              ? r.uses.join(", ")
                              : r.uses.join(", ").toLowerCase(),
                        })}
                      </span>
                    </span>
                    <ChevronRight size={20} className="shrink-0 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </>
  );
}
