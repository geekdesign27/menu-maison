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

export default function OnboardingHost({ welcome }: { welcome: boolean }) {
  const { token, account } = useSession();
  const me = useMe();
  const navigate = useNavigate();
  const location = useLocation();
  const finish = useMutation(api.onboarding.finish);
  const run = useRun();
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
      ),
      // Replace: after the tour, « Retour » does not walk back through its screens
      navigate: (to) => navigate(to, { replace: true }),
      currentPath: () => path.current,
      onEnd: end,
    });
    // Started once per tour: navigation during the tour must not restart it
  }, [phase]);

  if (phase !== "welcome") return null;
  return (
    <Sheet
      open
      onClose={end}
      title="Bienvenue"
      footer={
        <div className="grid gap-2 pb-3">
          <Button size="lg" onClick={() => setPhase("tour")}>
            Commencer
          </Button>
          <Button variant="ghost" onClick={end}>
            Plus tard
          </Button>
        </div>
      }
    >
      <div className="text-center">
        <div className="mb-3 text-5xl" aria-hidden>
          👋
        </div>
        <p className="text-lg font-black">
          {me ? `Salut ${me.name} !` : "Salut !"}
        </p>
        <p className="mt-1 text-muted">
          1 minute pour faire le tour ? On te montre où poser un plat, où sont
          les courses, le frigo et les recettes.
        </p>
        <p className="mt-3 text-[15px] text-muted">
          Tu pourras le revoir quand tu veux : Plus, « Revoir le guide ».
        </p>
      </div>
    </Sheet>
  );
}
