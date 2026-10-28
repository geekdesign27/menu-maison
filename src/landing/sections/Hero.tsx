import type { CSSProperties } from "react";
import { Check } from "lucide-react";
import { ChainMark } from "../../components/shopping/chains";
import { cx } from "../../components/ui";
import { CurlyArrow, Squiggle, Star } from "../doodles";
import { pill, Phone, SectionLink, useLogin } from "../parts";
import { fr } from "../typo";

const tilt = (deg: number, delay = 0) =>
  ({ "--lp-tilt": `${deg}deg`, "--lp-delay": `${delay}s` }) as CSSProperties;

// Same week as the screenshot behind it (demo family Martin, Aldi Marly)
const LIST = [
  { label: "Tresse au beurre", qty: "240 g", done: true },
  { label: "Carottes", qty: "700 g", done: true },
  { label: "Lait de coco", qty: "300 ml", done: false },
];

function ShoppingCard() {
  return (
    <div
      className="lp-rise absolute bottom-6 -left-2 w-[214px] rounded-[1.4rem] bg-paper p-4 shadow-[0_18px_40px_-18px_rgba(43,36,32,0.45)] sm:-left-10 sm:w-[236px] lg:-left-20"
      style={tilt(-5, 0.35)}
      aria-hidden
    >
      <div className="flex items-center gap-2 text-[14px] font-extrabold">
        <ChainMark chain="Aldi" size={22} />
        Liste de courses
      </div>
      <div className="mt-2 flex items-end justify-between">
        <p className="text-[26px] leading-none font-black">
          31<span className="text-[15px] text-muted"> / 53</span>
        </p>
        <p className="text-[13px] font-extrabold">{fr`env. CHF 114.60`}</p>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-line">
        <div className="h-full w-[58%] rounded-full bg-carrot" />
      </div>
      <ul className="mt-3 space-y-1.5">
        {LIST.map((i) => (
          <li key={i.label} className="flex items-center gap-2 text-[14px]">
            <span
              className={cx(
                "flex size-5 shrink-0 items-center justify-center rounded-full",
                i.done ? "bg-herb text-white" : "ring-2 ring-line",
              )}
            >
              {i.done && <Check size={13} strokeWidth={3.4} />}
            </span>
            <span className={cx("flex-1 font-bold", i.done && "text-muted line-through")}>{i.label}</span>
            <span className="rounded-md bg-carrot-soft px-1.5 text-[12px] font-extrabold text-carrot-dark">
              {fr`${i.qty}`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PortionsBadge() {
  return (
    <div
      className="lp-rise absolute -top-14 -right-2 max-w-[210px] rounded-2xl bg-herb-soft px-3.5 py-2.5 shadow-[0_14px_30px_-18px_rgba(43,36,32,0.45)] sm:-right-10 lg:top-[22rem] lg:-right-24"
      style={tilt(4, 0.55)}
      aria-hidden
    >
      <p className="text-[14px] font-extrabold text-ink">🍝 Lasagnes de mercredi</p>
      <p className="mt-0.5 text-[13px] font-bold text-[color-mix(in_srgb,var(--color-herb)_70%,black)]">{fr`6 portions, dont 2 pour jeudi midi`}</p>
    </div>
  );
}

export function Hero() {
  const login = useLogin();
  return (
    <section id="haut" aria-labelledby="haut-titre" className="relative overflow-hidden pt-6 pb-20 sm:pt-10 sm:pb-28">
      <div className="lp-dots pointer-events-none absolute inset-y-0 right-0 hidden w-[42%] rounded-bl-[5rem] opacity-70 lg:block" />
      <div className="relative mx-auto grid max-w-[1160px] grid-cols-1 items-center gap-14 px-4 sm:px-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:gap-10">
        <div>
          <p
            className="lp-tilt inline-block rounded-full bg-carrot-soft px-4 py-1.5 text-[15px] font-extrabold text-carrot-dark"
            style={tilt(-2)}
          >
            La cuisine familiale, sans réunion de crise.
          </p>
          <h1
            id="haut-titre"
            tabIndex={-1}
            className="mt-6 text-[clamp(2.5rem,7.4vw,4.15rem)] leading-[1] font-black tracking-[-0.035em] text-pretty outline-none"
          >
            {fr`Le « on mange quoi ce soir ? » a enfin `}
            <span className="relative inline-block whitespace-nowrap">
              une réponse
              <Squiggle className="absolute -bottom-2 left-0 h-[0.26em] w-full text-brand" />
            </span>
            .
          </h1>
          <p className="mt-7 max-w-[33rem] text-lg leading-relaxed text-muted sm:text-xl">
            Planifie les repas de la semaine, retrouve tes recettes, écoute les envies de toute la famille et
            prépare tes courses sans te prendre la tête. Même les restes ont leur place.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a href={login.href} className={cx(pill.primary, pill.large)}>
              {login.label}
            </a>
            <SectionLink to="fonctionnement" className={cx(pill.secondary, pill.large)}>
              Découvrir comment ça marche
            </SectionLink>
          </div>
          <div className="mt-8 flex items-start gap-2">
            <p
              className="lp-tilt max-w-[19rem] text-[17px] leading-snug font-semibold text-carrot-dark italic"
              style={tilt(-2)}
            >
              {fr`Attention : risque élevé de savoir ce qu'on mange jeudi.`}
            </p>
            <CurlyArrow className="mt-1 hidden h-14 w-20 shrink-0 text-brand lg:block" />
          </div>
        </div>

        <div className="relative mx-auto mt-6 w-fit lg:mt-0">
          <Star className="absolute -top-6 left-2 hidden size-9 text-sun sm:block" />
          <Star className="absolute right-0 -bottom-4 hidden size-6 text-brand sm:block" />
          <Phone
            src="semaine"
            priority
            size="w-[min(74vw,300px)]"
            className="lp-rise"
            style={tilt(2, 0.1)}
            alt="La Semaine dans Menu Maison : 16 plats prévus, environ 117.85 francs estimés chez Aldi Marly, les envies de la famille, puis samedi 24 octobre avec une raclette pour 3 le soir."
          />
          <ShoppingCard />
          <PortionsBadge />
        </div>
      </div>
    </section>
  );
}
