import { accessOf, daysLeft, GRACE_DAYS, isOffered } from "../../convex/domain/billing";
import { formatDayWithYear } from "../../convex/domain/dates";
import { useSession } from "../lib/session";
import { useT } from "../i18n/useT";
import { cx } from "./ui";

const DAY = 24 * 60 * 60 * 1000;

/** ISO day of a time, for the date helpers. */
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/**
 * One line at the top of the app about the subscription: the trial and a
 * resignation for the admins, a failed payment and the read-only state for all.
 * Nothing for offered and paid families.
 */
export function SubscriptionBanner() {
  const { account } = useSession();
  const { t, lang } = useT();
  if (!account) return null;
  const sub = account.subscription;
  const family = {
    offered: sub.offered,
    billing: sub.status
      ? { status: sub.status, periodEnd: sub.periodEnd ?? undefined, pastDueSince: sub.pastDueSince ?? undefined }
      : undefined,
  };
  if (isOffered(family)) return null;
  const now = Date.now();
  const access = accessOf(family, now);
  const admin = account.role === "admin";

  let text: string | null = null;
  let tone: "info" | "warn" | "bad" = "info";
  if (access === "readonly") {
    text = t(admin ? "billing.readOnlyAdmin" : "billing.readOnly");
    tone = "bad";
  } else if (access === "grace") {
    text = t("billing.pastDue", {
      date: formatDayWithYear(isoDay((sub.pastDueSince ?? now) + GRACE_DAYS * DAY), lang),
    });
    tone = "warn";
  } else if (admin && sub.status === "trialing" && !sub.cancelAtPeriodEnd) {
    const days = daysLeft(sub.periodEnd ?? undefined, now);
    text = days <= 1 ? t("billing.trialLastDay") : t("billing.trial", { days });
  } else if (admin && sub.cancelAtPeriodEnd && sub.periodEnd) {
    text = t("billing.ending", { date: formatDayWithYear(isoDay(sub.periodEnd), lang) });
    tone = "warn";
  }
  if (!text) return null;

  return (
    <p
      role={tone === "info" ? "status" : "alert"}
      className={cx(
        "mx-auto max-w-2xl px-4 py-2.5 text-center text-[15px] font-bold",
        tone === "info" && "bg-carrot-soft text-carrot-dark",
        tone === "warn" && "bg-sun-soft text-ink",
        tone === "bad" && "bg-berry-soft text-berry",
      )}
    >
      {text}
    </p>
  );
}
