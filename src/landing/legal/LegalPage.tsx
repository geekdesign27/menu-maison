// One legal page (mentions légales, conditions, confidentialité) on the
// landing surface: readable by everyone, in the device's language.
import { formatDayWithYear } from "../../../convex/domain/dates";
import { LangSwitch } from "../../components/LangSwitch";
import { cx } from "../../components/ui";
import { LANDING_HASH, LEGAL_HASHES, type LegalDoc } from "../entry";
import { useL } from "../lang";
import { useLanding } from "../parts";
import { Wordmark } from "../sections/Header";
import { typo } from "../typo";
import { LEGAL, LEGAL_VERSION, SELLER } from "./content";

const DOCS = Object.keys(LEGAL_HASHES) as LegalDoc[];

/** Links to the three legal pages; `current` is marked for screen readers. */
export function LegalNav({
  current,
  className,
}: {
  current?: LegalDoc;
  className?: string;
}) {
  const { l, lang } = useL();
  return (
    <nav aria-label={l("legal.nav")} className={className}>
      <ul className="flex flex-wrap gap-x-2 gap-y-1">
        {DOCS.map((doc) => (
          <li key={doc}>
            <a
              href={LEGAL_HASHES[doc]}
              aria-current={doc === current ? "page" : undefined}
              className={cx(
                "inline-flex min-h-11 items-center rounded-full px-3 text-[16px] font-bold hover:bg-carrot-soft hover:text-carrot-dark",
                doc === current
                  ? "text-carrot-dark underline underline-offset-4"
                  : "text-muted",
              )}
            >
              {LEGAL[lang][doc].title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function LegalPage({ doc }: { doc: LegalDoc }) {
  const { l, lang } = useL();
  const { signedIn } = useLanding();
  const text = LEGAL[lang][doc];
  // A signed-in phone (from Réglages) goes back to its app, a visitor to the landing page
  const back = signedIn ? { href: "#/", label: l("legal.app") } : { href: LANDING_HASH, label: l("legal.home") };
  // French gets its typography (non-breaking spaces before « : ; ? ! »)
  const t = (s: string) => (lang === "fr" ? typo(s) : s);

  return (
    <div className="lp min-h-dvh bg-cream text-ink">
      <header className="pt-safe border-b border-line">
        <div className="mx-auto flex max-w-[760px] items-center gap-3 px-4 py-3 sm:px-6">
          <a
            href={LANDING_HASH}
            aria-label={l("legal.home")}
            className="mr-auto rounded-xl"
          >
            <Wordmark compact />
          </a>
          <LangSwitch />
        </div>
      </header>

      <main
        id="contenu"
        className="mx-auto max-w-[760px] px-4 pt-10 pb-12 sm:px-6"
      >
        <h1 className="text-[34px] leading-tight font-black tracking-tight sm:text-[42px]">
          {text.title}
        </h1>
        <p className="mt-3 text-[15px] text-muted">
          {l("legal.version", { date: formatDayWithYear(LEGAL_VERSION, lang) })}
          {lang === "de" && <> · {l("legal.binding")}</>}
        </p>

        {text.sections.map((section) => (
          <section key={section.heading} className="mt-9">
            <h2 className="text-[21px] font-black tracking-tight">
              {t(section.heading)}
            </h2>
            {section.paragraphs?.map((p) => (
              <p
                key={p}
                className="mt-3 text-[17px] leading-relaxed text-ink/85"
              >
                {t(p)}
              </p>
            ))}
            {section.items && (
              <ul className="mt-3 grid list-disc gap-2 pl-6 text-[17px] leading-relaxed text-ink/85">
                {section.items.map((item) => (
                  <li key={item}>{t(item)}</li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <p className="mt-10 rounded-2xl bg-paper p-5 text-[16px] ring-1 ring-line">
          {SELLER.name} · {SELLER.street} · {SELLER.city} ·{" "}
          <a
            href={`mailto:${SELLER.email}`}
            className="font-bold text-carrot-dark underline underline-offset-4"
          >
            {SELLER.email}
          </a>
        </p>
      </main>

      <footer className="border-t border-line pb-[calc(env(safe-area-inset-bottom)+2rem)]">
        <div className="mx-auto flex max-w-[760px] flex-col gap-2 px-4 pt-6 sm:px-6">
          <LegalNav current={doc} />
          <a
            href={back.href}
            className="inline-flex min-h-11 w-fit items-center rounded-full px-3 text-[16px] font-bold text-carrot-dark hover:bg-carrot-soft"
          >
            {back.label}
          </a>
        </div>
      </footer>
    </div>
  );
}
