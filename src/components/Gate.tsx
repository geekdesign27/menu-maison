import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { MIN_PASSWORD_LENGTH } from "../../convex/domain/auth";
import { rememberedFamily, useSession } from "../lib/session";
import { errorMessage } from "../lib/format";
import { Button, ErrorBox, Loading, TextInput } from "./ui";
import { AppIcon } from "./Logo";

/**
 * Sign-in links live in the address, before the app's own routes:
 * « #/f/dupont » opens the family's sign-in, « #/activer/<link> » an invitation.
 */
function readLink() {
  const hash = window.location.hash;
  const family =
    hash.match(/^#\/f\/([a-z0-9._-]{2,30})\/?$/i)?.[1]?.toLowerCase() ?? null;
  const invite =
    hash.match(/^#\/activer\/([0-9a-f]{64})\/?$/i)?.[1]?.toLowerCase() ?? null;
  return { family, invite };
}

function useLink() {
  const [link, setLink] = useState(readLink);
  useEffect(() => {
    const onChange = () => setLink(readLink());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return link;
}

/** Leaves the sign-in link for the app's home screen. */
function openApp() {
  // Replaced, not pushed: the invitation link must not stay in the history
  history.replaceState(null, "", "#/");
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

/** Pseudo and password once per device, or an invitation link to choose them. */
export function Gate({ children }: { children: ReactNode }) {
  const { token, checking, expired, setToken } = useSession();
  const link = useLink();

  // A signed-in phone opening a sign-in link goes straight to the app
  useEffect(() => {
    if (token && (link.family || link.invite)) openApp();
  }, [token, link.family, link.invite]);

  if (checking) return <Loading label="Ouverture" />;
  if (link.invite && !token)
    return (
      <InviteScreen
        link={link.invite}
        onToken={(t) => {
          setToken(t);
          openApp();
        }}
      />
    );
  if (!token)
    return (
      <LoginScreen
        familySlug={link.family ?? (rememberedFamily.get() || null)}
        expired={expired}
        onToken={(t) => {
          setToken(t);
          openApp();
        }}
      />
    );
  return <>{children}</>;
}

function Brand({ subtitle }: { subtitle: string }) {
  return (
    <div className="mb-8 text-center">
      <AppIcon size={80} className="mx-auto mb-3 shadow-lg" />
      <h1 className="text-3xl font-black tracking-tight">Menu Maison</h1>
      <p className="mt-1 font-semibold text-muted">{subtitle}</p>
    </div>
  );
}

function Screen({ children }: { children: ReactNode }) {
  return (
    <main className="pt-safe mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-8">
      {children}
    </main>
  );
}

function LoginScreen({
  familySlug,
  expired,
  onToken,
}: {
  familySlug: string | null;
  expired: boolean;
  onToken: (t: string) => void;
}) {
  const login = useAction(api.access.login);
  const [slug, setSlug] = useState(familySlug ?? "");
  const family = useQuery(
    api.access.family,
    familySlug ? { slug: familySlug } : "skip",
  );
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(
    expired ? "Ta session a expiré, reconnecte-toi." : "",
  );
  const [busy, setBusy] = useState(false);

  // Family known from the link (or from this phone): no need to type it
  const knownFamily = familySlug && family ? family : null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await login({
        family: knownFamily?.slug ?? slug,
        username,
        password,
      });
      if (res.ok) {
        rememberedFamily.set(res.slug);
        onToken(res.token);
      } else setError(res.error);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (familySlug && family === undefined) return <Loading label="Ouverture" />;

  return (
    <Screen>
      <Brand
        subtitle={
          knownFamily
            ? knownFamily.name
            : "Les menus de la semaine et la liste de courses."
        }
      />
      <form onSubmit={submit} className="space-y-4">
        {!knownFamily && (
          <TextInput
            label="Famille"
            autoCapitalize="none"
            autoCorrect="off"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="Le nom de ta famille, par exemple Dupont"
          />
        )}
        <TextInput
          label="Pseudo"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <TextInput
          label="Mot de passe"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <ErrorBox>{error}</ErrorBox>}
        <Button
          type="submit"
          size="lg"
          disabled={
            busy ||
            !username.trim() ||
            !password ||
            (!knownFamily && !slug.trim())
          }
        >
          {busy ? "Vérification…" : "Se connecter"}
        </Button>
      </form>
      <p className="mt-6 text-center text-[15px] text-muted">
        Pour rester connecté, ajoute l'app à l'écran d'accueil (Safari :
        Partager, puis « Sur l'écran d'accueil »). Mot de passe oublié : demande
        un nouveau lien à l'admin de ta famille.
      </p>
    </Screen>
  );
}

function InviteScreen({
  link,
  onToken,
}: {
  link: string;
  onToken: (t: string) => void;
}) {
  const info = useQuery(api.access.inviteInfo, { link });
  const activate = useAction(api.access.activate);
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (info === undefined) return <Loading label="Ouverture" />;
  if (info === null)
    return (
      <Screen>
        <Brand subtitle="Lien d'invitation" />
        <ErrorBox>
          Ce lien n'est plus valable. Demande-en un nouveau à l'admin de ta
          famille.
        </ErrorBox>
        <Button
          size="lg"
          variant="secondary"
          className="mt-4"
          onClick={openApp}
        >
          Aller à la connexion
        </Button>
      </Screen>
    );

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password !== again) {
      setError("Les deux mots de passe ne sont pas pareils.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { token } = await activate({ link, password });
      rememberedFamily.set(info!.slug);
      onToken(token);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Brand subtitle={info.family} />
      <h2 className="mb-1 text-center text-xl font-black">
        Bienvenue {info.name} !
      </h2>
      {info.username ? (
        <div className="mb-6 rounded-3xl bg-white p-4 text-center shadow-sm">
          <p className="text-[15px] font-semibold text-muted">Ton pseudo</p>
          <p className="text-3xl font-black tracking-tight">{info.username}</p>
          <p className="mt-1 text-[15px] text-muted">
            Avec ta famille « {info.family} », il te servira à te connecter.
          </p>
        </div>
      ) : (
        <ErrorBox>
          Ton profil n'a pas encore de pseudo. Demande à l'admin de ta famille
          de t'en choisir un, puis un nouveau lien.
        </ErrorBox>
      )}
      <form onSubmit={submit} className="space-y-4">
        {/* Lets the phone's password manager save the pair */}
        <input
          type="text"
          name="username"
          autoComplete="username"
          value={info.username ?? ""}
          readOnly
          hidden
        />
        <TextInput
          label={`Mot de passe (${MIN_PASSWORD_LENGTH} caractères au moins)`}
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <TextInput
          label="Encore une fois"
          type="password"
          autoComplete="new-password"
          value={again}
          onChange={(e) => setAgain(e.target.value)}
        />
        {error && <ErrorBox>{error}</ErrorBox>}
        <Button
          type="submit"
          size="lg"
          disabled={busy || !info.username || !password || !again}
        >
          {busy ? "Enregistrement…" : "C'est parti"}
        </Button>
      </form>
    </Screen>
  );
}
