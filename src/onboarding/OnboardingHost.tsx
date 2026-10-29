// Loaded on demand: the welcome card, then the tour on the real screens.
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useMe, useSession } from "../lib/session";
import { useRun } from "../lib/toast";
import { Button, Sheet } from "../components/ui";
import { tourSteps } from "./steps";
import { runTour } from "./tour";
import { FamilySetup } from "./FamilySetup";
import { useT } from "../i18n/useT";

export default function OnboardingHost({ welcome }: { welcome: boolean }) {
  const { token, account } = useSession();
  const me = useMe();
  const navigate = useNavigate();
  const location = useLocation();
  const finish = useMutation(api.onboarding.finish);
  const run = useRun();
  const { t, lang } = useT();
  const [phase, setPhase] = useState<"welcome" | "tour" | "done">(
    welcome ? "welcome" : "tour",
  );

  // The tour reads the current path between two steps, after React re-rendered
  const path = useRef(location.pathname);
  path.current = location.pathname;

  const end = useCallback(() => {
    setPhase("done");
    if (token) void run(() => finish({ token }));
  }, [finish, run, token]);

  useEffect(() => {
    if (phase !== "tour") return;
    return runTour({
      steps: tourSteps(
        account?.role === "admin",
        window.matchMedia("(min-width: 1024px)").matches,
        lang,
      ),
      lang,
      // Replace: after the tour, « Retour » does not walk back through its screens
      navigate: (to) => navigate(to, { replace: true }),
      currentPath: () => path.current,
      onEnd: end,
    });
    // Started once per tour: navigation during the tour must not restart it
  }, [phase]);

  if (phase !== "welcome") return null;
  // A new admin sets the family up first; the questions replace the welcome card
  if (account?.role === "admin")
    return <FamilySetup onDone={() => setPhase("tour")} onLater={end} />;
  return (
    <Sheet
      open
      onClose={end}
      title={t("common.welcome.title")}
      footer={
        <div className="grid gap-2 pb-3">
          <Button size="lg" onClick={() => setPhase("tour")}>
            {t("common.welcome.start")}
          </Button>
          <Button variant="ghost" onClick={end}>
            {t("common.welcome.later")}
          </Button>
        </div>
      }
    >
      <div className="text-center">
        <div className="mb-3 text-5xl" aria-hidden>
          👋
        </div>
        <p className="text-lg font-black">
          {me
            ? t("common.welcome.hiName", { name: me.name })
            : t("common.welcome.hi")}
        </p>
        <p className="mt-1 text-muted">{t("common.welcome.pitch")}</p>
        <p className="mt-3 text-[15px] text-muted">
          {t("common.welcome.replayHint")}
        </p>
      </div>
    </Sheet>
  );
}
