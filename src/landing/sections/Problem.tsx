import type { CSSProperties } from "react";
import { Heading, Lead, Reveal, Section } from "../parts";
import { fr } from "../typo";

const NOTES = [
  {
    q: fr`On mange quoi ?`,
    a: "Une question simple. Une réponse étonnamment compliquée.",
    paper: "bg-sun-soft",
    tilt: -3,
  },
  {
    q: fr`On a encore des carottes ?`,
    a: "Oui. Et maintenant on en a deux kilos.",
    paper: "bg-carrot-soft",
    tilt: 2,
  },
  {
    q: fr`Il reste quoi dans le frigo ?`,
    a: "Une boîte mystérieuse et trois bonnes intentions.",
    paper: "bg-herb-soft",
    tilt: -1.5,
  },
];

export function Problem() {
  return (
    <Section id="probleme" tone="paper">
      <Reveal className="max-w-3xl">
        <Heading id="probleme">
          La question qui revient.{" "}
          <span className="text-carrot-dark">
            Tous.{" "}
            <span className="lp-tilt inline-block" style={{ "--lp-tilt": "3deg" } as CSSProperties}>
              Les.
            </span>{" "}
            Jours.
          </span>
        </Heading>
        <Lead>
          Tu connais le scénario. Quelqu'un demande ce qu'on mange. Personne ne sait. On ouvre le frigo. On
          referme le frigo. Et on finit par acheter des ingrédients qu'on avait déjà.
        </Lead>
      </Reveal>

      <ul className="mt-16 grid gap-10 sm:grid-cols-3 sm:gap-6 lg:gap-10">
        {NOTES.map((n, i) => (
          <li key={n.q} className={i === 1 ? "sm:mt-8" : i === 2 ? "sm:-mt-2" : ""}>
            <Reveal delay={i * 120}>
              <div
                className={`lp-note rounded-md px-6 pt-8 pb-7 ${n.paper}`}
                style={{ "--lp-tilt": `${n.tilt}deg` } as CSSProperties}
              >
                <p className="text-[26px] leading-tight font-black tracking-tight">{n.q}</p>
                <p className="mt-3 text-[17px] leading-snug font-semibold text-ink/75">{n.a}</p>
              </div>
            </Reveal>
          </li>
        ))}
      </ul>

      <Reveal className="mt-16 sm:mt-20">
        <p className="mx-auto max-w-2xl text-center text-[clamp(1.35rem,3vw,1.75rem)] leading-snug font-extrabold text-balance">
          Menu Maison remet un peu d'ordre dans tout ça.{" "}
          <span className="text-carrot-dark">Sans enlever le plaisir de cuisiner.</span>
        </p>
      </Reveal>
    </Section>
  );
}
