// Loaded on demand in Plus: the « Premiers pas » checklist, ticked from what the
// member did in the app, and « Revoir le guide ».
import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { Check, ChevronRight } from "lucide-react";
import { api } from "../../convex/_generated/api";
import {
  firstSteps,
  showChecklist,
  type FirstStepId,
} from "../../convex/domain/onboarding";
import { useBase, useMe, useSession } from "../lib/session";
import { Card, cx } from "../components/ui";
import { requestTour } from "./replay";

const STEP_TEXT: Record<
  FirstStepId,
  { label: string; hint: string; to?: string }
> = {
  homeScreen: {
    label: "Ajouter l'app à l'écran d'accueil",
    hint: "Dans le navigateur : Partager, puis « Sur l'écran d'accueil ».",
  },
  photo: {
    label: "Mettre ta photo",
    hint: "Réglages, puis ton profil.",
    to: "/reglages",
  },
  likes: {
    label: "Mettre un cœur à 5 recettes",
    hint: "Recettes, Découvrir.",
    to: "/recettes",
  },
  wish: {
    label: "Noter une envie",
    hint: "Un plat qui te ferait plaisir.",
    to: "/envies",
  },
  meal: {
    label: "Ajouter un plat dans la semaine",
    hint: "Semaine, « + Ajouter ».",
    to: "/",
  },
  check: {
    label: "Cocher un article des courses",
    hint: "Courses, pendant les achats.",
    to: "/courses",
  },
  status: {
    label: "Dire comment s'est passé un plat",
    hint: "Toucher un plat : Mangé, Pas mangé, Il en reste…",
    to: "/",
  },
};

/** The home screen step only makes sense on a phone; it is known on this device only. */
function homeScreenState(): "done" | "todo" | "n/a" {
  const installed =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true;
  if (installed) return "done";
  return window.matchMedia("(pointer: coarse)").matches ? "todo" : "n/a";
}

export default function FirstSteps() {
  const { token } = useSession();
  const base = useBase();
  const me = useMe();
  const facts = useQuery(api.onboarding.facts, token ? { token } : "skip");
  if (!base || !me) return null;
  const steps = facts ? firstSteps(facts, homeScreenState()) : [];
  const visible =
    facts &&
    showChecklist(base.settings.onboarding, me.onboardingDoneAt, steps);
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <div className="mb-3 grid gap-3">
      {visible && (
        <Card className="p-4">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-lg font-black">Premiers pas</h2>
            <span className="text-[15px] font-bold text-muted">
              {doneCount} sur {steps.length}
            </span>
          </div>
          <ul className="mt-2 divide-y divide-line">
            {steps.map((step) => {
              const text = STEP_TEXT[step.id];
              const progress =
                step.progress && !step.done && step.progress.count > 0
                  ? ` (${step.progress.count} sur ${step.progress.goal})`
                  : "";
              const content = (
                <>
                  <span
                    className={cx(
                      "flex size-7 shrink-0 items-center justify-center rounded-full",
                      step.done ? "bg-herb text-white" : "ring-2 ring-line",
                    )}
                    aria-hidden
                  >
                    {step.done && <Check size={18} strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cx(
                        "block font-extrabold",
                        step.done && "text-muted line-through",
                      )}
                    >
                      <span className="sr-only">{step.done ? "Fait : " : "À faire : "}</span>
                      {text.label}
                      {progress}
                    </span>
                    {!step.done && (
                      <span className="block text-[15px] text-muted">
                        {text.hint}
                      </span>
                    )}
                  </span>
                  {!step.done && text.to && (
                    <ChevronRight className="text-muted" aria-hidden />
                  )}
                </>
              );
              const row = "flex min-h-12 items-center gap-3 py-2";
              return (
                <li key={step.id}>
                  {!step.done && text.to ? (
                    <Link to={text.to} className={row}>
                      {content}
                    </Link>
                  ) : (
                    <div className={row}>{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}
      <Card onClick={requestTour} className="flex items-center gap-4 p-4">
        <span
          className="flex size-12 items-center justify-center rounded-2xl bg-carrot-soft text-2xl"
          aria-hidden
        >
          🧭
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-black">Revoir le guide</span>
          <span className="block text-[15px] text-muted">
            Le tour de l'app en 1 minute
          </span>
        </span>
        <ChevronRight className="text-muted" />
      </Card>
    </div>
  );
}
