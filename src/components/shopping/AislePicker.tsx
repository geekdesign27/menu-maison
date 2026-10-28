import type { ReactNode } from "react";
import { Check, RotateCcw } from "lucide-react";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { cx } from "../ui";
import { useT } from "../../i18n/useT";

/**
 * Tappable list of aisles. `value` null means "usual aisle" (no store exception);
 * the first row resets to it when `usualAisleId` is given.
 */
export function AislePicker({
  aisles,
  value,
  usualAisleId,
  onPick,
}: {
  aisles: Doc<"aisles">[];
  value: Id<"aisles"> | null;
  usualAisleId?: Id<"aisles">;
  onPick: (aisleId: Id<"aisles"> | null) => void;
}) {
  const { t } = useT();
  const usual = aisles.find((a) => a._id === usualAisleId);
  return (
    <ul className="grid gap-1.5">
      {usual && (
        <li>
          <Row
            selected={value === null}
            onClick={() => onPick(null)}
            emoji={<RotateCcw size={20} />}
            label={t("shopping.usualAisle")}
            hint={`${usual.emoji} ${usual.name}`}
          />
        </li>
      )}
      {aisles.map((a) => (
        <li key={a._id}>
          <Row
            selected={value === a._id}
            onClick={() => onPick(a._id)}
            emoji={a.emoji}
            label={a.name}
          />
        </li>
      ))}
    </ul>
  );
}

function Row({
  selected,
  onClick,
  emoji,
  label,
  hint,
}: {
  selected: boolean;
  onClick: () => void;
  emoji: ReactNode;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cx(
        "flex min-h-14 w-full items-center gap-3 rounded-2xl px-4 text-left transition",
        selected
          ? "bg-carrot-soft ring-2 ring-carrot"
          : "bg-paper ring-1 ring-line active:bg-carrot-soft",
      )}
    >
      <span
        className="flex size-8 items-center justify-center text-2xl text-muted"
        aria-hidden
      >
        {emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[17px] font-extrabold">{label}</span>
        {hint && <span className="block text-[15px] text-muted">{hint}</span>}
      </span>
      {selected && <Check className="text-carrot-dark" size={22} />}
    </button>
  );
}
