import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { MIN_PASSWORD_LENGTH } from "../../convex/domain/auth";
import { rememberedFamily, useSession } from "../lib/session";
import { errorMessage } from "../lib/format";
import { serverText } from "../i18n/serverText";
import { useT } from "../i18n/useT";
import { LangSwitch } from "./LangSwitch";
import { Button, ErrorBox, Loading, TextInput } from "./ui";
import { AppIcon } from "./Logo";
import { NO_INVITE_HASH } from "../landing/entry";
import { SignupScreen, WelcomeScreen } from "./SignupScreens";
import { EmailConfirmScreen, ForgotScreen } from "./AccountScreens";

/**
 * Sign-in links live in the address, before the app's own routes:
 * « #/f/dupont » opens the family's sign-in, « #/activer/<link> » an invitation,
 * « #/essai » the sign-up and « #/bienvenue?session_id=… » Stripe's return,
 * « #/mot-de-passe » a forgotten password and « #/email/<link> » an e-mail to confirm.
 */
function readLink() {
  const hash = window.location.hash;
  const family =
    hash.match(/^#\/f\/([a-z0-9._-]{2,30})\/?$/i)?.[1]?.toLowerCase() ?? null;
  const invite =
    hash.match(/^#\/activer\/([0-9a-f]{64})\/?$/i)?.[1]?.toLowerCase() ?? null;
  const signup = /^#\/essai\/?$/.test(hash);
  // From Stripe (« session_id ») or from the welcome e-mail (« &k= », its own secret)
  const back = hash.match(/^#\/bienvenue\?session_id=(cs_(?:test|live)_[A-Za-z0-9]+)(?:&k=([0-9a-f]{64}))?$/);
  const welcome = back ? { sessionId: back[1], emailKey: back[2] ?? null } : null;
  const forgot = /^#\/mot-de-passe\/?$/.test(hash);
  const emailLink =
    hash.match(/^#\/email\/([0-9a-f]{64})\/?$/i)?.[1]?.toLowerCase() ?? null;
  return { family, invite, signup, welcome, forgot, emailLink };
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
  const { t } = useT();

  // A signed-in phone opening a sign-in link goes straight to the app
  useEffect(() => {
    if (token && (link.family || link.invite)) openApp();
  }, [token, link.family, link.invite]);

  if (checking) return <Loading label={t("gate.opening")} />;
  // Sign-up and Stripe's return, whether this phone is signed in or not
  if (link.signup) return <SignupScreen />;
  if (link.welcome)
    return <WelcomeScreen sessionId={link.welcome.sessionId} emailKey={link.welcome.emailKey} />;
  // The confirmation link may be opened on any phone, signed in or not
  if (link.emailLink) return <EmailConfirmScreen link={link.emailLink} />;
  if (link.forgot && !token) return <ForgotScreen />;
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

export function Brand({ subtitle }: { subtitle: string }) {
  return (
    <div className="mb-8 text-center">
      <AppIcon size={80} className="mx-auto mb-3 shadow-lg" />
      <h1 className="text-3xl font-black tracking-tight">Menu Maison</h1>
      <p className="mt-1 font-semibold text-muted">{subtitle}</p>
    </div>
  );
}

export function Screen({ children }: { children: ReactNode }) {
  return (
    <main className="pt-safe mx-auto flex min-h-dvh max-w-md flex-col px-6 pb-8">
      {/* In the flow, not absolute: never covers the content on a small phone */}
      <div className="flex justify-end pt-3">
        <LangSwitch />
      </div>
      <div className="flex flex-1 flex-col justify-center pt-4">{children}</div>
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
  const { t, lang } = useT();
  const login = useAction(api.access.login);
  const [slug, setSlug] = useState(familySlug ?? "");
  const family = useQuery(
    api.access.family,
    familySlug ? { slug: familySlug } : "skip",
  );
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  // Kept as a flag so it follows a language switch
  const [showExpired, setShowExpired] = useState(expired);
  const [busy, setBusy] = useState(false);

  // Family known from the link (or from this phone): no need to type it
  const knownFamily = familySlug && family ? family : null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setShowExpired(false);
    try {
      const res = await login({
        family: knownFamily?.slug ?? slug,
        username,
        password,
      });
      if (res.ok) {
        rememberedFamily.set(res.slug);
        onToken(res.token);
      } else setError(serverText(lang, res.error));
    } catch (err) {
      setError(errorMessage(err, lang));
    } finally {
      setBusy(false);
    }
  }

  if (familySlug && family === undefined)
    return <Loading label={t("gate.opening")} />;

  return (
    <Screen>
      <Brand
        subtitle={
          knownFamily
            ? knownFamily.name
            : t("gate.tagline")
        }
      />
      <form onSubmit={submit} className="space-y-4">
        {!knownFamily && (
          <TextInput
            label={t("gate.login.family")}
            autoCapitalize="none"
            autoCorrect="off"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder={t("gate.login.familyPlaceholder")}
          />
        )}
        <TextInput
          label={t("gate.login.pseudo")}
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <TextInput
          label={t("gate.login.password")}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {showExpired && !error && (
          <ErrorBox>{t("gate.login.expired")}</ErrorBox>
        )}
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
          {busy ? t("gate.login.checking") : t("gate.login.submit")}
        </Button>
      </form>
      <a
        href="#/mot-de-passe"
        className="mx-auto mt-4 inline-flex min-h-11 items-center px-3 text-[15px] font-bold text-carrot-dark underline underline-offset-4"
      >
        {t("gate.login.forgot")}
      </a>
      <p className="mt-2 text-center text-[15px] text-muted">
        {t("gate.login.help")}
      </p>
      {!knownFamily && (
        <a
          href={NO_INVITE_HASH}
          className="mx-auto mt-2 inline-flex min-h-11 items-center px-3 text-[15px] font-bold text-carrot-dark underline underline-offset-4"
        >
          {t("gate.login.noAccount")}
        </a>
      )}
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
  const { t, lang } = useT();
  const info = useQuery(api.access.inviteInfo, { link });
  const activate = useAction(api.access.activate);
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (info === undefined) return <Loading label={t("gate.opening")} />;
  if (info === null)
    return (
      <Screen>
        <Brand subtitle={t("gate.invite.subtitle")} />
        <ErrorBox>{t("gate.invite.invalid")}</ErrorBox>
        <Button
          size="lg"
          variant="secondary"
          className="mt-4"
          onClick={openApp}
        >
          {t("gate.invite.toLogin")}
        </Button>
      </Screen>
    );

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password !== again) {
      setError(t("gate.invite.mismatch"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { token } = await activate({ link, password });
      rememberedFamily.set(info!.slug);
      onToken(token);
    } catch (err) {
      setError(errorMessage(err, lang));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Brand subtitle={info.family} />
      <h2 className="mb-1 text-center text-xl font-black">
        {t("gate.invite.welcome", { name: info.name })}
      </h2>
      {info.username ? (
        <div className="mb-6 rounded-3xl bg-white p-4 text-center shadow-sm">
          <p className="text-[15px] font-semibold text-muted">
            {t("gate.invite.yourPseudo")}
          </p>
          <p className="text-3xl font-black tracking-tight">{info.username}</p>
          <p className="mt-1 text-[15px] text-muted">
            {t("gate.invite.pseudoHelp", { family: info.family })}
          </p>
        </div>
      ) : (
        <ErrorBox>{t("gate.invite.noPseudo")}</ErrorBox>
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
          label={t("gate.invite.password", { min: MIN_PASSWORD_LENGTH })}
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <TextInput
          label={t("gate.invite.again")}
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
          {busy ? t("gate.invite.saving") : t("gate.invite.submit")}
        </Button>
      </form>
    </Screen>
  );
}
