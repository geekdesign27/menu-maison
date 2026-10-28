import { useMemo, useState } from "react";
import { cx, Stepper } from "../../components/ui";
import { DEMO_STORES, demoItem, demoList, goodUntil, LASAGNES, STORY_PORTIONS, type Portions } from "../demo";
import { DemoTag, Heading, Lead, Note, Phone, Reveal, Section } from "../parts";
import { fr } from "../typo";

const longDate = (iso: string) =>
  new Intl.DateTimeFormat("fr-CH", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(`${iso}T12:00:00Z`),
  );

const MOMENTS = [
  { when: "Mercredi soir", what: fr`6 portions de lasagnes préparées. 3 mangées.`, dot: "bg-carrot" },
  { when: "Jeudi midi", what: fr`2 portions prévues pour le repas du lendemain.`, dot: "bg-herb" },
  { when: "Encore au frigo", what: fr`1 portion à replacer avant qu'elle ne soit oubliée.`, dot: "bg-sun" },
];

const FEATURES = [
  "Le nombre de portions qui restent, plat par plat.",
  "Des restes replanifiés sans rien racheter.",
  "La durée de conservation notée dans la recette.",
  fr`Les ingrédients achetés pour un plat finalement pas cuisiné, gardés dans « À utiliser ».`,
  "Des idées de recettes qui les utilisent.",
];

const SLOTS = [
  { key: "tonight", label: "Ce soir", color: "bg-carrot", min: 1 },
  { key: "tomorrowLunch", label: "Demain midi", color: "bg-herb", min: 0 },
  { key: "extra", label: "En plus pour le frigo", color: "bg-sun", min: 0 },
] as const;

/** The lasagne dish, cut into the portions planned below. */
function Dish({ portions }: { portions: Portions }) {
  const cells = SLOTS.flatMap((s) => Array.from({ length: portions[s.key] }, () => s.color));
  return (
    <div aria-hidden className="rounded-[1.4rem] bg-[#7a3d1e] p-2.5 shadow-inner">
      <div className={cx("grid gap-1.5 rounded-[1rem] bg-[#c36a3a] p-1.5", cells.length > 6 ? "grid-cols-4" : "grid-cols-3")}>
        {cells.map((color, i) => (
          <span key={i} className={cx("h-9 rounded-md transition-colors duration-300", color)} />
        ))}
      </div>
    </div>
  );
}

function PortionsDemo() {
  const [portions, setPortions] = useState<Portions>(STORY_PORTIONS);
  const total = portions.tonight + portions.tomorrowLunch + portions.extra;
  const list = useMemo(() => demoList(DEMO_STORES[0], portions), [portions]);
  const sheets = demoItem(list, "Feuilles de lasagne")?.display;
  const meat = demoItem(list, "Viande hachée mixte")?.display;

  return (
    <div className="rounded-[2rem] bg-paper p-5 shadow-[0_24px_60px_-34px_rgba(43,36,32,0.55)] sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[19px] font-black">🍝 Lasagnes bolognaise</p>
        <DemoTag />
      </div>
      <div className="mt-5 space-y-3">
        {SLOTS.map((s) => (
          <div key={s.key} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2.5 text-[16px] font-bold">
              <span aria-hidden className={cx("size-3.5 rounded-sm", s.color)} />
              {s.label}
            </span>
            <Stepper
              label={s.label}
              value={portions[s.key]}
              min={s.min}
              max={s.key === "tonight" ? 6 : 3}
              onChange={(n) => setPortions((p) => ({ ...p, [s.key]: n }))}
            />
          </div>
        ))}
      </div>
      <div className="mt-5">
        <Dish portions={portions} />
      </div>
      <p className="mt-4 rounded-2xl bg-carrot-soft px-4 py-3 text-center text-[17px] font-black text-carrot-dark" aria-live="polite">
        {fr`Tu prépares ${total} portions`}
      </p>
      <p className="mt-3 text-[15px] leading-snug text-muted">
        {fr`Sur la liste de courses : ${sheets} de feuilles de lasagne, ${meat} de viande hachée. Le midi de demain est prévu : il a déjà son créneau. Les portions en plus partent au Frigo, `}
        {portions.extra > 0
          ? fr`affichées « bon jusqu'au ${longDate(goodUntil(LASAGNES))} », ${LASAGNES.fridgeDays} jours selon la recette.`
          : "dès qu'il y en a."}
      </p>
    </div>
  );
}

export function Leftovers() {
  return (
    <Section id="restes" tone="paper">
      <Reveal className="max-w-3xl">
        <Heading id="restes">Les restes méritent mieux que le fond du frigo.</Heading>
        <Lead>
          {fr`Tu cuisines pour six, vous mangez à trois ? Pas de problème. Les portions restantes peuvent servir pour demain ou être gardées pour un autre repas.`}
        </Lead>
      </Reveal>

      <Reveal className="mt-12">
        <ol className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {MOMENTS.map((m, i) => (
            <li key={m.when} className="relative rounded-[1.4rem] bg-cream p-5">
              <p className="flex items-center gap-2 text-[14px] font-extrabold tracking-wider text-muted uppercase">
                <span aria-hidden className={cx("size-3 rounded-full", m.dot)} />
                {m.when}
              </p>
              <p className="mt-2 text-[18px] leading-snug font-extrabold">{m.what}</p>
              {i < MOMENTS.length - 1 && (
                <span aria-hidden className="absolute top-1/2 -right-3.5 hidden text-2xl font-black text-carrot/50 sm:block">
                  ›
                </span>
              )}
            </li>
          ))}
        </ol>
      </Reveal>

      <div className="mt-14 grid grid-cols-1 items-start gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16">
        <Reveal>
          <PortionsDemo />
        </Reveal>
        <Reveal delay={120} className="flex flex-col items-center gap-8 sm:flex-row sm:items-start lg:flex-col lg:items-start">
          <Phone
            src="frigo"
            size="w-[min(70vw,250px)]"
            className="rotate-[-2deg]"
            alt="L'écran Frigo : dans À utiliser, 300 g de tofu d'un wok pas cuisiné avec une idée de recette, et dans Restes, 3 portions de curry de pois chiches, bon jusqu'au samedi 31 octobre, avec Planifier et Jeté."
          />
          <div>
            <ul className="space-y-2.5">
              {FEATURES.map((f) => (
                <li key={f} className="flex gap-3 text-[16px] leading-snug font-semibold">
                  <span aria-hidden className="mt-2 size-2 shrink-0 rounded-full bg-carrot" />
                  {f}
                </li>
              ))}
            </ul>
            <p className="mt-5 rounded-2xl bg-cream p-4 text-[15px] leading-snug text-muted">
              La date affichée vient de la durée de conservation notée dans la recette. Elle aide à ne rien oublier,
              elle ne remplace ni ton nez ni les indications de l'emballage.
            </p>
            <Note className="mt-6 text-[19px]" tilt={-1.5}>
              {fr`Le meilleur repas de demain ? Parfois, c'est celui que tu as déjà cuisiné aujourd'hui.`}
            </Note>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
