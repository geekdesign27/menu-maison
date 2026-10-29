import { useEffect, useState } from "react";
import { LogoSymbol } from "../../components/Logo";
import { cx } from "../../components/ui";
import { pill, SectionLink, useLogin } from "../parts";
import { LangSwitch } from "../../components/LangSwitch";
import type { LandingKey } from "../i18n";
import { useL } from "../lang";

export const NAV = [
  { to: "fonctionnement", labelKey: "shell.navHow" },
  { to: "astuces", labelKey: "shell.navTips" },
  { to: "tarif", labelKey: "shell.navPricing" },
] as const satisfies readonly { to: string; labelKey: LandingKey }[];

/** Logo and name, as on the app icon: the smiling « m » with its fork. */
export function Wordmark({ size = 36, compact = false }: { size?: number; compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className="flex shrink-0 items-center justify-center bg-brand text-white"
        style={{ width: size, height: size, borderRadius: size * 0.22 }}
        aria-hidden
      >
        <LogoSymbol size={size * 0.77} micro={size < 32} />
      </span>
      {/* compact: the name gives way to the FR | DE switch on narrow phones (logo kept) */}
      <span
        className={cx(
          "text-[19px] font-extrabold tracking-tight whitespace-nowrap lowercase",
          compact && "hidden min-[430px]:inline",
        )}
      >
        menu maison
      </span>
    </span>
  );
}

export function Header() {
  const login = useLogin();
  const { l } = useL();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cx(
        "pt-safe sticky top-0 z-40 transition-[background-color,box-shadow] duration-300",
        scrolled ? "bg-cream/92 shadow-[0_1px_0_var(--color-line)] backdrop-blur" : "bg-transparent",
      )}
    >
      <div
        className={cx(
          "mx-auto flex max-w-[1160px] items-center gap-3 px-4 transition-[padding] duration-300 sm:px-6",
          scrolled ? "py-2" : "py-3 sm:py-4",
        )}
      >
        <SectionLink to="haut" aria-label={l("shell.home")} className="mr-auto rounded-xl">
          <Wordmark compact />
        </SectionLink>
        <nav aria-label={l("shell.sections")} className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV.map((item) => (
              <li key={item.to}>
                <SectionLink
                  to={item.to}
                  className="inline-flex min-h-11 items-center rounded-full px-3.5 text-[16px] font-bold whitespace-nowrap text-ink/80 transition hover:bg-carrot-soft hover:text-carrot-dark"
                >
                  {l(item.labelKey)}
                </SectionLink>
              </li>
            ))}
          </ul>
        </nav>
        <LangSwitch />
        <a href={login.href} className={cx(pill.primary, "min-h-11 px-4 text-[16px] whitespace-nowrap sm:px-5")}>
          {/* Short on phones: the logo, the FR | DE switch and the button share 375 px */}
          <span className="sm:hidden">{login.short}</span>
          <span className="hidden sm:inline">{login.label}</span>
        </a>
      </div>
    </header>
  );
}
