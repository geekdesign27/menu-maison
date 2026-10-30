import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { api } from "../../convex/_generated/api";
import { convex } from "../lib/convex";
import { AppIcon } from "./Logo";
import { Button, ErrorBox, TextInput } from "./ui";

// The ticket the server gave for the right password, kept on this device
const TICKET_KEY = "mm.devTicket";

function storedTicket(): string | null {
  try {
    return localStorage.getItem(TICKET_KEY);
  } catch {
    return null;
  }
}

function storeTicket(ticket: string) {
  try {
    localStorage.setItem(TICKET_KEY, ticket);
  } catch {
    // Private browsing: the password will simply be asked again next time
  }
}

/** Test site only (dev.menumaison.ch): its password once per device, before the landing page or the app. */
export function DevGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"checking" | "shut" | "open">(() =>
    storedTicket() ? "checking" : "shut",
  );
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ticket = storedTicket();
    if (!ticket) return;
    convex
      .query(api.devGate.check, { ticket })
      .then((ok) => setState(ok ? "open" : "shut"))
      .catch(() => setState("shut"));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await convex.mutation(api.devGate.enter, { password });
      if (res.ok) {
        storeTicket(res.ticket);
        setState("open");
        return;
      }
      if (res.reason === "locked") {
        const minutes = Math.max(
          1,
          Math.ceil((res.retryAt - Date.now()) / 60_000),
        );
        setError(`Trop d'essais. Réessaie dans ${minutes} min.`);
      } else if (res.reason === "closed") {
        setError(
          "La version de test est fermée : aucun mot de passe n'est défini.",
        );
      } else {
        setError("Mot de passe incorrect.");
      }
    } catch {
      setError("Connexion impossible. Vérifie le réseau et réessaie.");
    } finally {
      setBusy(false);
    }
  }

  if (state === "open") return <>{children}</>;
  if (state === "checking") return null;

  return (
    <main className="pt-safe mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 pb-8">
      <div className="mb-8 text-center">
        <AppIcon size={80} className="mx-auto mb-3 shadow-lg" />
        <h1 className="text-3xl font-black tracking-tight">Menu Maison</h1>
        <p className="mt-1 font-semibold text-muted">
          Version de test, accès réservé
        </p>
      </div>
      <form onSubmit={submit} className="space-y-4">
        {/* Lets the password manager fill and save it */}
        <input
          type="text"
          name="username"
          autoComplete="username"
          value="dev"
          readOnly
          hidden
        />
        <TextInput
          label="Mot de passe de la version de test"
          type="password"
          autoComplete="current-password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <ErrorBox>{error}</ErrorBox>}
        <Button type="submit" size="lg" disabled={busy || !password}>
          {busy ? "Vérification…" : "Entrer"}
        </Button>
      </form>
    </main>
  );
}
