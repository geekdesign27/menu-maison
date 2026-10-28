import { useSession } from "../lib/session";
import { useT } from "../i18n/useT";
import { ErrorBox } from "../components/ui";
import { SubscriptionPanel } from "../components/SubscriptionPanel";
import { GestionHeader } from "./GestionLayout";

/** Gestion, Abonnement: the family's subscription, for its admins. */
export function SubscriptionSection() {
  const { account } = useSession();
  const { t } = useT();
  if (account && account.role !== "admin")
    return (
      <div className="p-6">
        <ErrorBox>{t("admin.family.adminOnly")}</ErrorBox>
      </div>
    );
  return (
    <>
      <GestionHeader title={t("billing.panel.title")} subtitle={account?.family.name ?? ""} />
      <div className="max-w-xl px-6 pb-10">
        <div className="rounded-2xl bg-paper p-5 ring-1 ring-line">
          <SubscriptionPanel />
        </div>
      </div>
    </>
  );
}
