import { useId, useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { formatQty } from "../../../convex/domain/quantities";
import { cx } from "../../components/ui";
import { CHICKEN_PORTIONS, DEMO_STORES, demoItem, demoList, LASAGNES, needFor, ROAST_CHICKEN } from "../demo";
import type { LandingKey } from "../i18n";
import { useL } from "../lang";
import { Heading, Lead, Note, Phone, Reveal, Section } from "../parts";

const lasagnesCarrots = needFor(LASAGNES, 6, "Carottes");
const chickenCarrots = needFor(ROAST_CHICKEN, CHICKEN_PORTIONS, "Carottes");

/** The example week's list in the page language. */
function useDemoList() {
  const { lang } = useL();
  return useMemo(() => demoList(DEMO_STORES[0], undefined, lang), [lang]);
}

/** Two dishes, one line: the carrots as the app adds them up. */
function MergeCard() {
  const { l, lang } = useL();
  const total = demoItem(useDemoList(), "Carottes");
  return (
    <div className="rounded-[1.4rem] bg-paper p-4 shadow-[0_18px_40px_-20px_rgba(43,36,32,0.45)]">
      <ul className="space-y-1.5 text-[14px]">
        <li className="flex justify-between gap-3">
          <span className="font-bold">{l("how.mergeLasagnes")}</span>
          <span className="font-extrabold text-muted">{formatQty(lasagnesCarrots, "g", lang)}</span>
        </li>
        <li className="flex justify-between gap-3">
          <span className="font-bold">{l("how.mergeChicken")}</span>
          <span className="font-extrabold text-muted">{formatQty(chickenCarrots, "g", lang)}</span>
        </li>
      </ul>
      <div className="mt-3 flex items-center justify-between rounded-xl bg-carrot-soft px-3 py-2">
        <span className="font-extrabold">{l("how.mergeTotal")}</span>
        <span className="font-black text-carrot-dark">{total?.display}</span>
      </div>
    </div>
  );
}

/** The first stops of the walk through Aldi Marly. */
function RouteCard() {
  const list = useDemoList();
  return (
    <div className="rounded-[1.4rem] bg-paper p-4 shadow-[0_18px_40px_-20px_rgba(43,36,32,0.45)]">
      <p className="text-[13px] font-extrabold tracking-wider text-muted uppercase">{DEMO_STORES[0].name}</p>
      <ol className="mt-2 space-y-1.5">
        {list.sections.slice(0, 4).map((s, i) => (
          <li key={s.name} className="flex items-center gap-2 text-[14px] font-bold">
            <span className="flex size-6 items-center justify-center rounded-full bg-carrot-soft text-[12px] font-black text-carrot-dark">
              {i + 1}
            </span>
            <span aria-hidden>{s.emoji}</span> {s.name}
          </li>
        ))}
      </ol>
    </div>
  );
}

interface Step {
  title: LandingKey;
  text: LandingKey;
  note: LandingKey;
  shot: string;
  alt: LandingKey;
  extra?: ReactNode;
}

const STEPS: Step[] = [
  { title: "how.step1Title", text: "how.step1Text", note: "how.step1Note", shot: "portions", alt: "how.step1Alt" },
  {
    title: "how.step2Title",
    text: "how.step2Text",
    note: "how.step2Note",
    shot: "valider",
    alt: "how.step2Alt",
    extra: <MergeCard />,
  },
  {
    title: "how.step3Title",
    text: "how.step3Text",
    note: "how.step3Note",
    shot: "courses",
    alt: "how.step3Alt",
    extra: <RouteCard />,
  },
];

export function HowItWorks() {
  const { l, lang } = useL();
  const [active, setActive] = useState(0);
  const base = useId();
  // The carrots of both dishes, quoted in the second step's note
  const noteVars = { lasagnes: formatQty(lasagnesCarrots, "g", lang), chicken: formatQty(chickenCarrots, "g", lang) };

  function onKey(e: KeyboardEvent<HTMLButtonElement>) {
    const moves: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
    if (!(e.key in moves)) return;
    e.preventDefault();
    const next = (active + moves[e.key] + STEPS.length) % STEPS.length;
    setActive(next);
    document.getElementById(`${base}-tab-${next}`)?.focus();
  }

  return (
    <Section id="fonctionnement" tone="cream">
      <Reveal className="max-w-3xl">
        <Heading id="fonctionnement">{l("how.title")}</Heading>
        <Lead>{l("how.lead")}</Lead>
      </Reveal>

      <div className="mt-14 grid grid-cols-1 items-start gap-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-20">
        <div role="tablist" aria-label={l("how.tabs")} aria-orientation="vertical" className="space-y-3">
          {STEPS.map((s, i) => {
            const on = i === active;
            return (
              <button
                key={s.title}
                id={`${base}-tab-${i}`}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls={`${base}-panel`}
                aria-labelledby={`${base}-name-${i}`}
                tabIndex={on ? 0 : -1}
                onClick={() => setActive(i)}
                onKeyDown={onKey}
                className={cx(
                  "flex w-full gap-4 rounded-[1.6rem] p-5 text-left transition duration-300 sm:gap-5 sm:p-6",
                  on
                    ? "bg-paper shadow-[0_18px_40px_-24px_rgba(43,36,32,0.5)]"
                    : "hover:bg-paper/60",
                )}
              >
                <span
                  className={cx(
                    "flex size-12 shrink-0 items-center justify-center rounded-full text-xl font-black transition",
                    on ? "bg-carrot text-white" : "bg-carrot-soft text-carrot-dark",
                  )}
                  aria-hidden
                >
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span
                    id={`${base}-name-${i}`}
                    className="block text-[clamp(1.25rem,2.4vw,1.55rem)] leading-tight font-black tracking-tight"
                  >
                    <span className="sr-only">{l("how.stepNumber", { n: i + 1 })}</span>
                    {l(s.title)}
                  </span>
                  <span className={cx("grid transition-[grid-template-rows] duration-300", on ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                    <span className="overflow-hidden pb-1">
                      <span className="mt-2 block text-[17px] leading-relaxed text-muted">{l(s.text)}</span>
                      <Note className="mt-3 text-[16px]">{l(s.note, noteVars)}</Note>
                    </span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div
          id={`${base}-panel`}
          role="tabpanel"
          aria-labelledby={`${base}-tab-${active}`}
          className="relative mx-auto grid w-fit lg:mr-10"
        >
          {STEPS.map((s, i) => (
            <div
              key={s.shot}
              className={cx(
                "[grid-area:1/1] transition duration-500",
                i === active ? "opacity-100" : "pointer-events-none translate-y-2 opacity-0",
              )}
              aria-hidden={i !== active}
              inert={i !== active}
            >
              <Phone src={s.shot} alt={l(s.alt)} size="w-[min(72vw,280px)]" />
              {s.extra && (
                <div className="absolute -bottom-6 -left-4 w-[230px] -rotate-3 sm:-left-16 lg:-left-24">{s.extra}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
