import { Component, type ReactNode } from "react";
import { Button, ErrorBox } from "./ui";

/** Last-resort screen: a crash in one screen never leaves a blank page. */
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mx-auto max-w-md space-y-4 p-6 pt-16">
        <ErrorBox>
          Cet écran a rencontré un problème. Tes données sont en sécurité.
        </ErrorBox>
        <Button size="lg" onClick={() => window.location.reload()}>
          Recharger l'app
        </Button>
      </div>
    );
  }
}
