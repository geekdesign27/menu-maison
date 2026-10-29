// Loaded on demand in Plus: the « Premiers pas » checklist, ticked from what the
// member did in the app, and « Revoir le guide ».
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { Check, ChevronRight } from "lucide-react";
import { api } from "../../convex/_generated/api";
import {
  firstSteps,
  ONBOARDING_HABITUAL,
  showChecklist,
  type FirstStepId,
} from "../../convex/domain/onboarding";
import { useBase, useMe, useSession } from "../lib/session";
import { NBSP } from "../../convex/domain/quantities";
import { Card, cx } from "../components/ui";
import { requestTour } from "./replay";
import { useT } from "../i18n/useT";
import type { MessageKey } from "../i18n";
import { isInstalled, OPEN_INSTALL } from "../lib/install";

const STEP_TEXT: Record<
  FirstStepId,
  { label: MessageKey; hint: MessageKey; to?: string }
> = {
  homeScreen: {
    label: "common.steps.homeScreen",
    hint: "common.steps.homeScreenHint",
  },
  email: {
    label: "common.steps.email",
    hint: "common.steps.emailHint",
    to: "/reglages",
  },
  photo: {
    label: "common.steps.photo",
    hint: "common.steps.photoHint",
    to: "/reglages",
  },
  likes: {
    label: "common.steps.likes",
    hint: "common.steps.likesHint",
    to: "/recettes",
  },
  wish: {
    label: "common.steps.wish",
    hint: "common.steps.wishHint",
    to: "/envies",
  },
  meal: {
    label: "common.steps.meal",
    hint: "common.steps.mealHint",
    to: "/",
  },
  check: {
    label: "common.steps.check",
    hint: "common.steps.checkHint",
    to: "/courses",
  },
  status: {
    label: "common.steps.status",
    hint: "common.steps.statusHint",
    to: "/",
  },
  members: {
    label: "common.steps.members",
    hint: "common.steps.membersHint",
    to: "/reglages",
  },
  joined: {
    label: "common.steps.joined",
    hint: "common.steps.joinedHint",
    to: "/reglages",
  },
  week: {
    label: "common.steps.week",
    hint: "common.steps.weekHint",
    to: "/",
  },
  list: {
    label: "common.steps.list",
    hint: "common.steps.listHint",
    to: "/courses",
  },
};

/** The home screen step only makes sense on a phone; it is known on this device only. */
function homeScreenState(): "done" | "todo" | "n/a" {
  if (isInstalled()) return "done";
  return window.matchMedia("(pointer: coarse)").matches ? "todo" : "n/a";
}

export default function FirstSteps() {
  const { token } = useSession();
  const base = useBase();
  const me = useMe();
  const { t } = useT();
  const finish = useMutation(api.onboarding.finish);
  // Habitués never see the checklist: no need to count their actions
  const habitual = me?.onboardingDoneAt === ONBOARDING_HABITUAL;
  const facts = useQuery(
    api.onboarding.facts,
    token && me && !habitual ? { token } : "skip",
  );
  const steps = facts ? firstSteps(facts, homeScreenState()) : [];
  const complete = steps.length > 0 && steps.every((s) => s.done);

  // Complete once is complete for good: undoing an action later does not bring it back.
  // A failed save is retried at the next visit; the card is hidden meanwhile.
  useEffect(() => {
    if (complete && token)
      void finish({ token, checklistDone: true }).catch(() => undefined);
  }, [complete, token, finish]);

  if (!base || !me) return null;
  const visible =
    facts &&
    showChecklist(base.settings.onboarding, me.onboardingDoneAt, steps);
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <div className="mb-3 grid gap-3">
      {visible && (
        <Card className="p-4">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-lg font-black">{t("common.steps.title")}</h2>
            <span className="text-[15px] font-bold text-muted">
              {t("common.steps.count", {
                done: doneCount,
                total: steps.length,
              })}
            </span>
          </div>
          <ul className="mt-2 divide-y divide-line">
            {steps.map((step) => {
              const text = STEP_TEXT[step.id];
              const progress =
                step.progress && !step.done && step.progress.count > 0
                  ? `${NBSP}${t("common.steps.progress", step.progress)}`
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
                      <span className="sr-only">
                        {t(
                          step.done ? "common.steps.done" : "common.steps.todo",
                        )}{" "}
                      </span>
                      {t(text.label)}
                      {progress}
                    </span>
                    {!step.done && (
                      <span className="block text-[15px] text-muted">
                        {t(text.hint)}
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
                  ) : !step.done && step.id === "homeScreen" ? (
                    <button
                      type="button"
                      onClick={() => window.dispatchEvent(new Event(OPEN_INSTALL))}
                      className={cx(row, "w-full text-left")}
                    >
                      {content}
                      <ChevronRight className="text-muted" aria-hidden />
                    </button>
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
          <span className="block text-lg font-black">
            {t("common.steps.replay")}
          </span>
          <span className="block text-[15px] text-muted">
            {t("common.steps.replayText")}
          </span>
        </span>
        <ChevronRight className="text-muted" />
      </Card>
    </div>
  );
}
