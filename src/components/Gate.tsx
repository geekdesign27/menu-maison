import { useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useBase, useSession } from "../lib/session";
import { errorMessage } from "../lib/format";
import { Avatar, Button, ErrorBox, Loading, TextInput } from "./ui";

/** Family code once per device, then "who are you?" in one tap. */
export function Gate({ children }: { children: ReactNode }) {
  const { token, setToken, memberId } = useSession();
  const valid = useQuery(api.access.check, token ? { token } : "skip");
  const base = useBase();

  if (!token || valid === false)
    return (
      <CodeScreen onToken={setToken} expired={!!token && valid === false} />
    );
  if (valid === undefined || base === undefined)
    return <Loading label="Ouverture" />;
  if (!memberId || !base.members.some((m) => m._id === memberId))
    return <ProfilePicker />;
  return <>{children}</>;
}

function Brand() {
  return (
    <div className="mb-8 text-center">
      <div
        className="mx-auto mb-3 flex size-20 items-center justify-center rounded-[1.75rem] bg-carrot text-5xl shadow-lg"
        aria-hidden
      >
        🥕
      </div>
      <h1 className="text-3xl font-black tracking-tight">Menu Maison</h1>
      <p className="mt-1 font-semibold text-muted">
        Les menus de la semaine et les courses du samedi.
      </p>
    </div>
  );
}

function CodeScreen({
  onToken,
  expired,
}: {
  onToken: (t: string) => void;
  expired: boolean;
}) {
  const login = useMutation(api.access.login);
  const [code, setCode] = useState("");
  const [error, setError] = useState(
    expired ? "Ta session a expiré, entre à nouveau le code famille." : "",
  );
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setError("");
    try {
      const res = await login({ code });
      if (res.ok) onToken(res.token);
      else setError(res.error);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="pt-safe mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <Brand />
      <form onSubmit={submit} className="space-y-4">
        <TextInput
          label="Code famille"
          type="password"
          autoComplete="current-password"
          autoCapitalize="none"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Le code partagé de la famille"
        />
        {error && <ErrorBox>{error}</ErrorBox>}
        <Button type="submit" size="lg" disabled={busy || !code.trim()}>
          {busy ? "Vérification…" : "Entrer"}
        </Button>
      </form>
      <p className="mt-6 text-center text-[15px] text-muted">
        À entrer une seule fois sur ce téléphone.
      </p>
    </main>
  );
}

export function ProfilePicker({ onPicked }: { onPicked?: () => void }) {
  const base = useBase();
  const { setMemberId } = useSession();
  if (!base) return <Loading />;
  return (
    <main className="pt-safe mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <Brand />
      <h2 className="mb-4 text-center text-xl font-black">Qui es-tu ?</h2>
      <div className="grid gap-3">
        {base.members.map((m) => (
          <button
            key={m._id}
            type="button"
            onClick={() => {
              setMemberId(m._id);
              onPicked?.();
            }}
            className="flex min-h-16 items-center gap-4 rounded-[var(--radius-card)] bg-paper px-5 text-left text-xl font-black shadow-sm ring-1 ring-line transition active:scale-[0.99] active:bg-carrot-soft"
          >
            <Avatar member={m} size={44} />
            {m.name}
          </button>
        ))}
      </div>
    </main>
  );
}
