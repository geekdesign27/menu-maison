import type { CSSProperties } from "react";
import { ChainMark } from "../../components/shopping/chains";
import { DEMO_STORES, demoRecipeCost, LASAGNES } from "../demo";
import { Heading, Note, Phone, Reveal, Section } from "../parts";
import { fr } from "../typo";

const POINTS = [
  { title: "Une recette", text: "Son coût estimé, en tout et par personne." },
  { title: "La semaine", text: "Le coût prévisionnel de tout le menu, chez le magasin choisi." },
  { title: "Les enseignes", text: "Des prix par enseigne, mis à jour par tes tickets." },
  { title: "Le ticket", text: "L'app lit les lignes, tu vérifies, puis tu enregistres." },
  { title: "Les statistiques", text: "Ce qui a été cuisiné, les plats qui reviennent trop souvent, ceux qu'on a oubliés." },
];

// Same numbers as the screenshots: the week of the demo family and its lasagnes
const lasagnesCost = demoRecipeCost(LASAGNES, 3, DEMO_STORES[1]);

export function Budget() {
  return (
    <Section id="budget" tone="cream">
      <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-20">
        <div>
          <Reveal>
            <Heading id="budget">
              Manger, c'est bien. <span className="text-carrot-dark">Savoir ce que ça coûte, c'est pas mal non plus.</span>
            </Heading>
            <p className="mt-6 text-lg leading-relaxed text-muted sm:text-xl">
              Menu Maison estime le coût des repas et des courses à partir des prix connus. Et quand tu scannes ton
              ticket, tu peux vérifier les montants réels et actualiser les prix des produits.
            </p>
          </Reveal>
          <Reveal className="mt-10">
            <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
              {POINTS.map((p) => (
                <div key={p.title} className="border-t-2 border-line pt-3">
                  <dt className="text-[17px] font-black">{p.title}</dt>
                  <dd className="mt-1 text-[16px] leading-snug text-muted">{p.text}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-8 text-[15px] leading-snug text-muted">
              {fr`Ce sont des estimations, fondées sur les prix enregistrés par la famille : pas une comparaison du marché, ni une promesse d'économies.`}
            </p>
          </Reveal>
        </div>

        <Reveal delay={120} className="relative mx-auto flex w-fit flex-col items-center gap-5 sm:block">
          <Phone
            src="stats"
            size="w-[min(72vw,270px)]"
            className="rotate-[2deg]"
            alt="L'écran Statistiques : 8 plats cuisinés cette semaine, le birchermüesli signalé comme trop fréquent avec 3 fois en 4 semaines, puis le top des 12 dernières semaines."
          />
          <div
            className="lp-tilt order-first w-[230px] rounded-[1.4rem] bg-paper p-4 shadow-[0_18px_40px_-18px_rgba(43,36,32,0.45)] sm:absolute sm:-top-12 sm:-left-28"
            style={{ "--lp-tilt": "-4deg" } as CSSProperties}
          >
            <p className="text-[13px] font-extrabold tracking-wider text-muted uppercase">Cette semaine</p>
            <p className="mt-1 text-[26px] leading-none font-black whitespace-nowrap">{fr`env. CHF 117.85`}</p>
            <p className="mt-1.5 flex items-center gap-1.5 text-[14px] font-bold text-muted">
              <ChainMark chain="Aldi" size={18} /> {fr`16 plats, estimé chez Aldi Marly`}
            </p>
          </div>
          <div
            className="lp-tilt lp-receipt w-[210px] bg-paper px-4 pt-4 font-mono text-[13px] shadow-[0_18px_40px_-18px_rgba(43,36,32,0.45)] sm:absolute sm:-right-20 sm:bottom-10"
            style={{ "--lp-tilt": "5deg" } as CSSProperties}
          >
            <p className="font-sans text-[14px] font-black">🍝 Lasagnes, 3 portions</p>
            <p className="mt-2 flex justify-between font-bold">
              <span>Coop</span>
              <span>{fr`CHF ${lasagnesCost.toFixed(2)}`}</span>
            </p>
            <p className="mt-1 font-sans text-[12px] text-muted">prix indicatifs, Coop Fribourg Centre</p>
          </div>
        </Reveal>
      </div>
      <Reveal className="mt-16">
        <Note className="mx-auto max-w-xl text-center text-[20px]" tilt={-1}>
          Le birchermüesli, c'est très bon. Mais trois fois cette semaine, ça mérite peut-être une petite discussion.
        </Note>
      </Reveal>
    </Section>
  );
}
