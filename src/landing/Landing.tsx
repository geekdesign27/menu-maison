// Public landing page of menumaison.ch: static content and local examples only.
// It loads no Convex client and reads no family data.
import { useEffect, useMemo, useState } from "react";
import { siteTitle } from "../lib/siteEnv";
import "@fontsource-variable/nunito/wght-italic.css";
import "./landing.css";
import { hasStoredToken } from "../lib/device";
import { useDeviceLang } from "../lib/deviceLang";
import { localeOf } from "../../convex/domain/lang";
import { UiLangProvider } from "../components/ui";
import { landingText, LandingLangContext } from "./lang";
import { contactHref, legalDocFor, opensPricing, PRICING_ID, signupVisible } from "./entry";
import { LegalPage } from "./legal/LegalPage";
import { clickEventOf, track } from "../lib/visits";
import { LEGAL } from "./legal/content";
import { LandingContext, type LandingValue } from "./parts";
import { Budget } from "./sections/Budget";
import { FinalCta, Footer } from "./sections/Closing";
import { FamilySync } from "./sections/FamilySync";
import { Features } from "./sections/Features";
import { Header } from "./sections/Header";
import { Hero } from "./sections/Hero";
import { HowItWorks } from "./sections/HowItWorks";
import { Leftovers } from "./sections/Leftovers";
import { Pricing, Training } from "./sections/Offer";
import { Problem } from "./sections/Problem";
import { RecipesWishes } from "./sections/RecipesWishes";
import { StoreJourney } from "./sections/StoreJourney";
import { Themes } from "./sections/Themes";

const CONTACT = contactHref(
  import.meta.env.VITE_CONTACT_URL as string | undefined,
);
const SIGNUP_OPEN = signupVisible(
  import.meta.env.VITE_SIGNUP_OPEN as string | undefined,
  import.meta.env.DEV,
);

export function Landing() {
  const lang = useDeviceLang();
  // A legal page or the landing page itself, from the address
  const [legal, setLegal] = useState(() => legalDocFor(window.location.hash));
  // « Je n'ai pas de compte » (sign-in screen) and Stripe's cancel link: #/tarif opens at the price
  useEffect(() => {
    const toPricing = () => {
      setLegal(legalDocFor(window.location.hash));
      // A plain scroll: no focus ring on a heading nobody tabbed to
      if (opensPricing(window.location.hash))
        requestAnimationFrame(() =>
          document.getElementById(PRICING_ID)?.scrollIntoView({ block: "start" }),
        );
    };
    toPricing();
    window.addEventListener("hashchange", toPricing);
    return () => window.removeEventListener("hashchange", toPricing);
  }, []);

  const value = useMemo<LandingValue>(
    () => ({
      signedIn: hasStoredToken(),
      contact: CONTACT,
      signupOpen: SIGNUP_OPEN,
    }),
    [],
  );

  // Visit statistics (lib/visits.ts), on the landing page itself (not the legal
  // pages): a visit per page load, and the counted buttons
  useEffect(() => {
    if (legal) return;
    track("visit", lang);
    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      // A press on the active language changes nothing: not counted
      const switched = target?.closest("[data-lang-switch] button");
      if (switched) {
        if (switched.getAttribute("aria-pressed") !== "true") track("lang", lang);
        return;
      }
      const event = clickEventOf(target?.closest("a")?.getAttribute("href") ?? null, CONTACT);
      if (event) track(event, lang);
    };
    // Capture: the in-page links stop the default action, not the event
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [legal, lang]);

  // Another page of the same surface starts at the top (main.tsx does it between
  // surfaces), or at the price for #/tarif, once the landing page is drawn again
  useEffect(() => {
    if (opensPricing(window.location.hash))
      document.getElementById(PRICING_ID)?.scrollIntoView({ block: "start" });
    else window.scrollTo(0, 0);
  }, [legal]);

  // Tab title and page language follow the FR | DE switch
  useEffect(() => {
    document.title = siteTitle(legal ? `${LEGAL[lang][legal].title} · Menu Maison` : landingText(lang, "shell.title"));
    document.documentElement.lang = localeOf(lang);
  }, [lang, legal]);

  return (
    <LandingLangContext.Provider value={lang}>
      <UiLangProvider lang={lang}>
        <LandingContext.Provider value={value}>
          {legal ? (
            <LegalPage doc={legal} />
          ) : (
          <div className="lp bg-cream text-ink">
            <a
              href="#contenu"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById("haut-titre")?.focus();
              }}
              className="sr-only z-50 rounded-full bg-ink px-4 py-2 font-bold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
            >
              {landingText(lang, "shell.skip")}
            </a>
            <Header />
            <main id="contenu">
              <Hero />
              <Problem />
              <HowItWorks />
              <StoreJourney />
              <RecipesWishes />
              <Leftovers />
              <Budget />
              <FamilySync />
              <Themes />
              <Features />
              <Pricing />
              <Training />
              <FinalCta />
            </main>
            <Footer />
          </div>
          )}
        </LandingContext.Provider>
      </UiLangProvider>
    </LandingLangContext.Provider>
  );
}
