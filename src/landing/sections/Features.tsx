import { History, LayoutTemplate, Mic, Package, Star, Sunrise } from "lucide-react";
import { Heading, Reveal, Section } from "../parts";
import { fr } from "../typo";

const CARDS = [
  {
    icon: LayoutTemplate,
    title: "Les menus types",
    text: fr`Une semaine qui fonctionne bien ? Enregistre-la et ressors-la quand l'inspiration prend congé.`,
  },
  {
    icon: Star,
    title: "Les articles habituels",
    text: "Café, papier toilette, dentifrice… Tout ne vient pas forcément d'une recette.",
  },
  {
    icon: Sunrise,
    title: "Le repas de demain",
    text: "Cuisine une fois, mange deux fois. La liste sait calculer les bonnes portions.",
  },
  {
    icon: Mic,
    title: "La dictée des recettes",
    text: "Dicte les ingrédients et les étapes. Plus besoin de taper toute la recette de grand-maman.",
  },
  {
    icon: Package,
    title: "Les ingrédients en stock",
    text: fr`Les épices, l'huile et les produits qu'on a toujours sont proposés en tête : un geste suffit pour les retirer des achats.`,
  },
  {
    icon: History,
    title: "Les recettes oubliées",
    text: "Retrouve les plats que tout le monde aime, mais qu'on n'a pas cuisinés depuis longtemps.",
  },
];

export function Features() {
  return (
    <Section id="astuces" tone="peach">
      <Reveal className="max-w-3xl">
        <Heading id="astuces">Et puis il y a les petits détails qui changent tout.</Heading>
      </Reveal>
      <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
        {CARDS.map(({ icon: Icon, title, text }, i) => (
          <li key={title}>
            <Reveal delay={(i % 3) * 90} className="h-full">
              <div className="h-full rounded-[1.6rem] bg-paper p-6 shadow-[0_1px_0_rgba(43,36,32,0.04),0_10px_30px_-22px_rgba(43,36,32,0.5)] transition duration-300 hover:-translate-y-1">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-carrot-soft text-carrot-dark">
                  <Icon size={24} aria-hidden />
                </span>
                <h3 className="mt-4 text-[20px] font-black tracking-tight">{title}</h3>
                <p className="mt-2 text-[16px] leading-relaxed text-muted">{text}</p>
              </div>
            </Reveal>
          </li>
        ))}
      </ul>
    </Section>
  );
}
