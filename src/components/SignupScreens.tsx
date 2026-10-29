import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useAction, useQuery } from "convex/react";
import { Lock } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { signupProblem } from "../../convex/domain/billing";
import { readStored, writeStored } from "../lib/device";
import { errorMessage } from "../lib/format";
import { rememberedFamily, useSession } from "../lib/session";
import { serverText } from "../i18n/serverText";
import { useT } from "../i18n/useT";
import { Brand, Screen } from "./Gate";
import { Button, ErrorBox, Loading, TextInput } from "./ui";

// The secret of the sign-up started on this phone: only it gets the admin's
// first link back from Stripe (convex/billing.ts firstLink)
const CLAIM_KEY = "mm.claim";

/** « #/essai »: family name and first name, then Stripe Checkout. */
export function SignupScreen() {
  const { t, lang } = useT();
  const { account } = useSession();
  const startCheckout = useAction(api.stripeNode.startCheckout);
  const status = useQuery(api.billing.signupStatus);
  const [familyName, setFamilyName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Checked once typing pauses; Stripe numbers a taken name anyway (« Dupont 2 »)
  const [typed, setTyped] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => setTyped(familyName.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [familyName]);
  const available = useQuery(
    api.billing.nameAvailable,
    typed.length >= 2 ? { name: typed } : "skip",
  );

  async function submit(e: FormEvent) {
    e.preventDefault();
    const problem = signupProblem({ familyName, adminName });
    if (problem) {
      setError(serverText(lang, problem));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { url, claimSecret } = await startCheckout({
        familyName,
        adminName,
        lang,
      });
      writeStored(CLAIM_KEY, claimSecret);
      window.location.href = url;
    } catch (err) {
      setError(errorMessage(err, lang));
      setBusy(false);
    }
  }

  // A signed-in phone would lose the new admin's first link: sign out first
  if (account)
    return (
      <Screen>
        <Brand subtitle={t("gate.signup.subtitle")} />
        <div className="grid gap-3 rounded-2xl bg-paper p-4 text-center ring-1 ring-line">
          <p className="text-[16px]">{t("gate.signup.signedIn", { family: account.family.name })}</p>
          <p className="text-[15px] text-muted">{t("gate.signup.signOutFirst")}</p>
          <a href="#/" className="font-extrabold text-carrot-dark underline">
            {t("gate.signup.openApp")}
          </a>
        </div>
      </Screen>
    );

  if (status === undefined) return <Loading />;
  // Until S7 (legal pages, live Stripe keys) the form stays closed
  if (!status.open)
    return (
      <Screen>
        <Brand subtitle={t("gate.signup.subtitle")} />
        <div className="grid gap-3 rounded-2xl bg-paper p-4 text-center ring-1 ring-line">
          <p className="text-[17px] font-extrabold">{t("gate.signup.closedTitle")}</p>
          <p className="text-[16px] text-muted">{t("gate.signup.closed")}</p>
          <a href="#/decouvrir" className="inline-flex min-h-11 items-center justify-center font-extrabold text-carrot-dark underline">
            {t("gate.signup.closedBack")}
          </a>
        </div>
        <a href="#/connexion" className="mt-6 inline-flex min-h-11 items-center justify-center font-bold text-carrot-dark underline">
          {t("gate.signup.haveAccount")}
        </a>
      </Screen>
    );

  return (
    <Screen>
      <Brand subtitle={t("gate.signup.subtitle")} />
      <p className="mb-5 rounded-2xl bg-carrot-soft p-4 text-[16px] font-semibold text-carrot-dark">
        {t("gate.signup.offer")}
      </p>
      <form onSubmit={submit} className="grid gap-4">
        <div className="grid gap-1">
          <TextInput
            id="signup-family"
            label={t("gate.signup.family")}
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            placeholder={t("gate.signup.familyPlaceholder")}
            autoComplete="family-name"
            maxLength={40}
            required
          />
          <p className="text-[14px] text-muted">
            {available === false
              ? t("gate.signup.taken")
              : t("gate.signup.familyHelp")}
          </p>
        </div>
        <div className="grid gap-1">
          <TextInput
            id="signup-admin"
            label={t("gate.signup.admin")}
            value={adminName}
            onChange={(e) => setAdminName(e.target.value)}
            autoComplete="given-name"
            maxLength={40}
            required
          />
          <p className="text-[14px] text-muted">{t("gate.signup.adminHelp")}</p>
        </div>
        {error && <ErrorBox>{error}</ErrorBox>}
        <Button size="lg" type="submit" disabled={busy}>
          {busy ? t("gate.signup.opening") : t("gate.signup.submit")}
        </Button>
        <p className="flex items-center justify-center gap-1.5 text-center text-[14px] text-muted">
          <Lock size={14} aria-hidden /> {t("gate.signup.secure")}
        </p>
      </form>
      <a
        href="#/connexion"
        className="mt-6 text-center font-bold text-carrot-dark underline"
      >
        {t("gate.signup.haveAccount")}
      </a>
    </Screen>
  );
}

type Claim = Awaited<
  ReturnType<ReturnType<typeof useAction<typeof api.stripeNode.claim>>>
>;

/**
 * « #/bienvenue?session_id=… », back from Stripe: checks the payment, then
 * hands over to the screen where the new admin chooses a password.
 */
export function WelcomeScreen({ sessionId, emailKey }: { sessionId: string; emailKey: string | null }) {
  const { t, lang } = useT();
  const { token } = useSession();
  const claim = useAction(api.stripeNode.claim);
  const [result, setResult] = useState<Claim | null>(null);
  const [error, setError] = useState("");
  const [tries, setTries] = useState(0);
  // The welcome e-mail's link brings its own secret; otherwise this phone's
  const secret = emailKey ?? readStored(CLAIM_KEY);

  const check = useCallback(async () => {
    setError("");
    try {
      // Another phone (or an existing family): a secret that matches nothing
      const r = await claim({
        sessionId,
        claimSecret: /^[0-9a-f]{64}$/.test(secret) ? secret : "0".repeat(64),
      });
      setResult(r);
      if (r.slug) rememberedFamily.set(r.slug);
      // Done with: the secret is of no use once the family exists
      if (r.state === "ready") writeStored(CLAIM_KEY, "");
      if (r.invite) {
        // Replaced, not pushed: the link must not stay in the history
        history.replaceState(null, "", `#/activer/${r.invite}`);
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      }
    } catch (err) {
      setError(errorMessage(err, lang));
    }
  }, [claim, sessionId, secret, lang]);

  useEffect(() => {
    void check();
  }, [check]);

  // Stripe confirms within seconds: a few quiet retries before asking
  useEffect(() => {
    if (result?.state !== "pending" || tries >= 4) return;
    const timer = window.setTimeout(() => {
      setTries((n) => n + 1);
      void check();
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [result, tries, check]);

  return (
    <Screen>
      <Brand subtitle={t("gate.welcome.subtitle")} />
      {error ? (
        <ErrorBox>{error}</ErrorBox>
      ) : !result || (result.state === "pending" && tries < 4) ? (
        <Loading label={t("gate.welcome.checking")} />
      ) : result.state === "pending" ? (
        <div className="grid gap-4">
          <p className="text-center text-[17px]">{t("gate.welcome.pending")}</p>
          <Button onClick={() => void check()}>
            {t("gate.welcome.retry")}
          </Button>
        </div>
      ) : token ? (
        <div className="grid gap-4 text-center">
          <p className="text-[18px] font-bold">
            {t("gate.welcome.subscribed")}
          </p>
          <a href="#/" className="font-extrabold text-carrot-dark underline">
            {t("gate.signup.openApp")}
          </a>
        </div>
      ) : (
        <div className="grid gap-4 text-center">
          <p className="text-[17px]">{t("gate.welcome.otherDevice")}</p>
          <a
            href={result.slug ? `#/f/${result.slug}` : "#/connexion"}
            className="font-extrabold text-carrot-dark underline"
          >
            {t("gate.welcome.toLogin")}
          </a>
        </div>
      )}
    </Screen>
  );
}
