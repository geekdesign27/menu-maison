import { useEffect, useRef, useState } from "react";
import { Check, ShoppingCart } from "lucide-react";
import { cx } from "../../components/ui";
import { FONTS, THEMES, type Font, type Theme } from "../../lib/look";
import { DemoTag, Heading, Note, Reveal, Section } from "../parts";
import { fr } from "../typo";

/** A slice of the Semaine screen, drawn with the app's own colour variables. */
function Preview({ font }: { font: string }) {
  return (
    <div className="rounded-[1.6rem] bg-cream p-4 transition-colors duration-500" style={{ fontFamily: font }}>
      <p className="text-[22px] leading-none font-black text-ink">Semaine</p>
      <p className="mt-1 text-[13px] font-bold text-muted">24 au 30 octobre</p>
      <div className="mt-3 rounded-[1.1rem] bg-paper p-3.5 shadow-sm">
        <div className="flex items-end justify-between">
          <p className="text-[24px] leading-none font-black text-ink">
            16 <span className="block text-[12px] font-bold text-muted">plats prévus</span>
          </p>
          <p className="text-right text-[15px] font-black text-ink">{fr`env. CHF 117.85`}</p>
        </div>
        <span className="mt-3 flex min-h-10 items-center justify-center gap-2 rounded-xl bg-carrot text-[14px] font-extrabold text-white transition-colors duration-500">
          <ShoppingCart size={16} aria-hidden /> Liste de courses
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className="rounded-full bg-carrot-soft px-3 py-1 text-[13px] font-extrabold text-carrot-dark transition-colors duration-500">
          Courses
        </span>
        <span className="rounded-full bg-herb-soft px-3 py-1 text-[13px] font-extrabold text-[color-mix(in_srgb,var(--color-herb)_70%,black)]">+1 frigo</span>
      </div>
    </div>
  );
}

export function Themes() {
  const [theme, setTheme] = useState<Theme>("carotte");
  const [font, setFont] = useState<Font>("nunito");
  const [fontsReady, setFontsReady] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // The three other fonts are only downloaded when this section comes near
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        void Promise.all(FONTS.map((f) => f.load().catch(() => undefined))).then(() => setFontsReady(true));
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const family = FONTS.find((f) => f.id === font)!.family;

  return (
    <Section id="themes" tone="cream">
      <div ref={ref} className="grid grid-cols-1 items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
        <div>
          <Reveal>
            <Heading id="themes">Une application qui se met aux couleurs de la famille.</Heading>
            <p className="mt-6 text-lg leading-relaxed text-muted sm:text-xl">
              {fr`Plutôt Carotte, Sauge ou Myrtille ? Chaque famille peut choisir l'ambiance qui lui plaît et sa police de lecture préférée.`}
            </p>
          </Reveal>

          <Reveal className="mt-9">
            <p id="lp-theme-label" className="text-[15px] font-extrabold text-muted">
              Thème
            </p>
            <div role="radiogroup" aria-labelledby="lp-theme-label" className="mt-2 grid grid-cols-3 gap-2 sm:gap-3">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={theme === t.id}
                  onClick={() => setTheme(t.id)}
                  data-theme={t.id}
                  className={cx(
                    "min-h-11 rounded-2xl bg-cream p-3 text-left ring-2 transition",
                    theme === t.id ? "ring-carrot" : "ring-transparent hover:ring-line",
                  )}
                >
                  <span className="flex items-center justify-between">
                    <span className="text-[16px] font-black text-ink">{t.label}</span>
                    {theme === t.id && (
                      <span className="flex size-5 items-center justify-center rounded-full bg-carrot text-white">
                        <Check size={13} strokeWidth={3.4} aria-hidden />
                      </span>
                    )}
                  </span>
                  <span className="mt-2 flex gap-1" aria-hidden>
                    {t.swatch.slice(1).map((c) => (
                      <span key={c} className="size-4 rounded-full ring-1 ring-black/5" style={{ background: c }} />
                    ))}
                  </span>
                  <span className="mt-2 hidden text-[13px] leading-snug font-semibold text-muted sm:block">
                    {t.description}
                  </span>
                </button>
              ))}
            </div>

            <p id="lp-font-label" className="mt-7 text-[15px] font-extrabold text-muted">
              Police de lecture
            </p>
            <div role="radiogroup" aria-labelledby="lp-font-label" className="mt-2 grid grid-cols-2 gap-2 sm:gap-3">
              {FONTS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  role="radio"
                  aria-checked={font === f.id}
                  onClick={() => setFont(f.id)}
                  className={cx(
                    "min-h-12 rounded-2xl bg-paper px-4 py-2.5 text-left ring-2 transition",
                    font === f.id ? "ring-carrot" : "ring-line/0 hover:ring-line",
                  )}
                  style={fontsReady ? { fontFamily: f.family } : undefined}
                >
                  <span className="block text-[17px] font-extrabold">{f.label}</span>
                  <span className="block text-[13px] text-muted">{f.description}</span>
                </button>
              ))}
            </div>
          </Reveal>
        </div>

        <Reveal delay={120}>
          <div data-theme={theme} className="relative mx-auto max-w-[400px] rounded-[2.2rem] bg-carrot-soft/70 p-5 transition-colors duration-500 sm:p-7">
            <div className="mb-4 flex justify-end">
              <DemoTag>Aperçu, sans toucher aux réglages</DemoTag>
            </div>
            <Preview font={family} />
          </div>
          <Note className="mx-auto mt-8 max-w-sm text-center text-[19px]" tilt={-1.5}>
            {fr`L'organisation, c'est sérieux. La couleur des boutons, un peu moins.`}
          </Note>
        </Reveal>
      </div>
    </Section>
  );
}
