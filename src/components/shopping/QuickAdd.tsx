import { useMemo, useState, type FormEvent } from "react";
import { useMutation } from "convex/react";
import { Check, Plus, SlidersHorizontal, Star } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { Unit } from "../../../convex/domain/quantities";
import { useBase, useSession } from "../../lib/session";
import { useRun, useToast } from "../../lib/toast";
import { Button, Chip, IconButton, Sheet, TextInput } from "../ui";
import { parseAmount, unitChoiceLabel, UNITS } from "../../lib/units";
import { searchKey } from "../../lib/text";
import { StaplesSheet, useStaples, useToggleStaple } from "./StaplesSheet";

/** « Ajouter un article… » field, with a sheet for quantity, unit and aisle. */
export function QuickAdd({ start }: { start: string }) {
  const { token, memberId } = useSession();
  const addExtra = useMutation(api.shopping.addExtra);
  const run = useRun();
  const [label, setLabel] = useState("");
  // Quantity typed next to the field, applied to whatever is added (empty: none)
  const [qtyText, setQtyText] = useState("");
  const typedQty = () => {
    const n = parseAmount(qtyText);
    return n !== undefined && !Number.isNaN(n) ? n : undefined;
  };
  const reset = () => {
    setLabel("");
    setQtyText("");
  };
  const [sheetOpen, setSheetOpen] = useState(false);
  const [staplesOpen, setStaplesOpen] = useState(false);
  const base = useBase();
  const staples = useStaples(start);
  const toggleStaple = useToggleStaple(start);

  // Usual items first: what is typed is looked up in the assortment
  const suggestions = useMemo(() => {
    const q = searchKey(label);
    if (!q || !staples) return [];
    return staples.filter((s) => searchKey(s.name).includes(q)).slice(0, 6);
  }, [label, staples]);
  const exactMatch = suggestions.some((s) => searchKey(s.name) === searchKey(label));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    const qty = typedQty();
    const id = await run(() =>
      addExtra({
        token,
        start,
        label,
        memberId: memberId ?? undefined,
        ...(qty !== undefined ? { qty, unit: "pc" as const } : {}),
      }),
    );
    if (id) reset();
  };

  return (
    <>
      <form id="quick-add" onSubmit={submit} className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <TextInput
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ajouter un article…"
            aria-label="Ajouter un article"
            enterKeyHint="done"
            className="pr-12 font-bold"
          />
          <IconButton
            label="Quantité, unité et rayon"
            onClick={() => setSheetOpen(true)}
            className="absolute top-1/2 right-0.5 -translate-y-1/2 text-muted"
          >
            <SlidersHorizontal size={20} />
          </IconButton>
        </div>
        <input
          value={qtyText}
          onChange={(e) => setQtyText(e.target.value)}
          inputMode="decimal"
          placeholder="Qté"
          aria-label="Quantité de l'article ajouté"
          className="min-h-12 w-16 shrink-0 rounded-2xl bg-paper px-2 text-center font-bold ring-1 ring-line outline-none placeholder:text-muted/70 focus:ring-2 focus:ring-carrot"
        />
        <IconButton
          type="submit"
          label="Ajouter"
          disabled={!label.trim()}
          className="size-12 bg-carrot text-white shadow-sm active:bg-carrot-dark"
        >
          <Plus size={26} strokeWidth={3} />
        </IconButton>
      </form>

      {suggestions.length > 0 && (
        <ul className="mt-2 divide-y divide-line overflow-hidden rounded-2xl bg-paper shadow-md ring-1 ring-line" aria-label="Articles habituels correspondants">
          {suggestions.map((s) => {
            const aisle = base?.aisles.find((a) => a._id === s.aisleId);
            return (
              <li key={s._id}>
                <button
                  type="button"
                  disabled={!!s.extraId}
                  onClick={async () => {
                    if (await toggleStaple(s, typedQty())) reset();
                  }}
                  className="flex min-h-12 w-full items-center gap-3 px-4 py-2 text-left active:bg-carrot-soft disabled:opacity-60"
                >
                  <span className="text-xl" aria-hidden>
                    {aisle?.emoji ?? "🛒"}
                  </span>
                  <span className="min-w-0 flex-1 font-bold">{s.name}</span>
                  {s.extraId ? (
                    <span className="flex items-center gap-1 text-[13px] font-bold text-herb">
                      <Check size={16} /> Sur la liste
                    </span>
                  ) : (
                    <Plus size={20} className="text-carrot-dark" />
                  )}
                </button>
              </li>
            );
          })}
          {!exactMatch && (
            <li>
              <button type="submit" form="quick-add" className="flex min-h-12 w-full items-center gap-3 px-4 py-2 text-left text-carrot-dark active:bg-carrot-soft">
                <Plus size={20} />
                <span className="font-bold">Nouvel article : « {label.trim()} »</span>
              </button>
            </li>
          )}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setStaplesOpen(true)}
        className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-full bg-sun-soft px-4 font-extrabold text-[#6b4d00] active:brightness-95"
      >
        <Star size={18} /> Articles habituels
      </button>
      {staplesOpen && <StaplesSheet start={start} onClose={() => setStaplesOpen(false)} />}
      {sheetOpen && (
        <ExtraSheet
          start={start}
          initialLabel={label}
          onClose={() => setSheetOpen(false)}
          onAdded={() => setLabel("")}
        />
      )}
    </>
  );
}

function ExtraSheet({
  start,
  initialLabel,
  onClose,
  onAdded,
}: {
  start: string;
  initialLabel: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const base = useBase();
  const { token, memberId } = useSession();
  const addExtra = useMutation(api.shopping.addExtra);
  const run = useRun();
  const toast = useToast();
  const [label, setLabel] = useState(initialLabel);
  const [qtyText, setQtyText] = useState("");
  const [unit, setUnit] = useState<Unit>("pc");
  const [aisleId, setAisleId] = useState<Id<"aisles"> | undefined>();

  const save = async () => {
    const qty = parseAmount(qtyText);
    if (Number.isNaN(qty)) {
      toast("La quantité doit être un nombre positif.", "error");
      return;
    }
    const id = await run(
      () =>
        addExtra({
          token,
          start,
          label,
          qty,
          unit: qty !== undefined ? unit : undefined,
          aisleId,
          memberId: memberId ?? undefined,
        }),
      "Ajouté à la liste.",
    );
    if (id) {
      onAdded();
      onClose();
    }
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title="Ajouter un article"
      footer={
        <Button size="lg" onClick={save} disabled={!label.trim()}>
          <Plus size={22} /> Ajouter à la liste
        </Button>
      }
    >
      <div className="grid gap-4">
        <TextInput
          label="Article"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Lessive, café, piles…"
          autoFocus={!initialLabel}
        />
        <TextInput
          label="Quantité (facultatif)"
          value={qtyText}
          onChange={(e) => setQtyText(e.target.value)}
          inputMode="decimal"
          placeholder="Ex. 2"
        />
        {qtyText.trim() && (
          <div>
            <span className="mb-1 block text-[15px] font-bold">Unité</span>
            <div className="flex flex-wrap gap-2">
              {UNITS.map((u) => (
                <Chip key={u} selected={unit === u} onClick={() => setUnit(u)}>
                  {unitChoiceLabel(u)}
                </Chip>
              ))}
            </div>
          </div>
        )}
        <div>
          <span className="mb-1 block text-[15px] font-bold">Rayon</span>
          <div className="flex flex-wrap gap-2">
            <Chip
              selected={aisleId === undefined}
              onClick={() => setAisleId(undefined)}
            >
              🛒 Divers
            </Chip>
            {base?.aisles.map((a) => (
              <Chip
                key={a._id}
                selected={aisleId === a._id}
                onClick={() => setAisleId(a._id)}
              >
                {a.emoji} {a.name}
              </Chip>
            ))}
          </div>
        </div>
      </div>
    </Sheet>
  );
}
