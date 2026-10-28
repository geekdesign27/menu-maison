import type { CSSProperties } from "react";
import { BookHeart, Compass, FileCheck2, Heart, Link2, Mic, Sparkles, Tags } from "lucide-react";
import { Avatar } from "../../components/ui";
import { useL } from "../lang";
import { Heading, Note, Phone, Reveal, Section } from "../parts";

// The demo family of the screenshots, with their wishes of that week
const WISHES = [
  { name: "Julie", emoji: "👩‍🍳", color: "#A8C8E8", dishKey: "recipesWishes.wishJulie" as const, tilt: -3 },
  { name: "Marc", emoji: "🧔", color: "#F5C6A5", dishKey: "recipesWishes.wishMarc" as const, tilt: 2 },
  { name: "Léa", emoji: "🦄", color: "#CDB8E6", dishKey: "recipesWishes.wishLea" as const, tilt: -1 },
];

const FEATURES = [
  { icon: BookHeart, textKey: "recipesWishes.add" as const },
  { icon: Compass, textKey: "recipesWishes.explore" as const },
  { icon: Heart, textKey: "recipesWishes.like" as const },
  { icon: Sparkles, textKey: "recipesWishes.propose" as const },
  { icon: Tags, textKey: "recipesWishes.sort" as const },
  { icon: Mic, textKey: "recipesWishes.dictate" as const },
  { icon: Link2, textKey: "recipesWishes.import" as const },
  { icon: FileCheck2, textKey: "recipesWishes.review" as const },
];

export function RecipesWishes() {
  const { l } = useL();
  return (
    <Section id="recettes" tone="cream">
      <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-16">
        <div className="relative order-2 mx-auto w-fit lg:order-1">
          <Phone
            src="envies"
            size="w-[min(52vw,220px)]"
            className="absolute top-14 -left-10 hidden rotate-[-6deg] opacity-95 sm:block lg:-left-24"
            alt={l("recipesWishes.wishesAlt")}
          />
          <Phone
            src="recettes"
            size="w-[min(74vw,280px)]"
            className="relative rotate-[2deg]"
            alt={l("recipesWishes.recipesAlt")}
          />
          <ul className="mt-6 space-y-2 sm:absolute sm:-right-16 sm:bottom-10 sm:mt-0" aria-label={l("recipesWishes.wishesLabel")}>
            {WISHES.map((w) => (
              <li
                key={w.name}
                className="lp-tilt flex items-center gap-2 rounded-full bg-paper py-1.5 pr-4 pl-1.5 text-[14px] font-extrabold shadow-[0_10px_24px_-14px_rgba(43,36,32,0.5)]"
                style={{ "--lp-tilt": `${w.tilt}deg` } as CSSProperties}
              >
                <Avatar member={w} size={30} />
                <span>
                  <span className="sr-only">{l("recipesWishes.wishBy", { name: w.name })}</span>
                  {l(w.dishKey)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="order-1 lg:order-2">
          <Reveal>
            <Heading id="recettes">{l("recipesWishes.title")}</Heading>
            <p className="mt-6 text-lg leading-relaxed text-muted sm:text-xl">
              {l("recipesWishes.lead")}
            </p>
          </Reveal>
          <Reveal className="mt-9">
            <ul className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              {FEATURES.map(({ icon: Icon, textKey }) => (
                <li key={textKey} className="flex items-start gap-3 text-[16px] leading-snug font-bold">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-carrot-soft text-carrot-dark">
                    <Icon size={19} aria-hidden />
                  </span>
                  <span className="pt-1.5">{l(textKey)}</span>
                </li>
              ))}
            </ul>
            <Note className="mt-9 max-w-md text-[19px]" tilt={-1.5}>
              {l("recipesWishes.note")}
            </Note>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}
