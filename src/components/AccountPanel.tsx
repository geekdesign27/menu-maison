import { useState, type FormEvent } from "react";
import { useAction, useConvex, useMutation, useQuery } from "convex/react";
import {
  Download,
  KeyRound,
  Mail,
  MonitorSmartphone,
  Trash2,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import { MIN_PASSWORD_LENGTH } from "../../convex/domain/auth";
import {
  deleteConfirmMatches,
  emailProblem,
  exportFileName,
  normalizeEmail,
} from "../../convex/domain/account";
import { useSession } from "../lib/session";
import { useRun, useToast } from "../lib/toast";
import { errorMessage } from "../lib/format";
import { serverText } from "../i18n/serverText";
import { useT } from "../i18n/useT";
import { ConfirmSheet } from "./shopping/ConfirmSheet";
import { Badge, Button, ErrorBox, Sheet, TextInput } from "./ui";

/** Réglages, Mon compte: e-mail, password and the other devices of the signed-in member. */
export function AccountPanel() {
  const { token } = useSession();
  const { t } = useT();
  const run = useRun();
  const mine = useQuery(api.account.mine, token ? { token } : "skip");
  const signOutOthers = useMutation(api.account.signOutOthers);
  const [sheet, setSheet] = useState<"email" | "password" | "others" | null>(
    null,
  );
  if (!mine) return null;
  const close = () => setSheet(null);

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <p className="flex items-center gap-2 text-[16px] font-bold">
          <Mail size={18} aria-hidden /> {t("account.email")}
        </p>
        {mine.email ? (
          <p className="flex flex-wrap items-center gap-2 text-[16px]">
            <span className="break-all">{mine.email}</span>
            <Badge tone="herb">{t("account.confirmed")}</Badge>
          </p>
        ) : (
          <p className="text-[15px] text-muted">{t("account.noEmail")}</p>
        )}
        {mine.pendingEmail && (
          <p className="text-[15px] text-muted">
            {t("account.pending", { email: mine.pendingEmail })}
          </p>
        )}
        <Button variant="secondary" onClick={() => setSheet("email")}>
          {mine.email || mine.pendingEmail
            ? t("account.changeEmail")
            : t("account.addEmail")}
        </Button>
      </div>
      <Button variant="secondary" onClick={() => setSheet("password")}>
        <KeyRound size={20} aria-hidden /> {t("account.changePassword")}
      </Button>
      <Button
        variant="secondary"
        disabled={mine.otherDevices === 0}
        onClick={() => setSheet("others")}
      >
        <MonitorSmartphone size={20} aria-hidden />
        {mine.otherDevices === 0
          ? t("account.noOtherDevice")
          : t("account.signOutOthers", { count: mine.otherDevices })}
      </Button>

      <EmailSheet
        open={sheet === "email"}
        onClose={close}
        current={mine.email}
      />
      <PasswordSheet open={sheet === "password"} onClose={close} />
      <ConfirmSheet
        open={sheet === "others"}
        onClose={close}
        title={t("account.othersTitle")}
        text={t("account.othersText")}
        confirmLabel={t("account.othersConfirm")}
        danger
        onConfirm={() =>
          run(() => signOutOthers({ token }), t("account.othersDone"))
        }
      />
    </div>
  );
}

function EmailSheet({
  open,
  onClose,
  current,
}: {
  open: boolean;
  onClose: () => void;
  current: string | null;
}) {
  const { token } = useSession();
  const { t, lang } = useT();
  const run = useRun();
  const setEmail = useAction(api.account.setEmail);
  const removeEmail = useMutation(api.account.removeEmail);
  const [email, setValue] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const clean = normalizeEmail(email);
    const problem = emailProblem(clean);
    if (problem) return setError(serverText(lang, problem));
    setBusy(true);
    setError("");
    try {
      await setEmail({ token, email: clean, password });
      setValue("");
      setPassword("");
      onClose();
    } catch (err) {
      setError(errorMessage(err, lang));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={t("account.emailTitle")}>
      <form onSubmit={submit} className="grid gap-4">
        <p className="text-[16px]">{t("account.emailHelp")}</p>
        <TextInput
          label={t("account.email")}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          maxLength={254}
          value={email}
          onChange={(e) => setValue(e.target.value)}
        />
        <TextInput
          label={t("account.passwordToConfirm")}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <ErrorBox>{error}</ErrorBox>}
        <Button type="submit" size="lg" disabled={busy || !email.trim() || !password}>
          {busy ? t("account.sending") : t("account.sendLink")}
        </Button>
        {current && (
          <Button
            variant="danger"
            onClick={async () => {
              await run(
                () => removeEmail({ token }),
                t("account.emailRemoved"),
              );
              onClose();
            }}
          >
            {t("account.removeEmail")}
          </Button>
        )}
      </form>
    </Sheet>
  );
}

function PasswordSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { token } = useSession();
  const { t, lang } = useT();
  const toast = useToast();
  const changePassword = useAction(api.account.changePassword);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (next !== again) return setError(t("gate.invite.mismatch"));
    setBusy(true);
    setError("");
    try {
      await changePassword({ token, current, next });
      setCurrent("");
      setNext("");
      setAgain("");
      onClose();
      toast(t("account.passwordChanged"));
    } catch (err) {
      setError(errorMessage(err, lang));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={t("account.changePassword")}>
      <form onSubmit={submit} className="grid gap-4">
        <TextInput
          label={t("account.currentPassword")}
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
        <TextInput
          label={t("gate.invite.password", { min: MIN_PASSWORD_LENGTH })}
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
        <TextInput
          label={t("gate.invite.again")}
          type="password"
          autoComplete="new-password"
          value={again}
          onChange={(e) => setAgain(e.target.value)}
        />
        <p className="text-[15px] text-muted">{t("account.passwordHelp")}</p>
        {error && <ErrorBox>{error}</ErrorBox>}
        <Button
          type="submit"
          size="lg"
          disabled={busy || !current || !next || !again}
        >
          {busy ? t("gate.invite.saving") : t("account.savePassword")}
        </Button>
      </form>
    </Sheet>
  );
}

/** Réglages, Données de la famille (admins): a JSON export, and deleting the family for good. */
export function FamilyDataPanel() {
  const { token, account, setToken } = useSession();
  const { t, lang } = useT();
  const convex = useConvex();
  const deleteFamily = useAction(api.stripeNode.deleteFamily);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"closed" | "warn" | "type">("closed");
  const [typed, setTyped] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  if (!account) return null;
  const familyName = account.family.name;

  async function download() {
    setExporting(true);
    setError("");
    try {
      const data = await convex.query(api.familyData.exportAll, { token });
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = exportFileName(
        account!.family.slug,
        new Date().toISOString().slice(0, 10),
      );
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(errorMessage(err, lang));
    } finally {
      setExporting(false);
    }
  }

  async function confirmDelete(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await deleteFamily({ token, confirmName: typed, password });
      // The family is gone: this phone signs out
      setToken("");
    } catch (err) {
      setError(errorMessage(err, lang));
      setBusy(false);
    }
  }

  const closeDelete = () => {
    setStep("closed");
    setTyped("");
    setPassword("");
    setError("");
  };

  return (
    <div className="grid gap-3">
      <p className="text-[15px] text-muted">{t("account.exportHelp")}</p>
      <Button
        variant="secondary"
        disabled={exporting}
        onClick={() => void download()}
      >
        <Download size={20} aria-hidden />{" "}
        {exporting ? t("account.exporting") : t("account.export")}
      </Button>
      {error && step === "closed" && <ErrorBox>{error}</ErrorBox>}
      {/* PA's own family runs the site: the server refuses, the button is not offered */}
      {!account.superadmin && (
        <Button variant="danger" onClick={() => setStep("warn")}>
          <Trash2 size={20} aria-hidden /> {t("account.deleteFamily")}
        </Button>
      )}

      <Sheet
        open={step !== "closed"}
        onClose={closeDelete}
        title={t("account.deleteTitle")}
      >
        {step === "warn" ? (
          <div className="grid gap-4">
            <p className="text-[16px]">{t("account.deleteWarn", { family: familyName })}</p>
            <ul className="list-disc space-y-1 pl-5 text-[16px]">
              <li>{t("account.deleteData")}</li>
              <li>{t("account.deleteStripe")}</li>
              <li>{t("account.deleteAll")}</li>
            </ul>
            <p className="text-[15px] text-muted">
              {t("account.deleteExportFirst")}
            </p>
            <Button size="lg" variant="danger" onClick={() => setStep("type")}>
              {t("account.deleteContinue")}
            </Button>
            <Button size="lg" variant="secondary" onClick={closeDelete}>
              {t("account.keep")}
            </Button>
          </div>
        ) : (
          <form onSubmit={confirmDelete} className="grid gap-4">
            <TextInput
              label={t("account.deleteType", { family: familyName })}
              autoComplete="off"
              autoCapitalize="none"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
            />
            <TextInput
              label={t("account.passwordToConfirm")}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <ErrorBox>{error}</ErrorBox>}
            <Button
              type="submit"
              size="lg"
              variant="danger"
              disabled={busy || !password || !deleteConfirmMatches(typed, familyName)}
            >
              {busy ? t("account.deleting") : t("account.deleteConfirm")}
            </Button>
            <Button size="lg" variant="secondary" onClick={closeDelete}>
              {t("account.keep")}
            </Button>
          </form>
        )}
      </Sheet>
    </div>
  );
}
