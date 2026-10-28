import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  ScanLine,
  Settings2,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { formatDateRange } from "../../convex/domain/dates";
import { compareItems, type ShoppingItem } from "../../convex/domain/shopping";
import { useBase, useSession, type Member } from "../lib/session";
import { useStoreChoice, useWeek } from "../lib/week";
import { useRun } from "../lib/toast";
import { formatChf, plural } from "../lib/format";
import {
  Badge,
  Button,
  Card,
  Chip,
  cx,
  EmptyState,
  IconButton,
  Loading,
  Page,
  Segmented,
  Sheet,
} from "../components/ui";
import { ChainMark } from "../components/shopping/chains";
import { ShoppingRow } from "../components/shopping/ShoppingRow";
import { QuickAdd } from "../components/shopping/QuickAdd";
import { AislePicker } from "../components/shopping/AislePicker";
import { ConfirmSheet } from "../components/shopping/ConfirmSheet";
import { ExtraQtySheet } from "../components/shopping/ExtraQtySheet";
import { useT } from "../i18n/useT";

type Filter = "all" | "todo";
const FILTER_KEY = "mm.shoppingFilter";

function readFilter(): Filter {
  try {
    return localStorage.getItem(FILTER_KEY) === "todo" ? "todo" : "all";
  } catch {
    return "all";
  }
}

function saveFilter(filter: Filter) {
  try {
    localStorage.setItem(FILTER_KEY, filter);
  } catch {
    // Private mode: the choice lasts as long as the screen
  }
}

