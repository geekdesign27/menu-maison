import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../lib/session";
import { Badge, Select } from "../components/ui";

const NAMES: Record<string, string> = {
  welcome: "Bienvenue (inscription)",
  trialEnding: "Fin d'essai dans 2 jours",
  confirmed: "Abonnement confirmé",
  paymentFailed: "Paiement échoué",
  canceled: "Résiliation",
  adminSignup: "À toi : nouvelle inscription",
  adminConverted: "À toi : essai converti",
  adminCanceled: "À toi : résiliation",
  adminPaymentFailed: "À toi : paiement échoué",
};

/** Super admin: each e-mail as it will leave, with example data, and whether sending is set up. */
export function EmailPreviews() {
  const { token } = useSession();
  const data = useQuery(api.superadmin.emailPreviews, { token });
  const [choice, setChoice] = useState("welcome:fr");
  if (!data) return null;
  const shown = data.emails.find((e) => `${e.kind}:${e.lang}` === choice) ?? data.emails[0];
  const r = data.ready;

  return (
    <section className="grid gap-3">
      <h2 className="text-xl font-black">E-mails</h2>
      <div className="flex flex-wrap gap-2">
        <Badge tone={r.resend ? "herb" : "berry"}>{r.resend ? "Envoi actif (Resend)" : "Envoi inactif : RESEND_API_KEY manquante"}</Badge>
        <Badge tone={r.alerts ? "herb" : "sun"}>{r.alerts ? "Alertes vers ton adresse" : "Alertes : ADMIN_ALERT_EMAIL manquante"}</Badge>
        <Badge>Expéditeur : {r.from}</Badge>
      </div>
      <Select id="email-preview" label="Aperçu" value={choice} onChange={(e) => setChoice(e.target.value)}>
        {data.emails.map((e) => (
          <option key={`${e.kind}:${e.lang}`} value={`${e.kind}:${e.lang}`}>
            {NAMES[e.kind]} ({e.lang.toUpperCase()})
          </option>
        ))}
      </Select>
      <p className="text-[15px]">
        <span className="font-bold">Objet : </span>
        {shown.subject}
      </p>
      {/* Rendered in a sandbox: no script, no navigation from the preview */}
      <iframe
        title={`Aperçu : ${shown.subject}`}
        srcDoc={shown.html}
        sandbox=""
        className="h-[620px] w-full max-w-2xl rounded-2xl bg-white ring-1 ring-line"
      />
    </section>
  );
}
