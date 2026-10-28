import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation } from "convex/react";
import { MailCheck } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { emailProblem, normalizeEmail } from "../../convex/domain/account";
import { useSession } from "../lib/session";
import { errorMessage } from "../lib/format";
import { serverText } from "../i18n/serverText";
import { useT } from "../i18n/useT";
import { Brand, Screen } from "./Gate";
import { Button, ErrorBox, Loading, TextInput } from "./ui";

/** « #/mot-de-passe »: a reset link by e-mail, same answer whether the address is known or not. */
export function ForgotScreen() {
  const { t, lang } = useT();
  const requestReset = useMutation(api.account.requestReset);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const clean = normalizeEmail(email);
    const problem = emailProblem(clean);
    if (problem) return setError(serverText(lang, problem));
    setBusy(true);
    setError("");
    try {
      await requestReset({ email: clean, lang });
      setSent(true);
    } catch (err) {
      setError(errorMessage(err, lang));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Brand subtitle={t("gate.forgot.subtitle")} />
      {sent ? (
        <div className="grid gap-4 rounded-2xl bg-paper p-5 text-center ring-1 ring-line">
          <MailCheck size={36} className="mx-auto text-herb" aria-hidden />
          <p className="text-[17px]">{t("gate.forgot.sent")}</p>
          <p className="text-[15px] text-muted">{t("gate.forgot.sentHelp")}</p>
        </div>
      ) : (
        <form onSubmit={submit} className="grid gap-4">
          <p className="text-[16px]">{t("gate.forgot.help")}</p>
          <TextInput
            label={t("account.email")}
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {error && <ErrorBox>{error}</ErrorBox>}
          <Button type="submit" size="lg" disabled={busy || !email.trim()}>
            {busy ? t("account.sending") : t("account.sendLink")}
          </Button>
          <p className="text-[15px] text-muted">{t("gate.forgot.noEmail")}</p>
        </form>
      )}
      <a
        href="#/connexion"
        className="mx-auto mt-6 inline-flex min-h-11 items-center px-3 font-bold text-carrot-dark underline"
      >
        {t("gate.forgot.back")}
      </a>
    </Screen>
  );
}

/** « #/email/<link> », from the confirmation e-mail: the address becomes the profile's. */
export function EmailConfirmScreen({ link }: { link: string }) {
  const { t, lang } = useT();
  const { token } = useSession();
  const confirmEmail = useMutation(api.account.confirmEmail);
  const [result, setResult] = useState<{ ok: boolean; email?: string } | null>(
    null,
  );
  const [error, setError] = useState("");
  // Once only, even when React runs effects twice in development
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    confirmEmail({ link })
      .then(setResult)
      .catch((err) => setError(errorMessage(err, lang)));
  }, [confirmEmail, link, lang]);

  return (
    <Screen>
      <Brand subtitle={t("gate.emailConfirm.subtitle")} />
      {error ? (
        <ErrorBox>{error}</ErrorBox>
      ) : !result ? (
        <Loading label={t("gate.emailConfirm.checking")} />
      ) : result.ok ? (
        <div className="grid gap-3 rounded-2xl bg-paper p-5 text-center ring-1 ring-line">
          <MailCheck size={36} className="mx-auto text-herb" aria-hidden />
          <p className="text-[17px] font-bold">{t("gate.emailConfirm.done")}</p>
          <p className="break-all text-[16px]">{result.email}</p>
        </div>
      ) : (
        <ErrorBox>{t("gate.emailConfirm.invalid")}</ErrorBox>
      )}
      <a
        href={token ? "#/reglages" : "#/connexion"}
        className="mx-auto mt-6 inline-flex min-h-11 items-center px-3 font-bold text-carrot-dark underline"
      >
        {token ? t("gate.emailConfirm.toSettings") : t("gate.forgot.back")}
      </a>
    </Screen>
  );
}
