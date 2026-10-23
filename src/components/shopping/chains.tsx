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
