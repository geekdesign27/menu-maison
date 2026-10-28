import { Component, type ReactNode } from "react";
import { Button, ErrorBox } from "./ui";
import { useT } from "../i18n/useT";

function isSessionError(error: Error) {
  return error.message.includes("Session expirée");
}

/** Last-resort screen: a crash in one screen never leaves a blank page. */
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    // A session revoked while the app was open: back to the family code screen
    if (isSessionError(error)) {
      try {
        localStorage.removeItem("mm.token");
      } catch {
        // Nothing stored, nothing to clear
      }
      window.location.reload();
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    if (isSessionError(this.state.error)) return null;
    return <CrashScreen />;
  }
}

function CrashScreen() {
  const { t } = useT();
  return (
    <div className="mx-auto max-w-md space-y-4 p-6 pt-16">
      <ErrorBox>{t("common.crash.text")}</ErrorBox>
      <Button size="lg" onClick={() => window.location.reload()}>
        {t("common.crash.reload")}
      </Button>
    </div>
  );
}
