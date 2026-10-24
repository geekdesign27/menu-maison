import {
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { ChevronDown, Minus, Plus, Search, X } from "lucide-react";
import type { Member } from "../lib/session";
import { useInGestion } from "../lib/paths";

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

// ---------- Layout ----------

/** Screen with a sticky title bar. `action` sits on the right of the title. */
export function Page({
  title,
  subtitle,
  action,
  back,
  wide,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  back?: ReactNode;
  /** Wider page for the desktop management area. */
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cx("mx-auto pb-28", wide ? "max-w-7xl" : "max-w-2xl")}>
      <header className="pt-safe sticky top-0 z-20 bg-cream/90 backdrop-blur">
        <div className="flex min-h-16 items-center gap-2 px-4 py-2">
          {back}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-black tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <div className="truncate text-[15px] font-semibold text-muted">
                {subtitle}
              </div>
            )}
          </div>
          {action}
        </div>
      </header>
      <div className="px-4">{children}</div>
    </div>
  );
}

export function Card({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const base =
    "rounded-[var(--radius-card)] bg-paper shadow-[0_1px_0_rgba(43,36,32,0.04),0_4px_14px_rgba(43,36,32,0.06)]";
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cx(
          base,
          "block w-full text-left transition active:scale-[0.99]",
          className,
        )}
      >
        {children}
      </button>
    );
  }
  return <div className={cx(base, className)}>{children}</div>;
}

export function SectionTitle({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mt-6 mb-2 flex items-center justify-between gap-2">
      <h2 className="text-[13px] font-extrabold tracking-wider text-muted uppercase">
        {children}
      </h2>
      {action}
    </div>
  );
}

// ---------- Controls ----------

