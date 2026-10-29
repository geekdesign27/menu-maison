import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { CreditCard, ExternalLink } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { accessOf, GRACE_DAYS } from "../../convex/domain/billing";
import { formatDayWithYear } from "../../convex/domain/dates";
import { useSession } from "../lib/session";
import { useRun } from "../lib/toast";
import { useT } from "../i18n/useT";
import { Badge, Button } from "./ui";

const DAY = 24 * 60 * 60 * 1000;
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/**
 * The family's subscription for its admins: where it stands, and Stripe's
 * pages to subscribe, reactivate, change the card, get invoices or resign.
 */
export function SubscriptionPanel() {
  const { token } = useSession();
  const { t, lang } = useT();
  const run = useRun();
  const sub = useQuery(api.billing.mine, token ? { token } : "skip");
  const startCheckout = useAction(api.stripeNode.startFamilyCheckout);
  const openPortal = useAction(api.stripeNode.openPortal);
  const [busy, setBusy] = useState(false);
  if (!sub) return null;

  const day = (ms: number | null) =>
    ms ? formatDayWithYear(isoDay(ms), lang) : "";
  const go = async (open: () => Promise<{ url: string }>) => {
    setBusy(true);
    const r = await run(open);
    if (r) window.location.href = r.url;
    else setBusy(false);
  };
  const access = accessOf(
    {
      offered: sub.offered,
      billing: sub.status
        ? { status: sub.status, pastDueSince: sub.pastDueSince ?? undefined }
        : undefined,
    },
    Date.now(),
  );

  let badge: { tone: "carrot" | "herb" | "sun" | "berry"; label: string };
  let text: string;
  if (sub.offered) {
    badge = { tone: "carrot", label: t("billing.panel.offeredBadge") };
    text = t("billing.panel.offered");
  } else if (access === "readonly") {
    badge = { tone: "berry", label: t("billing.panel.endedBadge") };
    text = t("billing.panel.ended");
  } else if (access === "grace") {
    badge = { tone: "sun", label: t("billing.panel.pastDueBadge") };
    text = t("billing.panel.pastDue", {
      date: day((sub.pastDueSince ?? Date.now()) + GRACE_DAYS * DAY),
    });
  } else if (sub.cancelAtPeriodEnd) {
    badge = { tone: "sun", label: t("billing.panel.endingBadge") };
    text = t("billing.panel.ending", { date: day(sub.periodEnd) });
  } else if (sub.status === "trialing") {
    badge = { tone: "sun", label: t("billing.panel.trialBadge") };
    text = t("billing.panel.trial", { date: day(sub.periodEnd) });
  } else {
    badge = { tone: "herb", label: t("billing.panel.activeBadge") };
    text = t("billing.panel.active", { date: day(sub.periodEnd) });
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={badge.tone}>{badge.label}</Badge>
        <span className="text-[15px] font-bold text-muted">
          {t("billing.panel.price")}
        </span>
      </div>
      <p className="text-[16px]">{text}</p>
      {sub.email && (
        <p className="text-[15px] text-muted">
          {t("billing.panel.email", { email: sub.email })}
        </p>
      )}
      {sub.hasCustomer && (
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => void go(() => openPortal({ token }))}
        >
          <ExternalLink size={20} /> {t("billing.panel.manage")}
        </Button>
      )}
      {(!sub.status || sub.status === "canceled") && (access === "readonly" || sub.offered) && (
        <Button
          variant={sub.offered ? "secondary" : "primary"}
          disabled={busy}
          onClick={() => void go(() => startCheckout({ token }))}
        >
          <CreditCard size={20} />{" "}
          {sub.offered
            ? t("billing.panel.support")
            : t("billing.panel.reactivate")}
        </Button>
      )}
      {sub.hasCustomer && (
        <p className="text-[14px] text-muted">
          {t("billing.panel.manageHelp")}
        </p>
      )}
    </div>
  );
}
