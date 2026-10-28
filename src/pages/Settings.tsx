import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "convex/react";
import { ChevronRight, LogOut, Plus, Share2 } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { Lang } from "../../convex/domain/lang";
import { dayName } from "../../convex/domain/dates";
import { useBase, useSession, type Base } from "../lib/session";
import { useRun, useToast } from "../lib/toast";
import { errorMessage } from "../lib/format";
import { appUrl, shareLink } from "../lib/share";
import { BackButton } from "../components/Layout";
import {
  Avatar,
  Button,
  Card,
  Chip,
  Loading,
  Page,
  SectionTitle,
  Stepper,
  TextInput,
} from "../components/ui";
import { ChainMark } from "../components/shopping/chains";
import { useT } from "../i18n/useT";
import { ConfirmSheet } from "../components/shopping/ConfirmSheet";
import { SubscriptionPanel } from "../components/SubscriptionPanel";
import { AccountPanel, FamilyDataPanel } from "../components/AccountPanel";
import { MemberSheet } from "../components/shopping/MemberSheet";
import { AisleSheet } from "../components/shopping/AisleSheet";

// Monday first, as on a Swiss calendar; values follow Date.getDay()
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0];

/** « Lun », « Mar »… in French; « Mo », « Di »… in German. */
function dayButtonLabel(weekday: number, lang: Lang) {
  const long = dayName(weekday, lang);
  return lang === "de"
    ? long.slice(0, 2)
    : long.charAt(0).toUpperCase() + long.slice(1, 3);
}

type Editing =
  | { kind: "member"; id?: Id<"members"> }
  | { kind: "aisle"; id?: Id<"aisles"> }
  | null;

export function SettingsPage() {
  const base = useBase();
  const { t } = useT();
  return (
    <Page
      title={t("common.settings.title")}
      back={<BackButton fallback="/plus" />}
    >
      {base ? <SettingsContent base={base} /> : <Loading />}
    </Page>
  );
}

