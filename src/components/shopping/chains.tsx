import type { Doc } from "../../../convex/_generated/dataModel";
import type { Lang } from "../../../convex/domain/lang";
import { translate } from "../../i18n";
import { useT } from "../../i18n/useT";
import { Chip, cx } from "../ui";
import type { MessageKey } from "../../i18n";
import {
  BRANDS,
  CHAINS,
  chainKind,
  chainName,
  type ChainKind,
} from "../../../convex/domain/chains";

export type Chain = Doc<"stores">["chain"];
export { CHAINS };

/**
 * Badge of each chain, drawn in its brand colours so a store is recognisable
 * at a glance. `mark` is the brand's initial or short name, as on its sign.
 */
// Colours from the brands' logo files (Wikimedia Commons SVG) where available;
// Aldi, Coop Pronto, Landi, Aligro, Otto's and avec are close estimates.
const CHAIN_STYLE: Record<Chain, { bg: string; fg: string; mark: string; ring?: string }> = {
  Migros: { bg: "#ffffff", fg: "#ff6600", mark: "M", ring: "#ff6600" },
  Coop: { bg: "#ffffff", fg: "#ff5404", mark: "coop", ring: "#ff8605" },
  Denner: { bg: "#e4332b", fg: "#ffffff", mark: "D" },
  Aldi: { bg: "#00005f", fg: "#ffffff", mark: "A", ring: "#f27c00" },
  Lidl: { bg: "#fff000", fg: "#0050aa", mark: "L", ring: "#e60a14" },
  Volg: { bg: "#004982", fg: "#ffed00", mark: "volg" },
  Spar: { bg: "#ec1b24", fg: "#ffffff", mark: "S", ring: "#157946" },
  Manor: { bg: "#ffffff", fg: "#000000", mark: "Ma", ring: "#da291c" },
  Globus: { bg: "#0d0c0c", fg: "#ffffff", mark: "G" },
  Landi: { bg: "#e30613", fg: "#ffffff", mark: "La" },
  Aligro: { bg: "#d6001c", fg: "#ffffff", mark: "Al" },
  "Otto's": { bg: "#ffd200", fg: "#e2001a", mark: "O" },
  Migrolino: { bg: "#ff6600", fg: "#ffffff", mark: "mi" },
  "Coop Pronto": { bg: "#ff5404", fg: "#ffffff", mark: "P" },
  avec: { bg: "#ffffff", fg: "#000000", mark: "av", ring: "#000000" },
  Specialise: { bg: "#e4f1e1", fg: "#2b2420", mark: "🧺" },
  Marche: { bg: "#fff1c2", fg: "#2b2420", mark: "⛱️" },
  Autre: { bg: "#fde9da", fg: "#2b2420", mark: "🏪" },
};

/** Chain name as shown: brand names stay as they are, the other kinds are translated. */
export function chainLabel(chain: Chain, lang: Lang = "fr"): string {
  return chainName(chain, lang);
}

/** Round chain logo-like mark (brand initial on the brand colour). */
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
  const emoji = chainKind(chain) === "shop";
  // Longer marks get a smaller font so they fit inside the circle
  const scale = emoji ? 0.55 : s.mark.length >= 4 ? 0.3 : s.mark.length === 2 ? 0.42 : 0.5;
  return (
    <span
      aria-hidden
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-full leading-none font-black tracking-tight",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: s.bg,
        color: s.fg,
        fontSize: size * scale,
        boxShadow: s.ring ? `inset 0 0 0 ${Math.max(2, Math.round(size / 12))}px ${s.ring}` : undefined,
      }}
    >
      {s.mark}
    </span>
  );
}

const PICKER_GROUPS: { kind: ChainKind; label: MessageKey }[] = [
  { kind: "supermarket", label: "shopping.chainGroup.supermarket" },
  { kind: "convenience", label: "shopping.chainGroup.convenience" },
  { kind: "shop", label: "shopping.chainGroup.shop" },
];

/** Chain of a store, chosen among the brands, grouped, then market, specialty shop or other. */
export function ChainPicker({ value, onChange }: { value: Chain; onChange: (chain: Chain) => void }) {
  const { t, lang } = useT();
  return (
    <div>
      <span className="mb-1 block text-[15px] font-bold">{t("shopping.chain")}</span>
      <div className="grid gap-3">
        {PICKER_GROUPS.map((g) => (
          <div key={g.kind}>
            <span className="mb-1.5 block text-[13px] font-extrabold tracking-wide text-muted uppercase">
              {t(g.label)}
            </span>
            <div className="flex flex-wrap gap-2">
              {CHAINS.filter((c) => chainKind(c) === g.kind).map((c) => (
                <Chip
                  key={c}
                  selected={value === c}
                  onClick={() => c !== value && onChange(c)}
                  className="min-h-11 pl-1.5"
                >
                  <ChainMark chain={c} size={30} />
                  {chainLabel(c, lang)}
                </Chip>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** « 18 % moins cher que la moyenne », « 5 % plus cher que la moyenne ». */
export function priceLevelText(factor: number, lang: Lang = "fr"): string {
  const pct = Math.round(Math.abs(1 - factor) * 100);
  if (pct === 0) return translate(lang, "shopping.priceAverage");
  return translate(
    lang,
    factor < 1 ? "shopping.priceCheaper" : "shopping.priceDearer",
    { pct },
  );
}

/**
 * « Disponible seulement chez » : no chain ticked means sold everywhere.
 * Ticked chains restrict the product (julienne de légumes: Coop only).
 */
export function ChainsPicker({ value, onChange }: { value: Chain[]; onChange: (chains: Chain[]) => void }) {
  const { t } = useT();
  const toggle = (c: Chain) => onChange(value.includes(c) ? value.filter((x) => x !== c) : [...value, c]);
  return (
    <div>
      <span className="mb-1 block text-[15px] font-bold">{t("shopping.onlyAt")}</span>
      <div className="flex flex-wrap gap-2">
        {BRANDS.map((c) => {
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
          ? t("shopping.onlyAtHint", {
              chains: value.join(` ${t("shopping.or")} `),
            })
          : t("shopping.everywhere")}
      </p>
    </div>
  );
}
