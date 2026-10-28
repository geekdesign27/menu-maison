import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Check, Minus, Plus, Trash2 } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useBase, useSession } from "../../lib/session";
import { useRun } from "../../lib/toast";
import { Button, cx, EmptyState, IconButton, Loading, Sheet } from "../ui";
import { StapleSheet } from "./StapleSheet";
import { useT } from "../../i18n/useT";

export type Staple = NonNullable<ReturnType<typeof useStaples>>[number];

export function useStaples(start: string) {
  const { token } = useSession();
  return useQuery(api.staples.list, token ? { token, start } : "skip");
}

/** One tap adds a usual item to this week's list, a second tap removes it. */
export function useToggleStaple(start: string) {
  const { token, memberId } = useSession();
  const run = useRun();
  const addExtra = useMutation(api.shopping.addExtra);
  const removeExtra = useMutation(api.shopping.removeExtra);
  // `qty` set: added with that many pieces (else the item's usual quantity)
  return (staple: Staple, qty?: number) =>
    staple.extraId
      ? run(() => removeExtra({ token, id: staple.extraId! }))
      : run(() =>
          addExtra({
            token,
            start,
            label: staple.name,
            stapleId: staple._id,
            memberId: memberId ?? undefined,
            ...(qty !== undefined ? { qty, unit: "pc" as const } : {}),
          }),
        );
}

/** « Articles habituels »: the whole assortment by aisle, to pick this week's items quickly. */
export function StaplesSheet({
  start,
  onClose,
}: {
  start: string;
  onClose: () => void;
}) {
  const base = useBase();
  const { token } = useSession();
  const run = useRun();
  const staples = useStaples(start);
  const toggle = useToggleStaple(start);
  const removeStaple = useMutation(api.staples.remove);
  const [editing, setEditing] = useState(false);
  const [moving, setMoving] = useState<Staple | null>(null);
  const { t } = useT();

  const groups = (() => {
    if (!staples || !base) return [];
    const byAisle = new Map<Id<"aisles"> | null, Staple[]>();
    for (const s of staples) {
      const key =
        s.aisleId && base.aisles.some((a) => a._id === s.aisleId)
          ? s.aisleId
          : null;
      byAisle.set(key, [...(byAisle.get(key) ?? []), s]);
    }
    const ordered = base.aisles
      .filter((a) => byAisle.has(a._id))
      .map((a) => ({
        key: a._id as string,
        title: `${a.emoji} ${a.name}`,
        items: byAisle.get(a._id)!,
      }));
    const misc = byAisle.get(null);
    return misc
      ? [...ordered, { key: "divers", title: `🛒 ${t("shopping.misc")}`, items: misc }]
      : ordered;
  })();

  const addedCount = staples?.filter((s) => s.extraId).length ?? 0;

  return (
    <Sheet
      open
      onClose={onClose}
      title={t("shopping.staples")}
      footer={
        <Button size="lg" onClick={onClose}>
          {addedCount > 0
            ? t("shopping.staplesDone", { count: addedCount })
            : t("shopping.close")}
        </Button>
      }
    >
      {staples === undefined ? (
        <Loading />
      ) : staples.length === 0 ? (
        <EmptyState
          emoji="🧺"
          title={t("shopping.noStaplesTitle")}
          text={t("shopping.noStaplesText")}
        />
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[15px] text-muted">
              {editing
                ? t("shopping.staplesEditHelp")
                : t("shopping.staplesAddHelp")}
            </p>
            <button
              type="button"
              onClick={() => setEditing((e) => !e)}
              className="min-h-11 shrink-0 rounded-2xl px-3 font-extrabold text-carrot-dark active:bg-carrot-soft"
            >
              {editing ? t("shopping.editDone") : t("shopping.edit")}
            </button>
          </div>
          {groups.map((g) => (
            <section key={g.key} className="mt-4">
              <h3 className="mb-2 text-[13px] font-extrabold tracking-wider text-muted uppercase">
                {g.title}
              </h3>
              <div className="flex flex-wrap gap-2">
                {g.items.map((s) =>
                  editing ? (
                    <span
                      key={s._id}
                      className="inline-flex min-h-10 items-center gap-1 rounded-full bg-paper pl-1 ring-1 ring-line"
                    >
                      <button
                        type="button"
                        onClick={() => setMoving(s)}
                        aria-label={t("shopping.editNamed", { name: s.name })}
                        className="min-h-10 rounded-full px-3 font-bold underline decoration-line decoration-2 underline-offset-4 active:bg-carrot-soft"
                      >
                        {s.name}
                      </button>
                      <IconButton
                        label={t("shopping.removeFromRange", { name: s.name })}
                        onClick={() =>
                          run(
                            () => removeStaple({ token, id: s._id }),
                            t("shopping.removedFromRange", { name: s.name }),
                          )
                        }
                        className="size-10 text-berry"
                      >
                        <Trash2 size={18} />
                      </IconButton>
                    </span>
                  ) : (
                    <StapleChip key={s._id} staple={s} onToggle={() => toggle(s)} />
                  ),
                )}
              </div>
            </section>
          ))}
        </>
      )}
      {moving && <StapleSheet staple={moving} onClose={() => setMoving(null)} />}
    </Sheet>
  );
}

/** A usual item: tap to add or remove; once on the list, − n + sets how many. */
function StapleChip({ staple, onToggle }: { staple: Staple; onToggle: () => void }) {
  const { token } = useSession();
  const run = useRun();
  const setQty = useMutation(api.shopping.setExtraQty);
  const { t } = useT();
  const qty = staple.extraQty ?? 1;
  const change = (n: number) => staple.extraId && run(() => setQty({ token, id: staple.extraId!, qty: n, unit: "pc" }));
  const main = (
    <button
      type="button"
      aria-pressed={!!staple.extraId}
      onClick={onToggle}
      className={cx(
        "inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 font-bold transition",
        staple.extraId ? "bg-herb text-white" : "bg-paper text-ink ring-1 ring-line active:bg-carrot-soft",
      )}
    >
      {staple.extraId ? <Check size={18} strokeWidth={3} /> : <Plus size={18} />}
      {staple.name}
    </button>
  );
  if (!staple.extraId) return main;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-herb-soft pr-1">
      {main}
      <button
        type="button"
        aria-label={t("shopping.oneLess", { name: staple.name })}
        disabled={qty <= 1}
        onClick={() => change(qty - 1)}
        className="flex size-9 items-center justify-center rounded-full text-herb active:bg-paper disabled:opacity-40"
      >
        <Minus size={18} strokeWidth={3} />
      </button>
      <span className="min-w-6 text-center font-black text-herb tabular-nums">{qty}</span>
      <button
        type="button"
        aria-label={t("shopping.oneMore", { name: staple.name })}
        onClick={() => change(qty + 1)}
        className="flex size-9 items-center justify-center rounded-full text-herb active:bg-paper"
      >
        <Plus size={18} strokeWidth={3} />
      </button>
    </span>
  );
}
