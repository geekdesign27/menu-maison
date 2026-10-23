import { useState, type ReactNode } from "react";
import { Button, Sheet } from "../ui";

/** Bottom sheet asking to confirm an action that cannot be undone in one tap. */
export function ConfirmSheet({
  open,
  onClose,
  title,
  text,
  confirmLabel,
  danger,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  text: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => Promise<unknown>;
}) {
  const [busy, setBusy] = useState(false);
  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
      onClose();
    }
  };
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <p className="text-[17px] text-ink">{text}</p>
      <div className="mt-5 grid gap-2">
        <Button
          size="lg"
          variant={danger ? "danger" : "primary"}
          disabled={busy}
          onClick={confirm}
        >
          {confirmLabel}
        </Button>
        <Button size="lg" variant="secondary" onClick={onClose}>
          Annuler
        </Button>
      </div>
    </Sheet>
  );
}
