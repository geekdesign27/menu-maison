// Public landing page of menumaison.ch: static content and local examples only.
// It loads no Convex client and reads no family data.
import { useEffect, useMemo, useState } from "react";
import "@fontsource-variable/nunito/wght-italic.css";
import "./landing.css";
import { hasStoredToken } from "../lib/device";
import { useDeviceLang } from "../lib/deviceLang";
import { localeOf } from "../../convex/domain/lang";
import { UiLangProvider } from "../components/ui";
import { landingText, LandingLangContext } from "./lang";
import { contactHref, LANDING_HASH, opensNoInvite } from "./entry";
import { LandingContext, type LandingValue } from "./parts";
import { Budget } from "./sections/Budget";
import { FinalCta, Footer } from "./sections/Closing";
import { FamilySync } from "./sections/FamilySync";
import { Features } from "./sections/Features";
import { Header } from "./sections/Header";
import { Hero } from "./sections/Hero";
import { HowItWorks } from "./sections/HowItWorks";
import { Leftovers } from "./sections/Leftovers";
import { NoInviteDialog, PrivateAccess } from "./sections/PrivateAccess";
import { Problem } from "./sections/Problem";
import { RecipesWishes } from "./sections/RecipesWishes";
import { StoreJourney } from "./sections/StoreJourney";
import { Themes } from "./sections/Themes";

const CONTACT = contactHref(
  import.meta.env.VITE_CONTACT_URL as string | undefined,
);

export function Landing() {
  const lang = useDeviceLang();
  const [noInvite, setNoInvite] = useState(() =>
    opensNoInvite(window.location.hash),
  );

  // Linked from the sign-in screen: #/sans-invitation opens the message
  useEffect(() => {
    const onChange = () => {
      if (opensNoInvite(window.location.hash)) setNoInvite(true);
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const close = () => {
    setNoInvite(false);
    // A reload must not reopen it
    if (opensNoInvite(window.location.hash))
      history.replaceState(null, "", LANDING_HASH);
  };

  const value = useMemo<LandingValue>(
    () => ({
      signedIn: hasStoredToken(),
      contact: CONTACT,
      openNoInvite: () => setNoInvite(true),
    }),
    [],
  );

  // Tab title and page language follow the FR | DE switch
  useEffect(() => {
    document.title = landingText(lang, "shell.title");
    document.documentElement.lang = localeOf(lang);
  }, [lang]);

  return (
    <LandingLangContext.Provider value={lang}>
      <UiLangProvider lang={lang}>
        <LandingContext.Provider value={value}>
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
              <PrivateAccess />
              <FinalCta />
            </main>
            <Footer />
            <NoInviteDialog open={noInvite} onClose={close} />
          </div>
        </LandingContext.Provider>
      </UiLangProvider>
    </LandingLangContext.Provider>
  );
}
