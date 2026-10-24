import type { ReactNode } from "react";
import { Coffee, Moon, Sun } from "lucide-react";
import { cx } from "../ui";
import type { Slot } from "./data";

export const SLOT_OPTIONS: { value: Slot; label: ReactNode }[] = [
  {
    value: "matin",
    label: (
      <span className="inline-flex items-center gap-1.5">
        <Coffee size={18} aria-hidden /> Matin
      </span>
    ),
  },
  {
    value: "midi",
    label: (
      <span className="inline-flex items-center gap-1.5">
        <Sun size={18} aria-hidden /> Midi
      </span>
    ),
  },
  {
    value: "soir",
    label: (
      <span className="inline-flex items-center gap-1.5">
        <Moon size={18} aria-hidden /> Soir
      </span>
    ),
  },
];

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
