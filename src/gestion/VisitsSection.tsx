import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { FUNNEL, StatEvent } from "../../convex/domain/visits";
import { useSession } from "../lib/session";
import { cx, ErrorBox, Loading } from "../components/ui";
import { GestionHeader } from "./GestionLayout";

// Reserved to PA: French only, like the rest of Super admin
const PERIODS = [7, 30, 365] as const;
type Period = (typeof PERIODS)[number];

const FUNNEL_LABELS: Record<(typeof FUNNEL)[number], string> = {
  visit: "Visites",
  trial: "Clic « Essayer »",
  checkout: "Paiement Stripe ouvert",
  trialStarted: "Essai démarré",
  paid: "Abonnement payé",
};
// Short names for the click bars
const CLICKS: { event: StatEvent; label: string }[] = [
  { event: "login", label: "Se connecter" },
  { event: "pricing", label: "Tarif" },
  { event: "contact", label: "En parler avec P-A" },
  { event: "lang", label: "FR | DE" },
];
const DEVICE_LABELS: Record<string, string> = {
  mobile: "Téléphone",
  desktop: "Ordinateur",
};
const LANG_LABELS: Record<string, string> = { fr: "Français", de: "Allemand" };

const DAY = new Intl.DateTimeFormat("fr-CH", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const MONTH = new Intl.DateTimeFormat("fr-CH", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-paper p-5 ring-1 ring-line">
      <h2 className="text-[17px] font-black">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** A list of counts with a bar each, against the largest. */
function Bars({
  items,
  empty,
}: {
  items: { label: string; count: number }[];
  empty: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.count));
  if (!items.some((i) => i.count > 0))
    return <p className="text-[16px] text-muted">{empty}</p>;
  return (
    <ul className="grid gap-2">
      {items.map((item) => (
        <li
          key={item.label}
          className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-[16px]"
        >
          <span className="truncate">{item.label}</span>
          <span className="h-3 rounded-full bg-cream" aria-hidden>
            <span
              className="block h-3 rounded-full bg-carrot"
              style={{ width: `${(item.count / max) * 100}%` }}
            />
          </span>
          <span className="font-bold tabular-nums">{item.count}</span>
        </li>
      ))}
    </ul>
  );
}

/** Days with visits, newest first; grouped by month over a year so the list stays readable. */
function byPeriod(days: { day: string; count: number }[], period: Period) {
  if (period !== 365)
    return days
      .filter((d) => d.count > 0)
      .reverse()
      .map((d) => ({ label: DAY.format(new Date(d.day)), count: d.count }));
  const months = new Map<string, number>();
  for (const d of days)
    months.set(
      d.day.slice(0, 7),
      (months.get(d.day.slice(0, 7)) ?? 0) + d.count,
    );
  return [...months].reverse().map(([month, count]) => ({
    label: MONTH.format(new Date(`${month}-01`)),
    count,
  }));
}

/** Super admin, Statistiques: visits, clicks and the conversion funnel, counters only. */
export function VisitsSection() {
  const { token, account } = useSession();
  const isSuperadmin = account?.superadmin === true;
  const [period, setPeriod] = useState<Period>(30);
  const stats = useQuery(
    api.visits.summary,
    isSuperadmin ? { token, days: period } : "skip",
  );

  if (!isSuperadmin)
    return (
      <div className="p-6">
        <ErrorBox>Cette page est réservée au super-admin.</ErrorBox>
      </div>
    );

  return (
    <div>
      <GestionHeader
        title="Statistiques"
        subtitle="Visiteurs de menumaison.ch, sans cookie ni donnée personnelle. Les téléphones des familles connectées ne comptent pas."
      />
      <div className="px-6 pb-4">
          <div
            role="group"
            aria-label="Période"
            className="inline-flex rounded-full bg-paper p-1 ring-1 ring-line"
          >
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={period === p}
                onClick={() => setPeriod(p)}
                className={cx(
                  "min-h-11 rounded-full px-4 text-[16px] font-bold",
                  period === p
                    ? "bg-carrot text-white"
                    : "text-ink/70 hover:bg-carrot-soft",
                )}
              >
                {p === 365 ? "1 an" : `${p} jours`}
              </button>
            ))}
          </div>
      </div>
      {!stats ? (
        <Loading />
      ) : (
        <div className="grid gap-4 px-6 pb-10 lg:grid-cols-2">
          <Card title="Entonnoir">
            <ol className="grid gap-2">
              {stats.funnel.map((step, i) => (
                <li
                  key={step.event}
                  className="flex items-baseline justify-between gap-3 text-[16px]"
                >
                  <span>
                    {i + 1}. {FUNNEL_LABELS[step.event]}
                  </span>
                  <span className="whitespace-nowrap">
                    <strong className="tabular-nums">{step.count}</strong>
                    {step.rate !== null && (
                      <span className="ml-2 text-muted tabular-nums">
                        {step.rate} %
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-[16px] text-muted">
              Le pourcentage compare chaque étape à la précédente. Les étapes 1
              et 2 viennent des navigateurs : chiffres indicatifs, une visite par
              ouverture de la page. Les étapes 3 à 5 viennent des vraies
              inscriptions.
            </p>
          </Card>
          <Card title="Autres clics">
            <Bars
              items={CLICKS.map((c) => ({
                label: c.label,
                count: stats.totals[c.event] ?? 0,
              }))}
              empty="Aucun clic."
            />
          </Card>
          <Card
            title={period === 365 ? "Visites par mois" : "Visites par jour"}
          >
            <Bars
              items={byPeriod(stats.visitsByDay, period)}
              empty="Aucune visite sur la période."
            />
          </Card>
          <Card title="Provenance">
            <Bars
              items={stats.sources.map((s) => ({
                label: s.key,
                count: s.count,
              }))}
              empty="Aucune visite."
            />
          </Card>
          <Card title="Appareil">
            <Bars
              items={stats.devices.map((d) => ({
                label: DEVICE_LABELS[d.key] ?? d.key,
                count: d.count,
              }))}
              empty="Aucune visite."
            />
          </Card>
          <Card title="Langue">
            <Bars
              items={stats.langs.map((l) => ({
                label: LANG_LABELS[l.key] ?? l.key,
                count: l.count,
              }))}
              empty="Aucune visite."
            />
          </Card>
        </div>
      )}
    </div>
  );
}
