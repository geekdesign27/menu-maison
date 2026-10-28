import { LogoSymbol } from "../../components/Logo";
import { cx } from "../../components/ui";
import { Carrot, ListPad, Pot, Star } from "../doodles";
import { Heading, pill, Reveal, SectionLink, useLogin } from "../parts";
import { useL } from "../lang";
import type { LandingKey } from "../i18n";
import { NAV, Wordmark } from "./Header";

export function FinalCta() {
  const { l } = useL();
  const login = useLogin(l("closing.login"));
  return (
    <section id="fin" aria-labelledby="fin-titre" className="relative overflow-hidden bg-carrot-soft py-24 sm:py-32">
      <LogoSymbol
        size={560}
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-brand/[0.07]"
      />
      <Carrot className="absolute top-10 left-[8%] hidden size-16 rotate-[-18deg] sm:block" />
      <Pot className="absolute right-[9%] bottom-14 hidden size-16 text-carrot-dark/60 sm:block" />
      <ListPad className="absolute top-16 right-[14%] hidden size-12 rotate-[10deg] text-herb/70 md:block" />
      <Star className="absolute bottom-20 left-[16%] hidden size-8 text-sun md:block" />
      <Reveal className="relative mx-auto max-w-2xl px-4 text-center">
        <Heading id="fin" className="text-[clamp(2.4rem,6.5vw,4.4rem)]">
          {l("closing.title")}
        </Heading>
        <p className="mx-auto mt-6 max-w-lg text-lg leading-relaxed text-ink/80 sm:text-xl">
          {l("closing.lead")}
        </p>
        <a href={login.href} className={cx(pill.primary, pill.large, "mt-10")}>
          {login.label}
        </a>
        <p className="mt-4 text-[15px] font-bold text-muted">{l("closing.private")}</p>
      </Reveal>
    </section>
  );
}

export function Footer() {
  const { l } = useL();
  const login = useLogin();
  const links: { to: string; labelKey: LandingKey }[] = [{ to: "haut", labelKey: "closing.top" }, NAV[0], NAV[2]];
  return (
    <footer className="bg-cream pt-14 pb-[calc(env(safe-area-inset-bottom)+2.5rem)]">
      <div className="mx-auto flex max-w-[1160px] flex-col gap-8 px-4 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div>
          <Wordmark />
          <p className="mt-3 text-[16px] font-semibold text-muted">{l("closing.tagline")}</p>
        </div>
        <nav aria-label={l("closing.footerNav")}>
          <ul className="flex flex-wrap gap-x-2 gap-y-1">
            {links.map((link) => (
              <li key={link.to}>
                <SectionLink
                  to={link.to}
                  className="inline-flex min-h-11 items-center rounded-full px-3 text-[16px] font-bold text-ink/80 hover:bg-carrot-soft hover:text-carrot-dark"
                >
                  {l(link.labelKey)}
                </SectionLink>
              </li>
            ))}
            <li>
              <a
                href={login.href}
                className="inline-flex min-h-11 items-center rounded-full px-3 text-[16px] font-bold text-carrot-dark hover:bg-carrot-soft"
              >
                {login.label}
              </a>
            </li>
          </ul>
        </nav>
      </div>
      <div className="mx-auto mt-10 max-w-[1160px] border-t border-line px-4 pt-6 text-[15px] text-muted sm:px-6">
        <p className="font-bold text-ink/80">{l("closing.credit")}</p>
        <p className="mt-1">{l("closing.coffee")}</p>
      </div>
    </footer>
  );
}
