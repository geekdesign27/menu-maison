import type { Doc } from "../../../convex/_generated/dataModel";
import { NBSP } from "../../../convex/domain/quantities";
import { cx } from "../ui";

export type Chain = Doc<"stores">["chain"];

export const CHAINS: Chain[] = [
  "Aldi",
  "Lidl",
  "Coop",
  "Migros",
  "Denner",
  "Autre",
];

// Brand-like colours so each store is recognisable at a glance in the shop
const CHAIN_STYLE: Record<Chain, { bg: string; fg: string; mark: string }> = {
  Aldi: { bg: "#1f3f8f", fg: "#ffffff", mark: "A" },
  Lidl: { bg: "#0b55a8", fg: "#ffe14d", mark: "L" },
  Coop: { bg: "#e2511f", fg: "#ffffff", mark: "C" },
  Migros: { bg: "#f07a12", fg: "#ffffff", mark: "M" },
  Denner: { bg: "#c8102e", fg: "#ffffff", mark: "D" },
  Autre: { bg: "#fde9da", fg: "#2b2420", mark: "🏪" },
};

/** Round chain logo-like mark (initial on the chain colour). */
export function ChainMark({
  chain,
  size = 28,
  className,
}: {
  chain: Chain;
  size?: number;
  className?: string;
}) {
  const s = CHAIN_STYLE[chain];
  return (
    <span
      aria-hidden
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-full font-black",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: s.bg,
        color: s.fg,
        fontSize: size * (chain === "Autre" ? 0.55 : 0.5),
      }}
    >
      {s.mark}
    </span>
  );
}

/** « 18 % moins cher que la moyenne », « 5 % plus cher que la moyenne ». */
export function priceLevelText(factor: number): string {
  const pct = Math.round(Math.abs(1 - factor) * 100);
  if (pct === 0) return "Prix dans la moyenne";
  return `${pct}${NBSP}% ${factor < 1 ? "moins cher" : "plus cher"} que la moyenne`;
}

/**
 * « Disponible seulement chez » : no chain ticked means sold everywhere.
 * Ticked chains restrict the product (julienne de légumes: Coop only).
 */
export function ChainsPicker({ value, onChange }: { value: Chain[]; onChange: (chains: Chain[]) => void }) {
  const toggle = (c: Chain) => onChange(value.includes(c) ? value.filter((x) => x !== c) : [...value, c]);
  return (
    <div>
      <span className="mb-1 block text-[15px] font-bold">Disponible seulement chez</span>
      <div className="flex flex-wrap gap-2">
        {CHAINS.filter((c) => c !== "Autre").map((c) => {
          const on = value.includes(c);
          return (
            <button
              key={c}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(c)}
              className={cx(
                "inline-flex min-h-11 items-center gap-2 rounded-full py-1 pr-4 pl-1.5 font-bold transition",
                on ? "bg-ink text-white" : "bg-paper text-ink ring-1 ring-line active:bg-carrot-soft",
              )}
            >
              <ChainMark chain={c} size={30} />
              {c}
            </button>
          );
        })}
      </div>
      <p className="mt-1 text-[13px] text-muted">
        {value.length
          ? `Dans les autres magasins, il apparaît à part en bas de la liste${NBSP}: «${NBSP}À acheter chez ${value.join(" ou ")}${NBSP}».`
          : "Rien de coché : on le trouve partout."}
      </p>
    </div>
  );
}
