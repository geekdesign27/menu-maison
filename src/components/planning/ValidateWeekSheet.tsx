import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { Check } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { ShoppingItem } from "../../../convex/domain/shopping";
import { useT } from "../../i18n/useT";
import { useSession } from "../../lib/session";
import { useStoreChoice } from "../../lib/week";
import { useRun } from "../../lib/toast";
import { plural } from "../../lib/format";
import { Button, cx, EmptyState, Loading, SectionTitle, Sheet } from "../ui";

/**
 * "Valider le menu de la semaine": every ingredient of the week once, with its
 * total quantity. Unticking an item means "we already have it": it leaves the
 * shopping list. Pantry items (spices, oil, rice…) come first, fresh food last.
 */
export function ValidateWeekSheet({
  open,
  onClose,
  start,
}: {
  open: boolean;
  onClose: () => void;
  start: string;
}) {
  const { t } = useT();
  return (
    <Sheet open={open} onClose={onClose} title={t("week.validate")}>
      {/* Mounted only while open, so the ticks start from the saved state each time */}
      {open && <ValidateWeekBody start={start} onDone={onClose} />}
    </Sheet>
  );
}

function ValidateWeekBody({
  start,
  onDone,
}: {
  start: string;
  onDone: () => void;
}) {
  const { token } = useSession();
  const { store } = useStoreChoice();
  const { t } = useT();
  const list = useQuery(
    api.shopping.list,
    token ? { token, start, storeId: store?._id } : "skip",
  );
  if (list === undefined) return <Loading label={t("week.computing")} />;
  return <Checklist start={start} list={list} onDone={onDone} />;
}

function Checklist({
  start,
  list,
  onDone,
}: {
  start: string;
  list: { sections: { items: ShoppingItem[] }[]; skipped: ShoppingItem[] };
  onDone: () => void;
}) {
  const { token } = useSession();
  const navigate = useNavigate();
  const { t, lang } = useT();
  const run = useRun();
  const setAtHome = useMutation(api.shopping.setAtHome);
  const [atHome, setAtHomeKeys] = useState(
    () => new Set(list.skipped.map((i) => i.key)),
  );
  const [saving, setSaving] = useState(false);

  const { pantry, fresh } = useMemo(() => {
    const all = [
      ...list.sections.flatMap((s) => s.items),
      ...list.skipped,
    ].filter((i) => !i.extra);
    all.sort((a, b) => a.label.localeCompare(b.label, lang));
    return {
      pantry: all.filter((i) => i.pantry),
      fresh: all.filter((i) => !i.pantry),
    };
  }, [list, lang]);

  const total = pantry.length + fresh.length;
  if (total === 0) {
    return (
      <EmptyState
        emoji="🍽️"
        title={t("week.noIngredientTitle")}
        text={t("week.noIngredientText")}
      />
    );
  }

  const toggle = (key: string) =>
    setAtHomeKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const toBuy =
    total - [...pantry, ...fresh].filter((i) => atHome.has(i.key)).length;

  async function save() {
    setSaving(true);
    const ok = await run(
      () => setAtHome({ token, start, itemKeys: [...atHome] }),
      t("week.listReady"),
    );
    setSaving(false);
    if (ok !== undefined) {
      onDone();
      navigate("/courses");
    }
  }

  return (
    <div>
      <p className="mt-1 text-[15px] text-muted">{t("week.validateIntro")}</p>

      {pantry.length > 0 && (
        <>
          <SectionTitle>{t("week.pantry")}</SectionTitle>
          <ItemList items={pantry} atHome={atHome} onToggle={toggle} />
        </>
      )}
      {fresh.length > 0 && (
        <>
          <SectionTitle>{t("week.fresh")}</SectionTitle>
          <ItemList items={fresh} atHome={atHome} onToggle={toggle} />
        </>
      )}

      <div className="sticky bottom-0 -mx-4 mt-4 bg-cream px-4 pt-3 pb-1">
        <Button size="lg" onClick={save} disabled={saving}>
          {saving
            ? t("week.saving")
            : t("week.validateButton", {
                articles: plural(
                  toBuy,
                  t("week.articleOne"),
                  t("week.articleMany"),
                ),
              })}
        </Button>
      </div>
    </div>
  );
}

function ItemList({
  items,
  atHome,
  onToggle,
}: {
  items: ShoppingItem[];
  atHome: Set<string>;
  onToggle: (key: string) => void;
}) {
  const { t } = useT();
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-paper shadow-sm">
      {items.map((item) => {
        const buy = !atHome.has(item.key);
        return (
          <li key={item.key}>
            <button
              type="button"
              role="checkbox"
              aria-checked={buy}
              onClick={() => onToggle(item.key)}
              className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left transition active:bg-carrot-soft"
            >
              <span
                className={cx(
                  "flex size-7 shrink-0 items-center justify-center rounded-full ring-2 transition",
                  buy
                    ? "bg-carrot text-white ring-carrot"
                    : "bg-paper text-transparent ring-line",
                )}
                aria-hidden
              >
                <Check size={18} strokeWidth={3} />
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cx(
                    "block font-bold",
                    !buy && "text-muted line-through",
                  )}
                >
                  {item.label}
                </span>
                {item.packDetail && (
                  <span className="block text-[13px] text-muted">
                    {item.packDetail}
                  </span>
                )}
                {!buy && (
                  <span className="block text-[13px] font-bold text-herb">
                    {t("week.atHome")}
                  </span>
                )}
              </span>
              <span
                className={cx(
                  "shrink-0 font-black tabular-nums",
                  buy ? "text-carrot-dark" : "text-muted",
                )}
              >
                {item.display}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
