import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Check, Plus, Trash2 } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useBase, useSession } from "../../lib/session";
import { useRun } from "../../lib/toast";
import { Button, cx, EmptyState, IconButton, Loading, Sheet } from "../ui";

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
  return (staple: Staple) =>
    staple.extraId
      ? run(() => removeExtra({ token, id: staple.extraId! }))
      : run(() =>
          addExtra({
            token,
            start,
            label: staple.name,
            stapleId: staple._id,
            memberId: memberId ?? undefined,
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
      ? [...ordered, { key: "divers", title: "🛒 Divers", items: misc }]
      : ordered;
  })();

  const addedCount = staples?.filter((s) => s.extraId).length ?? 0;

  return (
    <Sheet
      open
      onClose={onClose}
      title="Articles habituels"
      footer={
        <Button size="lg" onClick={onClose}>
          {addedCount > 0 ? `C'est bon (${addedCount} sur la liste)` : "Fermer"}
        </Button>
      }
    >
      {staples === undefined ? (
        <Loading />
      ) : staples.length === 0 ? (
        <EmptyState
          emoji="🧺"
          title="Aucun article habituel"
          text="Ajoute un article depuis la liste de courses : il sera retenu ici."
        />
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[15px] text-muted">
              {editing
                ? "Touche la corbeille pour retirer un article de l'assortiment."
                : "Touche un article pour l'ajouter à la liste de cette semaine."}
            </p>
            <button
              type="button"
              onClick={() => setEditing((e) => !e)}
              className="min-h-11 shrink-0 rounded-2xl px-3 font-extrabold text-carrot-dark active:bg-carrot-soft"
            >
              {editing ? "Terminé" : "Modifier"}
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
                      className="inline-flex min-h-10 items-center gap-1 rounded-full bg-paper pl-4 ring-1 ring-line"
                    >
                      <span className="font-bold">{s.name}</span>
                      <IconButton
                        label={`Retirer de l'assortiment : ${s.name}`}
                        onClick={() =>
                          run(
                            () => removeStaple({ token, id: s._id }),
                            `${s.name} retiré de l'assortiment`,
                          )
                        }
                        className="size-10 text-berry"
                      >
                        <Trash2 size={18} />
                      </IconButton>
                    </span>
                  ) : (
                    <button
                      key={s._id}
                      type="button"
                      aria-pressed={!!s.extraId}
                      onClick={() => toggle(s)}
                      className={cx(
                        "inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 font-bold transition",
                        s.extraId
                          ? "bg-herb text-white"
                          : "bg-paper text-ink ring-1 ring-line active:bg-carrot-soft",
                      )}
                    >
                      {s.extraId ? (
                        <Check size={18} strokeWidth={3} />
                      ) : (
                        <Plus size={18} />
                      )}
                      {s.name}
                    </button>
                  ),
                )}
              </div>
            </section>
          ))}
        </>
      )}
    </Sheet>
  );
}
