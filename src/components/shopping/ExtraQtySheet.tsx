import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { ShoppingItem } from "../../../convex/domain/shopping";
import { formatQty } from "../../../convex/domain/quantities";
import { useSession } from "../../lib/session";
import { useRun } from "../../lib/toast";
import { Button, Sheet, Stepper } from "../ui";

/** Quantity of a free item, in pieces by default. A usual item keeps it for next time. */
export function ExtraQtySheet({
  item,
  onClose,
  onRemove,
}: {
  item: ShoppingItem;
  onClose: () => void;
  onRemove: () => void;
}) {
  const { token } = useSession();
  const run = useRun();
  const setQty = useMutation(api.shopping.setExtraQty);
  const unit = item.unit ?? "pc";
  const [qty, setQtyValue] = useState(Math.max(1, Math.round(item.qty ?? 1)));
  const id = item.key.slice("extra:".length) as Id<"shoppingExtras">;

  const save = async (value: number | null) => {
    const ok = await run(() => setQty({ token, id, qty: value, unit }));
    if (ok !== undefined) onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={item.label}
      footer={
        <Button size="lg" onClick={() => save(qty)}>
          Mettre {formatQty(qty, unit)}
        </Button>
      }
    >
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-paper px-4 py-3 ring-1 ring-line">
        <span className="font-bold">Quantité</span>
        <Stepper
          value={qty}
          onChange={setQtyValue}
          min={1}
          max={99}
          label="Quantité"
        />
      </div>
      <p className="mt-2 text-[15px] text-muted">
        {formatQty(qty, unit)}. La prochaine fois, cet article sera proposé avec
        cette quantité.
      </p>
      {item.qty !== undefined && (
        <button
          type="button"
          onClick={() => save(null)}
          className="mt-4 min-h-11 rounded-2xl px-3 font-extrabold text-carrot-dark active:bg-carrot-soft"
        >
          Sans quantité
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          onRemove();
          onClose();
        }}
        className="mt-2 block min-h-11 rounded-2xl px-3 font-extrabold text-berry active:bg-berry-soft"
      >
        Retirer de la liste
      </button>
    </Sheet>
  );
}
