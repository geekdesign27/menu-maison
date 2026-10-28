import type { CSSProperties } from "react";
import { BookHeart, Compass, FileCheck2, Heart, Link2, Mic, Sparkles, Tags } from "lucide-react";
import { Avatar } from "../../components/ui";
import { fr } from "../typo";
import { Heading, Note, Phone, Reveal, Section } from "../parts";

// The demo family of the screenshots, with their wishes of that week
const WISHES = [
  { name: "Julie", emoji: "👩‍🍳", color: "#A8C8E8", dish: "🍄 Risotto aux champignons", tilt: -3 },
  { name: "Marc", emoji: "🧔", color: "#F5C6A5", dish: "🍔 Burgers maison", tilt: 2 },
  { name: "Léa", emoji: "🦄", color: "#CDB8E6", dish: "Des crêpes au chocolat", tilt: -1 },
];

const FEATURES = [
  { icon: BookHeart, text: "Ajouter ses recettes" },
  { icon: Compass, text: "Explorer le catalogue de départ" },
  { icon: Heart, text: "Marquer les recettes qu'on aime" },
  { icon: Sparkles, text: "Proposer un plat dans Envies" },
  { icon: Tags, text: fr`Trier par styles : express, familial, suisse…` },
  { icon: Mic, text: "Dicter une recette" },
  { icon: Link2, text: "Importer une recette depuis un texte ou un lien" },
  { icon: FileCheck2, text: "Relire le brouillon, puis l'enregistrer" },
];

export function RecipesWishes() {
  return (
    <Section id="recettes" tone="cream">
      <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-16">
        <div className="relative order-2 mx-auto w-fit lg:order-1">
          <Phone
            src="envies"
            size="w-[min(52vw,220px)]"
            className="absolute top-14 -left-10 hidden rotate-[-6deg] opacity-95 sm:block lg:-left-24"
            alt="L'écran Envies : Julie a envie d'un risotto aux champignons, Marc de burgers maison, Léa de crêpes au chocolat, avec Planifier et Fait."
          />
          <Phone
            src="recettes"
            size="w-[min(74vw,280px)]"
            className="relative rotate-[2deg]"
            alt="L'écran Recettes : Nos recettes et Découvrir, des filtres Express, Petit-déj et Suisse, puis des fiches avec le temps et le coût par personne, comme le birchermüesli à 2.25 francs."
          />
          <ul className="mt-6 space-y-2 sm:absolute sm:-right-16 sm:bottom-10 sm:mt-0" aria-label="Les envies de la semaine, dans l'exemple">
            {WISHES.map((w) => (
              <li
                key={w.name}
                className="lp-tilt flex items-center gap-2 rounded-full bg-paper py-1.5 pr-4 pl-1.5 text-[14px] font-extrabold shadow-[0_10px_24px_-14px_rgba(43,36,32,0.5)]"
                style={{ "--lp-tilt": `${w.tilt}deg` } as CSSProperties}
              >
                <Avatar member={w} size={30} />
                <span>
                  <span className="sr-only">{w.name} : </span>
                  {w.dish}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="order-1 lg:order-2">
          <Reveal>
            <Heading id="recettes">Chacun ses envies. Une seule liste de courses.</Heading>
            <p className="mt-6 text-lg leading-relaxed text-muted sm:text-xl">
              Julie a envie d'un risotto aux champignons. Marc rêve de burgers maison. Léa vote pour des crêpes au
              chocolat. Tout le monde peut proposer ses envies et retrouver ses recettes préférées. Il ne reste plus
              qu'à décider quand on mange quoi.
            </p>
          </Reveal>
          <Reveal className="mt-9">
            <ul className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              {FEATURES.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3 text-[16px] leading-snug font-bold">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-carrot-soft text-carrot-dark">
                    <Icon size={19} aria-hidden />
                  </span>
                  <span className="pt-1.5">{text}</span>
                </li>
              ))}
            </ul>
            <Note className="mt-9 max-w-md text-[19px]" tilt={-1.5}>
              Les bonnes idées se partagent. Même quand elles viennent de quelqu'un qui ne cuisine jamais.
            </Note>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}
