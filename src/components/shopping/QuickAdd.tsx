import { useState, type FormEvent } from "react";
import { useMutation } from "convex/react";
import { Plus, SlidersHorizontal } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { Unit } from "../../../convex/domain/quantities";
import { useBase, useSession } from "../../lib/session";
import { useRun, useToast } from "../../lib/toast";
import { Button, Chip, IconButton, Sheet, TextInput } from "../ui";
import { parseAmount, unitChoiceLabel, UNITS } from "../../lib/units";

/** « Ajouter un article… » field, with a sheet for quantity, unit and aisle. */
export function QuickAdd({ start }: { start: string }) {
  const { token, memberId } = useSession();
  const addExtra = useMutation(api.shopping.addExtra);
  const run = useRun();
  const [label, setLabel] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    const id = await run(() =>
      addExtra({ token, start, label, memberId: memberId ?? undefined }),
    );
    if (id) setLabel("");
  };

  return (
    <>
      <form onSubmit={submit} className="flex items-center gap-2">
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
        <IconButton
          type="submit"
          label="Ajouter"
          disabled={!label.trim()}
          className="size-12 bg-carrot text-white shadow-sm active:bg-carrot-dark"
        >
          <Plus size={26} strokeWidth={3} />
        </IconButton>
      </form>
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