export function ShoppingPage() {
  const { token, memberId } = useSession();
  const base = useBase();
  const week = useWeek();
  const { store, stores, choose } = useStoreChoice();
  const navigate = useNavigate();
  const run = useRun();
  const { t, lang } = useT();
  const [filter, setFilter] = useState<Filter>(readFilter);
  const [moreItem, setMoreItem] = useState<ShoppingItem | null>(null);
  const [qtyItem, setQtyItem] = useState<ShoppingItem | null>(null);
  const [photoItem, setPhotoItem] = useState<ShoppingItem | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const list = useQuery(
    api.shopping.list,
    token ? { token, start: week.start, storeId: store?._id } : "skip",
  );

  const toggle = useMutation(api.shopping.toggle).withOptimisticUpdate(
    (local, args) => {
      for (const q of local.getAllQueries(api.shopping.list)) {
        if (!q.value || q.args.start !== args.start) continue;
        const sections = q.value.sections.map((s) =>
          s.items.some((i) => i.key === args.itemKey)
            ? {
                ...s,
                items: s.items
                  .map((i) =>
                    i.key === args.itemKey
                      ? { ...i, checked: args.checked }
                      : i,
                  )
                  .sort(compareItems),
              }
            : s,
        );
        const checkedBy = { ...q.value.checkedBy };
        if (args.checked) checkedBy[args.itemKey] = args.memberId;
        else delete checkedBy[args.itemKey];
        local.setQuery(api.shopping.list, q.args, {
          ...q.value,
          sections,
          checkedBy,
          remaining: sections.flatMap((s) => s.items).filter((i) => !i.checked)
            .length,
        });
      }
    },
  );
  const removeExtra = useMutation(api.shopping.removeExtra);
  const resetChecks = useMutation(api.shopping.resetChecks);

  const members = useMemo(
    () => new Map<string, Member>((base?.members ?? []).map((m) => [m._id, m])),
    [base],
  );

  const changeFilter = (f: Filter) => {
    setFilter(f);
    saveFilter(f);
  };

  const onToggle = (item: ShoppingItem) =>
    run(() =>
      toggle({
        token,
        start: week.start,
        itemKey: item.key,
        checked: !item.checked,
        memberId: memberId ?? undefined,
      }),
    );

  const onRemove = (item: ShoppingItem) =>
    run(
      () =>
        removeExtra({
          token,
          id: item.key.slice("extra:".length) as Id<"shoppingExtras">,
        }),
      t("shopping.removed", { label: item.label }),
    );

  const weekNav = (
    <div className="flex items-center">
      <IconButton label={t("shopping.prevWeek")} onClick={week.prev}>
        <ChevronLeft size={24} />
      </IconButton>
      <IconButton label={t("shopping.nextWeek")} onClick={week.next}>
        <ChevronRight size={24} />
      </IconButton>
    </div>
  );

  const checkedCount = list ? list.total - list.remaining : 0;
  const visibleSections = list
    ? list.sections
        .map((s) => ({
          ...s,
          items:
            filter === "todo" ? s.items.filter((i) => !i.checked) : s.items,
          done: s.items.filter((i) => i.checked).length,
          count: s.items.length,
        }))
        .filter((s) => s.items.length > 0)
    : [];

  return (
    <Page
      title={t("nav.shopping")}
      subtitle={formatDateRange(week.start, week.end, lang)}
      action={weekNav}
    >
      {!week.isCurrent && (
        <button
          type="button"
          onClick={week.goToday}
          className="mb-3 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-sun-soft px-4 font-extrabold text-[#8a6200]"
        >
          <CalendarDays size={18} /> {t("shopping.backToThisWeek")}
        </button>
      )}

      <StoreChips stores={stores} currentId={store?._id} onChoose={choose} />

      {!list || !base ? (
        <Loading label={t("shopping.loadingList")} />
      ) : (
        <>
          {list.total > 0 && (
            <Progress
              checked={checkedCount}
              total={list.total}
              costChf={list.costChf}
            />
          )}

          <div className="mt-4">
            <QuickAdd start={week.start} />
          </div>

          {list.total === 0 ? (
            list.mealCount === 0 ? (
              <EmptyState
                emoji="🧺"
                title={t("shopping.noMealsTitle")}
                text={t("shopping.noMealsText")}
                action={
                  <Link
                    to="/"
                    className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-carrot px-4 font-extrabold text-white shadow-sm active:bg-carrot-dark"
                  >
                    <CalendarDays size={20} /> {t("shopping.planWeek")}
                  </Link>
                }
              />
            ) : (
              <EmptyState
                emoji="🧺"
                title={t("shopping.nothingTitle")}
                text={t("shopping.nothingText")}
              />
            )
          ) : (
            <>
              <div className="mt-4">
                <Segmented
                  label={t("shopping.filterLabel")}
                  value={filter}
                  onChange={changeFilter}
                  options={[
                    { value: "all", label: t("shopping.filterAll") },
                    {
                      value: "todo",
                      label: t("shopping.filterTodo", {
                        count: list.remaining,
                      }),
                    },
                  ]}
                />
              </div>

              {list.remaining === 0 && (
                <Card className="mt-4 flex flex-col items-center bg-herb-soft px-6 py-8 text-center">
                  <span className="text-5xl" aria-hidden>
                    🛒
                  </span>
                  <p className="mt-2 text-xl font-black text-herb">
                    {t("shopping.allInCart")}
                  </p>
                  <p className="mt-1 text-[15px] font-semibold text-muted">
                    {t("shopping.allInCartText")}
                  </p>
                </Card>
              )}

              {visibleSections.map((section) => (
                <section
                  key={section.elsewhere ? section.name : (section.aisleId ?? "divers")}
                  className={section.elsewhere ? "mt-10" : "mt-6"}
                >
                  <div className="mb-2 flex items-center gap-2 px-1">
                    <span className="text-2xl" aria-hidden>
                      {section.emoji}
                    </span>
                    <h2
                      className={cx(
                        "min-w-0 flex-1 truncate text-lg font-black",
                        section.elsewhere && "text-berry",
                      )}
                    >
                      {section.name}
                    </h2>
                    {section.done === section.count ? (
                      <Badge tone="herb">
                        <Check size={14} strokeWidth={3} /> {section.count}
                      </Badge>
                    ) : (
                      <Badge>
                        {section.done}/{section.count}
                      </Badge>
                    )}
                  </div>
                  <Card className="overflow-hidden">
                    <ul className="divide-y divide-line">
                      {section.items.map((item) => (
                        <ShoppingRow
                          key={item.key}
                          item={item}
                          checker={
                            item.checked
                              ? members.get(list.checkedBy[item.key] ?? "")
                              : undefined
                          }
                          onToggle={() => onToggle(item)}
                          onPhoto={() => setPhotoItem(item)}
                          onMore={
                            item.extra
                              ? () => setQtyItem(item)
                              : store
                                ? () => setMoreItem(item)
                                : undefined
                          }
                        />
                      ))}
                    </ul>
                  </Card>
                </section>
              ))}

              {list.skipped.length > 0 && <AtHomeSection start={week.start} items={list.skipped} />}

              <div className="mt-8 flex justify-center">
                <Button variant="secondary" onClick={() => navigate("/courses/ticket")}>
                  <ScanLine size={18} /> {t("shopping.scanReceipt")}
                </Button>
              </div>

              {checkedCount > 0 && (
                <div className="mt-3 flex justify-center">
                  <Button
                    variant="secondary"
                    onClick={() => setConfirmReset(true)}
                  >
                    <RotateCcw size={18} /> {t("shopping.uncheckAll")}
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {qtyItem && <ExtraQtySheet item={qtyItem} onClose={() => setQtyItem(null)} onRemove={() => onRemove(qtyItem)} />}
      {/* Product photo in large, to pick the right brand or size on the shelf */}
      <Sheet open={!!photoItem} onClose={() => setPhotoItem(null)} title={photoItem?.label ?? ""}>
        {photoItem?.imageUrl && (
          <img src={photoItem.imageUrl} alt={t("shopping.photoAlt", { label: photoItem.label })} className="w-full rounded-[var(--radius-card)] object-contain" />
        )}
        {photoItem?.display && <p className="mt-3 text-center text-lg font-black text-carrot-dark">{photoItem.display}</p>}
      </Sheet>
      {moreItem && store && base && (
        <AisleOverrideSheet
          item={moreItem}
          storeId={store._id}
          storeName={store.name}
          onClose={() => setMoreItem(null)}
        />
      )}

      <ConfirmSheet
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title={t("shopping.uncheckAllTitle")}
        text={t("shopping.uncheckAllText", {
          items: plural(
            checkedCount,
            t("shopping.checkedOne"),
            t("shopping.checkedMany"),
          ),
        })}
        confirmLabel={t("shopping.uncheckAll")}
        onConfirm={() =>
          run(
            () => resetChecks({ token, start: week.start }),
            t("shopping.listReset"),
          )
        }
      />
    </Page>
  );
}

function StoreChips({
  stores,
  currentId,
  onChoose,
}: {
  stores: ReturnType<typeof useStoreChoice>["stores"];
  currentId?: string;
  onChoose: (id: string) => void;
}) {
  const { t } = useT();
  return (
    <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1" data-tour="stores">
      {stores.map((s) => (
        <Chip
          key={s._id}
          selected={s._id === currentId}
          onClick={() => onChoose(s._id)}
          className="min-h-11 pl-1.5"
        >
          <ChainMark chain={s.chain} size={30} />
          {s.name}
        </Chip>
      ))}
      <Link
        to="/magasins"
        className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-[15px] font-extrabold whitespace-nowrap text-carrot-dark active:bg-carrot-soft"
      >
        <Settings2 size={18} />
        {stores.length ? t("shopping.manageStores") : t("shopping.addStore")}
      </Link>
    </div>
  );
}

function Progress({
  checked,
  total,
  costChf,
}: {
  checked: number;
  total: number;
  costChf: number;
}) {
  const { t } = useT();
  const pct = Math.round((checked / total) * 100);
  const remaining = total - checked;
  return (
    <Card className="mt-4 p-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-3xl leading-none font-black tabular-nums">
            {checked}
            <span className="text-xl text-muted"> / {total}</span>
          </div>
          <div className="mt-1 text-[15px] font-bold text-muted">
            {remaining
              ? t("shopping.toTake", {
                  items: plural(
                    remaining,
                    t("shopping.itemOne"),
                    t("shopping.itemMany"),
                  ),
                })
              : t("shopping.allTaken")}
          </div>
        </div>
        {costChf > 0 && (
          <div className="text-right">
            <div className="text-[13px] font-extrabold tracking-wider text-muted uppercase">
              {t("shopping.estimatedCost")}
            </div>
            <div className="text-xl font-black whitespace-nowrap tabular-nums">
              {t("shopping.approx", { amount: formatChf(costChf) })}
            </div>
          </div>
        )}
      </div>
      <div
        role="progressbar"
        aria-label={t("shopping.progressLabel")}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={checked}
        className="mt-3 h-3 overflow-hidden rounded-full bg-line/70"
      >
        <div
          className={cx(
            "h-full rounded-full transition-[width] duration-300",
            remaining ? "bg-carrot" : "bg-herb",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </Card>
  );
}

function AisleOverrideSheet({
  item,
  storeId,
  storeName,
  onClose,
}: {
  item: ShoppingItem;
  storeId: Id<"stores">;
  storeName: string;
  onClose: () => void;
}) {
  const { token } = useSession();
  const base = useBase();
  const run = useRun();
  const setOverride = useMutation(api.catalog.setOverride);
  const { t } = useT();
  if (!base || !item.ingredientId) return null;
  const ingredientId = item.ingredientId as Id<"ingredients">;
  const ingredient = base.ingredients.find((i) => i._id === ingredientId);
  const store = base.stores.find((s) => s._id === storeId);
  const current =
    store?.overrides.find((o) => o.ingredientId === ingredientId)?.aisleId ??
    null;

  const pick = async (aisleId: Id<"aisles"> | null) => {
    onClose();
    await run(
      () => setOverride({ token, storeId, ingredientId, aisleId }),
      t("shopping.overrideSaved", { store: storeName }),
    );
  };

  return (
    <Sheet open onClose={onClose} title={item.label}>
      <p className="mb-3 text-[17px]">
        {t("shopping.overrideQuestion", { store: storeName })}
      </p>
      <AislePicker
        aisles={base.aisles}
        value={current}
        usualAisleId={ingredient?.aisleId}
        onPick={pick}
      />
    </Sheet>
  );
}

/** Items marked "already at home" when validating the week: one tap puts them back. */
function AtHomeSection({ start, items }: { start: string; items: ShoppingItem[] }) {
  const { token } = useSession();
  const run = useRun();
  const setOne = useMutation(api.shopping.setOneAtHome);
  const [open, setOpen] = useState(false);
  const { t } = useT();
  return (
    <section className="mt-8">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-12 w-full items-center gap-2 rounded-2xl px-1 text-left"
      >
        <span className="text-2xl" aria-hidden>
          🏠
        </span>
        <span className="min-w-0 flex-1 text-lg font-black">{t("shopping.atHome")}</span>
        <Badge tone="herb">{items.length}</Badge>
        <ChevronDown size={22} className={open ? "rotate-180 text-muted transition" : "text-muted transition"} />
      </button>
      {open && (
        <Card className="mt-2 overflow-hidden">
          <ul className="divide-y divide-line">
            {items.map((item) => (
              <li key={item.key} className="flex min-h-14 items-center gap-3 px-4 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-muted">{item.label}</span>
                  <span className="block text-[13px] text-muted">{item.display}</span>
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => run(() => setOne({ token, start, itemKey: item.key, atHome: false }), t("shopping.putBackDone", { label: item.label }))}
                >
                  {t("shopping.putBack")}
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}
