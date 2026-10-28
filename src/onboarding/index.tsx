// The only parts of the onboarding loaded with the app: they decide from data
// already on the phone, and import the tour (driver.js) or the checklist only
// when the family guide is on and something has to show.
import { lazy, Suspense } from "react";
import { shouldWelcome } from "../../convex/domain/onboarding";
import { useBase, useMe } from "../lib/session";
import { useTourRequests } from "./replay";

// A chunk that cannot load (old cached page after a deploy, offline) shows
// nothing: the guide must never break the app
const Nothing = { default: () => null };
const OnboardingHost = lazy(() => import("./OnboardingHost").catch(() => Nothing));
const FirstSteps = lazy(() => import("./FirstSteps").catch(() => Nothing));

/** Welcome card at the first sign-in, then the tour; mounted once, beside the routes. */
export function OnboardingGate() {
  const base = useBase();
  const me = useMe();
  const requests = useTourRequests();
  if (!base || !me || !base.settings.onboarding) return null;
  const welcome = shouldWelcome(base.settings.onboarding, me.onboardingDoneAt);
  if (!welcome && requests === 0) return null;
  return (
    <Suspense fallback={null}>
      {/* A new key on each « Revoir le guide » starts the tour again */}
      <OnboardingHost key={requests} welcome={welcome && requests === 0} />
    </Suspense>
  );
}

/** « Premiers pas » and « Revoir le guide », in Plus. */
export function FirstStepsEntry() {
  const base = useBase();
  if (!base?.settings.onboarding) return null;
  return (
    <Suspense fallback={null}>
      <FirstSteps />
    </Suspense>
  );
}
