import type { CSSProperties } from "react";
import { ChainMark } from "../../components/shopping/chains";
import { DEMO_STORES, demoRecipeCost, LASAGNES } from "../demo";
import type { LandingKey } from "../i18n";
import { useL } from "../lang";
import { Heading, Note, Phone, Reveal, Section } from "../parts";

const POINTS: { title: LandingKey; text: LandingKey }[] = [
  { title: "budget.point1Title", text: "budget.point1Text" },
  { title: "budget.point2Title", text: "budget.point2Text" },
  { title: "budget.point3Title", text: "budget.point3Text" },
  { title: "budget.point4Title", text: "budget.point4Text" },
  { title: "budget.point5Title", text: "budget.point5Text" },
];

// Same numbers as the screenshots: the week of the demo family and its lasagnes
const lasagnesCost = demoRecipeCost(LASAGNES, 3, DEMO_STORES[1]);

export function Budget() {
  const { l } = useL();
  return (
    <Section id="budget" tone="cream">
      <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-20">
        <div>
          <Reveal>
            <Heading id="budget">
              {l("budget.title")} <span className="text-carrot-dark">{l("budget.titleAccent")}</span>
            </Heading>
            <p className="mt-6 text-lg leading-relaxed text-muted sm:text-xl">
              {l("budget.lead")}
            </p>
          </Reveal>
          <Reveal className="mt-10">
            <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
              {POINTS.map((p) => (
                <div key={p.title} className="border-t-2 border-line pt-3">
                  <dt className="text-[17px] font-black">{l(p.title)}</dt>
                  <dd className="mt-1 text-[16px] leading-snug text-muted">{l(p.text)}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-8 text-[15px] leading-snug text-muted">
              {l("budget.disclaimer")}
            </p>
          </Reveal>
        </div>

        <Reveal delay={120} className="relative mx-auto flex w-fit flex-col items-center gap-5 sm:block">
          <Phone
            src="stats"
            size="w-[min(72vw,270px)]"
            className="rotate-[2deg]"
            alt={l("budget.statsAlt")}
          />
          <div
            className="lp-tilt order-first w-[230px] rounded-[1.4rem] bg-paper p-4 shadow-[0_18px_40px_-18px_rgba(43,36,32,0.45)] sm:absolute sm:-top-12 sm:-left-28"
            style={{ "--lp-tilt": "-4deg" } as CSSProperties}
          >
            <p className="text-[13px] font-extrabold tracking-wider text-muted uppercase">{l("budget.thisWeek")}</p>
            <p className="mt-1 text-[26px] leading-none font-black whitespace-nowrap">{l("budget.weekTotal")}</p>
            <p className="mt-1.5 flex items-center gap-1.5 text-[14px] font-bold text-muted">
              <ChainMark chain="Aldi" size={18} /> {l("budget.weekDetail")}
            </p>
          </div>
          <div
            className="lp-tilt lp-receipt w-[210px] bg-paper px-4 pt-4 font-mono text-[13px] shadow-[0_18px_40px_-18px_rgba(43,36,32,0.45)] sm:absolute sm:-right-20 sm:bottom-10"
            style={{ "--lp-tilt": "5deg" } as CSSProperties}
          >
            <p className="font-sans text-[14px] font-black">{l("budget.receiptDish")}</p>
            <p className="mt-2 flex justify-between font-bold">
              <span>Coop</span>
              <span>{l("budget.receiptCost", { cost: lasagnesCost.toFixed(2) })}</span>
            </p>
            <p className="mt-1 font-sans text-[12px] text-muted">{l("budget.receiptNote")}</p>
          </div>
        </Reveal>
      </div>
      <Reveal className="mt-16">
        <Note className="mx-auto max-w-xl text-center text-[20px]" tilt={-1}>
          {l("budget.note")}
        </Note>
      </Reveal>
    </Section>
  );
}