type Variant = "primary" | "secondary" | "ghost" | "danger" | "herb";
const variants: Record<Variant, string> = {
  primary: "bg-carrot text-white active:bg-carrot-dark shadow-sm",
  herb: "bg-herb text-white active:brightness-95 shadow-sm",
  secondary: "bg-paper text-ink ring-1 ring-line active:bg-carrot-soft",
  ghost: "text-carrot-dark active:bg-carrot-soft",
  danger: "bg-berry-soft text-berry active:brightness-95",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <button
      type="button"
      {...rest}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-2xl font-extrabold transition disabled:opacity-50",
        size === "sm" && "min-h-10 px-3 text-[15px]",
        size === "md" && "min-h-12 px-4",
        size === "lg" && "min-h-14 w-full px-5 text-lg",
        variants[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

export function IconButton({
  label,
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className={cx(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink transition active:bg-carrot-soft disabled:opacity-40",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Chip({
  selected,
  children,
  onClick,
  className,
}: {
  selected?: boolean;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cx(
        "inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-[15px] font-bold whitespace-nowrap transition",
        selected
          ? "bg-ink text-white"
          : "bg-paper text-ink ring-1 ring-line active:bg-carrot-soft",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "carrot" | "herb" | "berry" | "sun";
  children: ReactNode;
}) {
  const tones = {
    neutral: "bg-line/70 text-ink",
    carrot: "bg-carrot-soft text-carrot-dark",
    herb: "bg-herb-soft text-herb",
    berry: "bg-berry-soft text-berry",
    sun: "bg-sun-soft text-[#8a6200]",
  };
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[13px] font-extrabold",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function Avatar({
  member,
  size = 32,
  className,
}: {
  member: Pick<Member, "name" | "emoji" | "color"> & { imageUrl?: string | null };
  size?: number;
  className?: string;
}) {
  return (
    <span
      title={member.name}
      aria-label={member.name}
      className={cx(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ring-2 ring-paper",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: member.color,
        fontSize: size * 0.55,
      }}
    >
      {member.imageUrl ? <img src={member.imageUrl} alt="" className="size-full object-cover" /> : member.emoji}
    </span>
  );
}

export function Stepper({
  value,
  onChange,
  min = 1,
  max = 30,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label={label}>
      <IconButton
        label={`Moins (${label})`}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="bg-paper ring-1 ring-line"
      >
        <Minus size={20} />
      </IconButton>
      <span
        className="min-w-10 text-center text-xl font-black tabular-nums"
        aria-live="polite"
      >
        {value}
      </span>
      <IconButton
        label={`Plus (${label})`}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="bg-paper ring-1 ring-line"
      >
        <Plus size={20} />
      </IconButton>
    </div>
  );
}

export function TextInput({
  label,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  const input = (
    <input
      {...rest}
      className={cx(
        "min-h-12 w-full rounded-2xl bg-paper px-4 ring-1 ring-line outline-none placeholder:text-muted/70 focus:ring-2 focus:ring-carrot",
        className,
      )}
    />
  );
  if (!label) return input;
  return (
    <label className="block">
      <span className="mb-1 block text-[15px] font-bold">{label}</span>
      {input}
    </label>
  );
}

/** Native select with the app's look; `label` is optional, like `TextInput`. */
export function Select({
  label,
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  children: ReactNode;
}) {
  const select = (
    <span className="relative block w-full">
      <select
        {...rest}
        className={cx(
          "min-h-12 w-full appearance-none rounded-2xl bg-paper pr-11 pl-4 ring-1 ring-line outline-none focus:ring-2 focus:ring-carrot",
          className,
        )}
      >
        {children}
      </select>
      <ChevronDown
        size={20}
        className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-muted"
      />
    </span>
  );
  if (!label) return select;
  return (
    <label className="block">
      <span className="mb-1 block text-[15px] font-bold">{label}</span>
      {select}
    </label>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Rechercher",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <Search
        size={20}
        className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-h-12 w-full rounded-2xl bg-paper pr-11 pl-11 ring-1 ring-line outline-none focus:ring-2 focus:ring-carrot"
      />
      {value && (
        <button
          type="button"
          aria-label="Effacer la recherche"
          onClick={() => onChange("")}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-2 text-muted"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
}

/** Segmented control for 2 to 4 options. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex rounded-2xl bg-line/60 p-1"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            "min-h-10 flex-1 rounded-xl px-3 text-[15px] font-extrabold transition",
            value === o.value ? "bg-paper text-ink shadow-sm" : "text-muted",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ---------- Overlays ----------

// Open sheets, topmost last: stacked sheets must not all close on Escape
const openSheets: symbol[] = [];

/** Bottom sheet, the main pattern for actions on a phone. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  // Latest onClose kept in a ref: callers often pass a new arrow on every
  // render, which must not re-run the effect and reorder the sheet stack
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const id = Symbol("sheet");
    openSheets.push(id);
    // Only the topmost sheet reacts to Escape
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" &&
      openSheets[openSheets.length - 1] === id &&
      onCloseRef.current();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      openSheets.splice(openSheets.indexOf(id), 1);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);
  // On the desktop management area, sheets open as a side panel on the right
  const side = useInGestion();
  if (!open) return null;
  return (
    <div
      className={cx(
        "fixed inset-0 z-40 flex",
        side ? "justify-end" : "items-end justify-center",
      )}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label="Fermer"
        className="absolute inset-0 bg-ink/40"
        onClick={onClose}
      />
      <div
        className={cx(
          "relative flex w-full flex-col bg-cream shadow-2xl",
          side
            ? "animate-panel h-full max-w-lg"
            : "animate-sheet pb-safe max-h-[92dvh] max-w-2xl rounded-t-[1.75rem]",
        )}
      >
        <div className="flex items-center gap-2 px-4 pt-3 pb-2">
          <h2 className="min-w-0 flex-1 truncate text-xl font-black">
            {title}
          </h2>
          <IconButton label="Fermer" onClick={onClose}>
            <X size={22} />
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4">{children}</div>
        {footer && (
          <div className="border-t border-line px-4 pt-3">{footer}</div>
        )}
      </div>
    </div>
  );
}

// ---------- States ----------

export function EmptyState({
  emoji,
  title,
  text,
  action,
}: {
  emoji: string;
  title: string;
  text?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <div className="mb-3 text-5xl" aria-hidden>
        {emoji}
      </div>
      <p className="text-lg font-black">{title}</p>
      {text && <p className="mt-1 max-w-sm text-muted">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Loading({ label = "Chargement" }: { label?: string }) {
  return (
    <div
      className="flex items-center justify-center gap-3 py-16 text-muted"
      role="status"
    >
      <span className="size-6 animate-spin rounded-full border-[3px] border-carrot border-t-transparent" />
      <span className="font-bold">{label}…</span>
    </div>
  );
}

export function ErrorBox({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="rounded-2xl bg-berry-soft p-4 font-bold text-berry"
    >
      {children}
    </div>
  );
}