function SettingsContent({ base }: { base: Base }) {
  const { token, setToken, account } = useSession();
  const { t, lang } = useT();
  const run = useRun();
  const updateSettings = useMutation(api.catalog.updateSettings);
  const logout = useMutation(api.access.logout);
  const [editing, setEditing] = useState<Editing>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [newShoppingDay, setNewShoppingDay] = useState<number | null>(null);

  const { settings } = base;
  const shoppingDayName =
    dayName(settings.shoppingDay, lang) ?? dayName(6, lang);
  const close = () => setEditing(null);

  return (
    <>
      <SectionTitle>{t("common.settings.family")}</SectionTitle>
      <FamilyNameCard />

      {account?.role === "admin" && (
        <>
          <SectionTitle>{t("billing.panel.title")}</SectionTitle>
          <Card className="p-4">
            <SubscriptionPanel />
          </Card>
        </>
      )}

      <SectionTitle>{t("common.settings.profiles")}</SectionTitle>
      <Card className="overflow-hidden">
        <ul className="divide-y divide-line" data-tour="profiles">
          {base.members.map((m) => (
            <li key={m._id}>
              <Row
                onClick={() => setEditing({ kind: "member", id: m._id })}
                icon={<Avatar member={m} size={40} />}
                title={m.name}
              />
            </li>
          ))}
          <li>
            <AddRow
              label={t("common.settings.addProfile")}
              onClick={() => setEditing({ kind: "member" })}
            />
          </li>
        </ul>
      </Card>

      <SectionTitle>{t("common.settings.shoppingDay")}</SectionTitle>
      <Card className="p-4">
        <div className="grid grid-cols-7 gap-1.5" data-tour="shopping-day">
          {WEEKDAYS.map((day) => (
            <button
              key={day}
              type="button"
              aria-pressed={settings.shoppingDay === day}
              aria-label={dayName(day, lang)}
              onClick={() =>
                settings.shoppingDay !== day && setNewShoppingDay(day)
              }
              className={
                settings.shoppingDay === day
                  ? "min-h-12 rounded-2xl bg-carrot text-[15px] font-black text-white shadow-sm"
                  : "min-h-12 rounded-2xl bg-cream text-[15px] font-extrabold text-ink ring-1 ring-line active:bg-carrot-soft"
              }
            >
              {dayButtonLabel(day, lang)}
            </button>
          ))}
        </div>
        <p className="mt-3 text-[15px] text-muted">
          {t("common.settings.shoppingDayHelp", { day: shoppingDayName })}
        </p>
      </Card>

      <SectionTitle>{t("common.settings.defaultPortions")}</SectionTitle>
      <Card className="flex items-center gap-3 p-4">
        <p className="min-w-0 flex-1 text-[15px] text-muted">
          {t("common.settings.defaultPortionsHelp")}
        </p>
        <Stepper
          label={t("common.settings.defaultPortions")}
          value={settings.defaultPersons}
          min={1}
          max={12}
          onChange={(n) =>
            run(() => updateSettings({ token, defaultPersons: n }))
          }
        />
      </Card>

      <SectionTitle
        action={
          <Link
            to="/magasins"
            className="inline-flex min-h-11 items-center gap-1 rounded-2xl px-2 text-[15px] font-extrabold text-carrot-dark active:bg-carrot-soft"
          >
            {t("common.settings.manage")} <ChevronRight size={18} />
          </Link>
        }
      >
        {t("common.settings.defaultStore")}
      </SectionTitle>
      {base.stores.length === 0 ? (
        <p className="px-1 text-[15px] text-muted">
          {t("common.settings.noStore")}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {base.stores.map((s) => (
            <Chip
              key={s._id}
              selected={settings.defaultStoreId === s._id}
              onClick={() =>
                settings.defaultStoreId !== s._id &&
                run(() => updateSettings({ token, defaultStoreId: s._id }))
              }
              className="min-h-11 pl-1.5"
            >
              <ChainMark chain={s.chain} size={30} />
              {s.name}
            </Chip>
          ))}
        </div>
      )}

      <SectionTitle>{t("common.settings.aisles")}</SectionTitle>
      <Card className="overflow-hidden">
        <ul className="divide-y divide-line">
          {base.aisles.map((a) => (
            <li key={a._id}>
              <Row
                onClick={() => setEditing({ kind: "aisle", id: a._id })}
                icon={
                  <span className="text-2xl" aria-hidden>
                    {a.emoji}
                  </span>
                }
                title={a.name}
              />
            </li>
          ))}
          <li>
            <AddRow
              label={t("common.settings.addAisle")}
              onClick={() => setEditing({ kind: "aisle" })}
            />
          </li>
        </ul>
      </Card>

      <SectionTitle>{t("common.settings.ingredientsAndPrices")}</SectionTitle>
      <Link to="/produits">
        <Card className="flex min-h-14 items-center gap-3 px-4 py-3">
          <span className="text-2xl" aria-hidden>
            🧺
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[17px] font-extrabold">
              {t("common.settings.products")}
            </span>
            <span className="block text-[15px] text-muted">
              {t("common.settings.productsCount", {
                count: base.ingredients.length,
              })}
            </span>
          </span>
          <ChevronRight className="shrink-0 text-muted" size={20} />
        </Card>
      </Link>

      <SectionTitle>{t("account.title")}</SectionTitle>
      <Card className="p-4">
        <AccountPanel />
      </Card>

      {account?.role === "admin" && (
        <>
          <SectionTitle>{t("account.dataTitle")}</SectionTitle>
          <Card className="p-4">
            <FamilyDataPanel />
          </Card>
        </>
      )}

      <SectionTitle>{t("common.settings.thisPhone")}</SectionTitle>
      <div className="grid gap-2">
        <Button
          variant="danger"
          size="lg"
          onClick={() => setConfirmLogout(true)}
        >
          <LogOut size={20} /> {t("common.settings.logout")}
        </Button>
      </div>

      {editing?.kind === "member" && (
        <MemberSheet
          member={base.members.find((m) => m._id === editing.id)}
          onClose={close}
        />
      )}
      {editing?.kind === "aisle" && (
        <AisleSheet
          aisle={base.aisles.find((a) => a._id === editing.id)}
          onClose={close}
        />
      )}
      <ConfirmSheet
        open={newShoppingDay !== null}
        onClose={() => setNewShoppingDay(null)}
        title={t("common.settings.changeDayTitle", {
          day: newShoppingDay !== null ? dayName(newShoppingDay, lang) : "",
        })}
        text={t("common.settings.changeDayText")}
        confirmLabel={t("common.settings.changeDayConfirm")}
        onConfirm={() =>
          newShoppingDay !== null
            ? run(() => updateSettings({ token, shoppingDay: newShoppingDay }))
            : Promise.resolve()
        }
      />
      <ConfirmSheet
        open={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        title={t("common.settings.logoutTitle")}
        text={t("common.settings.logoutText")}
        confirmLabel={t("common.settings.logoutConfirm")}
        danger
        onConfirm={async () => {
          await run(() => logout({ token }));
          setToken("");
        }}
      />
    </>
  );
}

/** Family name, which also gives the sign-in link; only admins rename it. */
export function FamilyNameCard() {
  const { token, account } = useSession();
  const { t, lang } = useT();
  const run = useRun();
  const toast = useToast();
  const rename = useMutation(api.families.rename);
  const [name, setName] = useState(account?.family.name ?? "");
  if (!account) return null;
  const isAdmin = account.role === "admin";
  const link = appUrl(`/f/${account.family.slug}`);

  const save = async () => {
    if (!name.trim() || name.trim() === account.family.name) {
      setName(account.family.name);
      return;
    }
    const next = await run(
      () => rename({ token, name }),
      t("common.family.nameSaved"),
    );
    setName(next?.name ?? account.family.name);
  };

  const share = async () => {
    try {
      const done = await shareLink(
        link,
        t("common.family.shareText", { family: account.family.name }),
      );
      if (done === "copied") toast(t("common.linkCopied"));
    } catch (e) {
      toast(errorMessage(e, lang), "error");
    }
  };

  return (
    <Card className="grid gap-3 p-4">
      {isAdmin ? (
        <TextInput
          label={t("common.family.name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={save}
        />
      ) : (
        <p className="text-[17px] font-black">{account.family.name}</p>
      )}
      <div>
        <span className="block text-[15px] font-bold">
          {t("common.family.signInLink")}
        </span>
        <span className="block break-all text-[15px] text-muted">
          {link.replace(/^https?:\/\//, "")}
        </span>
        {isAdmin && (
          <span className="mt-1 block text-[15px] text-muted">
            {t("common.family.linkFollowsName")}
          </span>
        )}
      </div>
      <Button variant="secondary" onClick={share}>
        <Share2 size={20} /> {t("common.family.shareLink")}
      </Button>
    </Card>
  );
}

function Row({
  onClick,
  icon,
  title,
  subtitle,
}: {
  onClick: () => void;
  icon: ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left active:bg-cream"
    >
      <span className="flex w-10 shrink-0 justify-center">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[17px] font-extrabold">
          {title}
        </span>
        {subtitle && (
          <span className="block truncate text-[15px] text-muted">
            {subtitle}
          </span>
        )}
      </span>
      <ChevronRight className="shrink-0 text-muted" size={20} />
    </button>
  );
}

function AddRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-14 w-full items-center gap-3 px-4 text-left font-extrabold text-carrot-dark active:bg-carrot-soft"
    >
      <span className="flex w-10 shrink-0 justify-center">
        <span className="flex size-9 items-center justify-center rounded-full bg-carrot-soft">
          <Plus size={20} strokeWidth={3} />
        </span>
      </span>
      {label}
    </button>
  );
}
