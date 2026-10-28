import { History, LayoutTemplate, Mic, Package, Star, Sunrise } from "lucide-react";
import { useL } from "../lang";
import { Heading, Reveal, Section } from "../parts";

const CARDS = [
  {
    icon: LayoutTemplate,
    titleKey: "features.templatesTitle" as const,
    textKey: "features.templatesText" as const,
  },
  {
    icon: Star,
    titleKey: "features.staplesTitle" as const,
    textKey: "features.staplesText" as const,
  },
  {
    icon: Sunrise,
    titleKey: "features.tomorrowTitle" as const,
    textKey: "features.tomorrowText" as const,
  },
  {
    icon: Mic,
    titleKey: "features.dictationTitle" as const,
    textKey: "features.dictationText" as const,
  },
  {
    icon: Package,
    titleKey: "features.stockTitle" as const,
    textKey: "features.stockText" as const,
  },
  {
    icon: History,
    titleKey: "features.forgottenTitle" as const,
    textKey: "features.forgottenText" as const,
  },
];

export function Features() {
  const { l } = useL();
  return (
    <Section id="astuces" tone="peach">
      <Reveal className="max-w-3xl">
        <Heading id="astuces">{l("features.title")}</Heading>
      </Reveal>
      <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
        {CARDS.map(({ icon: Icon, titleKey, textKey }, i) => (
          <li key={titleKey}>
            <Reveal delay={(i % 3) * 90} className="h-full">
              <div className="h-full rounded-[1.6rem] bg-paper p-6 shadow-[0_1px_0_rgba(43,36,32,0.04),0_10px_30px_-22px_rgba(43,36,32,0.5)] transition duration-300 hover:-translate-y-1">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-carrot-soft text-carrot-dark">
                  <Icon size={24} aria-hidden />
                </span>
                <h3 className="mt-4 text-[20px] font-black tracking-tight">{l(titleKey)}</h3>
                <p className="mt-2 text-[16px] leading-relaxed text-muted">{l(textKey)}</p>
              </div>
            </Reveal>
          </li>
        ))}
      </ul>
    </Section>
  );
}
