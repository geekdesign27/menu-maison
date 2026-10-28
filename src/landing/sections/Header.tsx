import { useEffect, useState } from "react";
import { LogoSymbol } from "../../components/Logo";
import { cx } from "../../components/ui";
import { pill, SectionLink, useLogin } from "../parts";

export const NAV = [
  { to: "fonctionnement", label: "Fonctionnement" },
  { to: "astuces", label: "Les petites astuces" },
  { to: "acces", label: "Accès privé" },
];

/** Logo and name, as on the app icon: the smiling « m » with its fork. */
export function Wordmark({ size = 36 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className="flex shrink-0 items-center justify-center bg-brand text-white"
        style={{ width: size, height: size, borderRadius: size * 0.22 }}
        aria-hidden
      >
        <LogoSymbol size={size * 0.77} micro={size < 32} />
      </span>
      <span className="text-[19px] font-extrabold tracking-tight whitespace-nowrap lowercase">menu maison</span>
    </span>
  );
}

export function Header() {
  const login = useLogin();
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
        <SectionLink to="haut" aria-label="Menu Maison, retour en haut" className="mr-auto rounded-xl">
          <Wordmark />
        </SectionLink>
        <nav aria-label="Sections de la page" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV.map((item) => (
              <li key={item.to}>
                <SectionLink
                  to={item.to}
                  className="inline-flex min-h-11 items-center rounded-full px-3.5 text-[16px] font-bold whitespace-nowrap text-ink/80 transition hover:bg-carrot-soft hover:text-carrot-dark"
                >
                  {item.label}
                </SectionLink>
              </li>
            ))}
          </ul>
        </nav>
        <a href={login.href} className={cx(pill.primary, "min-h-11 px-4 text-[16px] whitespace-nowrap sm:px-5")}>
          {login.label}
        </a>
      </div>
    </header>
  );
}
