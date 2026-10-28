import type { ReactNode } from "react";
import { Coffee, Moon, Sun } from "lucide-react";
import { cx } from "../ui";
import { useT } from "../../i18n/useT";
import { SLOTS, type Slot } from "./data";

const SLOT_ICONS = { matin: Coffee, midi: Sun, soir: Moon } as const;

/** Breakfast, lunch, dinner choices with their icon, in the member's language. */
export function useSlotOptions(): { value: Slot; label: ReactNode }[] {
  const { t } = useT();
  return SLOTS.map((value) => {
    const Icon = SLOT_ICONS[value];
    return {
      value,
      label: (
        <span className="inline-flex items-center gap-1.5">
          <Icon size={18} aria-hidden /> {t(`slot.${value}`)}
        </span>
      ),
    };
  });
}

/** Small uppercase label above a form control. */
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 text-[13px] font-extrabold tracking-wider text-muted uppercase">
        {label}
      </div>
      {children}
    </div>
  );
}

/** Large switch row: label, hint, and an iOS-like toggle. */
export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-11 w-full items-center gap-3 text-left"
    >
      <span className="min-w-0 flex-1">
        <span className="block font-extrabold">{label}</span>
        {hint && <span className="block text-[15px] text-muted">{hint}</span>}
      </span>
      <span
        className={cx(
          "relative h-8 w-14 shrink-0 rounded-full transition",
          checked ? "bg-herb" : "bg-line",
        )}
      >
        <span
          className={cx(
            "absolute top-1 size-6 rounded-full bg-white shadow transition-all",
            checked ? "left-7" : "left-1",
          )}
        />
      </span>
    </button>
  );
}
