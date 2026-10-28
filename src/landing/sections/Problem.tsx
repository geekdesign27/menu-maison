import type { CSSProperties } from "react";
import { useL } from "../lang";
import { Heading, Lead, Reveal, Section } from "../parts";

const NOTES = [
  {
    qKey: "problem.q1" as const,
    aKey: "problem.a1" as const,
    paper: "bg-sun-soft",
    tilt: -3,
  },
  {
    qKey: "problem.q2" as const,
    aKey: "problem.a2" as const,
    paper: "bg-carrot-soft",
    tilt: 2,
  },
  {
    qKey: "problem.q3" as const,
    aKey: "problem.a3" as const,
    paper: "bg-herb-soft",
    tilt: -1.5,
  },
];

export function Problem() {
  const { l } = useL();
  return (
    <Section id="probleme" tone="paper">
      <Reveal className="max-w-3xl">
        <Heading id="probleme">
          {l("problem.titleStart")}{" "}
          <span className="text-carrot-dark">
            {l("problem.titleWord1")}{" "}
            <span className="lp-tilt inline-block" style={{ "--lp-tilt": "3deg" } as CSSProperties}>
              {l("problem.titleWord2")}
            </span>{" "}
            {l("problem.titleWord3")}
          </span>
        </Heading>
        <Lead>
          {l("problem.lead")}
        </Lead>
      </Reveal>

      <ul className="mt-16 grid gap-10 sm:grid-cols-3 sm:gap-6 lg:gap-10">
        {NOTES.map((n, i) => (
          <li key={n.qKey} className={i === 1 ? "sm:mt-8" : i === 2 ? "sm:-mt-2" : ""}>
            <Reveal delay={i * 120}>
              <div
                className={`lp-note rounded-md px-6 pt-8 pb-7 ${n.paper}`}
                style={{ "--lp-tilt": `${n.tilt}deg` } as CSSProperties}
              >
                <p className="text-[26px] leading-tight font-black tracking-tight">{l(n.qKey)}</p>
                <p className="mt-3 text-[17px] leading-snug font-semibold text-ink/75">{l(n.aKey)}</p>
              </div>
            </Reveal>
          </li>
        ))}
      </ul>

      <Reveal className="mt-16 sm:mt-20">
        <p className="mx-auto max-w-2xl text-center text-[clamp(1.35rem,3vw,1.75rem)] leading-snug font-extrabold text-balance">
          {l("problem.closing")}{" "}
          <span className="text-carrot-dark">{l("problem.closingHighlight")}</span>
        </p>
      </Reveal>
    </Section>
  );
}
