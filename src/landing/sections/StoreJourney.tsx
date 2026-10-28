import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Check } from "lucide-react";
import { ChainMark } from "../../components/shopping/chains";
import { cx } from "../../components/ui";
import { DEMO_STORES, demoList } from "../demo";
import type { LandingKey } from "../i18n";
import { useL } from "../lang";
import { DemoTag, Heading, Phone, Reveal, Section } from "../parts";

const POINTS: LandingKey[] = ["store.point1", "store.point2", "store.point3", "store.point4", "store.point5"];

/** Moves the aisles to their new place instead of jumping (FLIP). */
function useReorder() {
  const nodes = useRef(new Map<string, HTMLElement>());
  const before = useRef(new Map<string, number>());

  const snapshot = () => {
    before.current = new Map([...nodes.current].map(([k, el]) => [k, el.getBoundingClientRect().top]));
  };

  useLayoutEffect(() => {
    if (!before.current.size) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    for (const [key, el] of nodes.current) {
      const from = before.current.get(key);
      const delta = from === undefined ? 0 : from - el.getBoundingClientRect().top;
      if (!still && delta && el.animate)
        el.animate([{ transform: `translateY(${delta}px)` }, { transform: "none" }], {
          duration: 520,
          easing: "cubic-bezier(0.2, 0.7, 0.2, 1)",
        });
    }
    before.current = new Map();
  });

  const bind = (key: string) => (el: HTMLElement | null) => {
    if (el) nodes.current.set(key, el);
    else nodes.current.delete(key);
  };
  return { snapshot, bind };
}

function RouteDemo() {
  const { l, lang } = useL();
  const [index, setIndex] = useState(0);
  const store = DEMO_STORES[index];
  const list = useMemo(() => demoList(store, undefined, lang), [store, lang]);
  // « On commence par : boulangerie », but German nouns keep their capital
  const first = lang === "fr" ? list.sections[0].name.toLowerCase() : list.sections[0].name;
  const { snapshot, bind } = useReorder();

  return (
    <div className="rounded-[2rem] bg-paper p-5 shadow-[0_24px_60px_-34px_rgba(43,36,32,0.55)] sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[15px] font-extrabold text-muted">{l("store.choose")}</p>
        <DemoTag />
      </div>
      <div role="radiogroup" aria-label={l("store.storesLabel")} className="mt-3 flex flex-wrap gap-2">
        {DEMO_STORES.map((s, i) => (
          <button
            key={s.name}
            type="button"
            role="radio"
            aria-checked={i === index}
            onClick={() => {
              if (i === index) return;
              snapshot();
              setIndex(i);
            }}
            className={cx(
              "inline-flex min-h-11 items-center gap-2 rounded-full py-1 pr-4 pl-1.5 text-[15px] font-bold transition",
              i === index ? "bg-ink text-white" : "bg-cream text-ink ring-1 ring-line hover:ring-carrot/50",
            )}
          >
            <ChainMark chain={s.chain} size={30} />
            {s.name}
          </button>
        ))}
      </div>

      <p className="mt-6 text-[15px] font-bold text-muted" aria-live="polite">
        {l("store.summary", { count: list.total, cost: list.costChf.toFixed(2), store: store.name, first })}
      </p>

      <ol className="relative mt-4 space-y-2.5">
        <span aria-hidden className="absolute top-5 bottom-5 left-[19px] border-l-[3px] border-dotted border-carrot/35" />
        {list.sections.map((s, i) => (
          <li key={s.name} ref={bind(s.name)} className="relative flex items-start gap-3">
            <span className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full bg-carrot text-[15px] font-black text-white ring-4 ring-paper">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1 rounded-2xl bg-cream px-3.5 py-2.5">
              <p className="text-[16px] font-extrabold">
                <span aria-hidden>{s.emoji}</span> {s.name}
              </p>
              <p className="mt-0.5 truncate text-[14px] text-muted">
                {s.items.map((it) => (it.display ? `${it.label} ${it.display}` : it.label)).join(" · ")}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function StoreJourney() {
  const { l } = useL();
  return (
    <Section id="magasins" tone="peach">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16">
        <div>
          <Reveal>
            <Heading id="magasins">{l("store.title")}</Heading>
            <p className="mt-6 text-lg leading-relaxed text-ink/80 sm:text-xl">
              {l("store.lead1")}
            </p>
            <p className="mt-4 text-lg leading-relaxed text-ink/80 sm:text-xl">
              {l("store.lead2")}
            </p>
          </Reveal>

          <Reveal className="mt-10 flex items-start gap-6">
            <Phone
              src="parcours"
              size="w-[150px] sm:w-[190px]"
              className="hidden rotate-[-3deg] sm:block"
              alt={l("store.editorAlt")}
            />
            <ul className="space-y-3 pt-2">
              {POINTS.map((p) => (
                <li key={p} className="flex gap-3 text-[17px] leading-snug font-semibold">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-herb text-white">
                    <Check size={15} strokeWidth={3.2} aria-hidden />
                  </span>
                  {l(p)}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <Reveal delay={120}>
          <RouteDemo />
          <p
            className="lp-note mx-auto mt-10 max-w-sm rounded-md bg-sun-soft px-6 pt-7 pb-6 text-[18px] leading-snug font-extrabold"
            style={{ "--lp-tilt": "-2deg" } as CSSProperties}
          >
            {l("store.note")}
          </p>
        </Reveal>
      </div>
    </Section>
  );
}
