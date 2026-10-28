import { useEffect, useState } from "react";
import { MoreVertical, Share, SquarePlus } from "lucide-react";
import { shouldWelcome } from "../../convex/domain/onboarding";
import { useBase, useMe } from "../lib/session";
import {
  installSeen,
  markInstallSeen,
  OPEN_INSTALL,
  promptInstall,
  useInstallWay,
} from "../lib/install";
import { useT } from "../i18n/useT";
import { Button, Sheet } from "./ui";
import { AppIcon } from "./Logo";

// After the welcome card, so the two never stack
const DELAY_MS = 1500;

/**
 * « Ajoute Menu Maison à ton écran d'accueil »: once per phone after the first
 * sign-in, and again from « Premiers pas ». Never on a computer or in the app
 * already added.
 */
export function InstallPrompt() {
  const base = useBase();
  const me = useMe();
  const way = useInstallWay();
  const { t } = useT();
  const [open, setOpen] = useState(false);

  const welcoming =
    !!base &&
    !!me &&
    shouldWelcome(base.settings.onboarding, me.onboardingDoneAt);
  const firstTime =
    !!me &&
    !welcoming &&
    !installSeen() &&
    (way === "prompt" || way === "ios" || way === "manual");

  useEffect(() => {
    if (!firstTime) return;
    const timer = window.setTimeout(() => {
      markInstallSeen();
      setOpen(true);
    }, DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [firstTime]);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_INSTALL, onOpen);
    return () => window.removeEventListener(OPEN_INSTALL, onOpen);
  }, []);

  if (!open || way === "installed") return null;
  const close = () => setOpen(false);

  return (
    <Sheet
      open
      onClose={close}
      title={t("install.title")}
      footer={
        way === "prompt" ? (
          <div className="grid gap-2">
            <Button size="lg" onClick={() => void promptInstall().then(close)}>
              <SquarePlus size={22} /> {t("install.add")}
            </Button>
            <Button variant="ghost" onClick={close}>
              {t("install.later")}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={close}>
              {t("install.later")}
            </Button>
            <Button onClick={close}>{t("install.done")}</Button>
          </div>
        )
      }
    >
      <div className="grid gap-4">
        <div className="flex items-center gap-4">
          <AppIcon size={64} />
          <p className="text-[17px] leading-snug">{t("install.why")}</p>
        </div>
        {way === "ios" && (
          <ol className="grid gap-3">
            <Step n={1}>
              {t("install.ios1")}{" "}
              <Share
                size={20}
                className="inline align-[-3px] text-carrot"
                aria-hidden
              />
            </Step>
            <Step n={2}>{t("install.ios2")}</Step>
            <Step n={3}>{t("install.ios3")}</Step>
          </ol>
        )}
        {way === "manual" && (
          <ol className="grid gap-3">
            <Step n={1}>
              {t("install.manual1")}{" "}
              <MoreVertical
                size={20}
                className="inline align-[-3px] text-carrot"
                aria-hidden
              />
            </Step>
            <Step n={2}>{t("install.manual2")}</Step>
          </ol>
        )}
        {way === "ios" && (
          <p className="text-[15px] text-muted">{t("install.iosAfter")}</p>
        )}
        {way === "desktop" && (
          <p className="text-[15px] text-muted">{t("install.desktop")}</p>
        )}
      </div>
    </Sheet>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-[17px]">
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-carrot-soft font-black text-carrot-dark"
        aria-hidden
      >
        {n}
      </span>
      <span className="pt-1">{children}</span>
    </li>
  );
}
