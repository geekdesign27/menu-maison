import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { Check, Plus } from "lucide-react";
import type { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import { useBase, useSession, type Member } from "../lib/session";
import { useRun } from "../lib/toast";
import { plural } from "../lib/format";
import { FONTS, THEMES, type Font, type Theme } from "../lib/look";
import { Avatar, Badge, Button, cx, ErrorBox, Loading } from "../components/ui";
import { MemberSheet } from "../components/shopping/MemberSheet";
import { Toggle } from "../components/planning/controls";
import { FamilyNameCard } from "../pages/Settings";
import { DataTable, type Column } from "./DataTable";
import { GestionHeader } from "./GestionLayout";
import { useT } from "../i18n/useT";

/** Family admins: name and link, accounts and roles, colours and font. */
export function FamilyAdminSection() {
  const base = useBase();
  const { account } = useSession();
  const { t } = useT();
  // undefined: closed; null: new profile
  const [editing, setEditing] = useState<Id<"members"> | null | undefined>(
    undefined,
  );

  if (account && account.role !== "admin")
    return (
      <div className="p-6">
        <ErrorBox>{t("admin.family.adminOnly")}</ErrorBox>
      </div>
    );
  if (!base || !account) return <Loading />;

  const columns: Column<Member>[] = [
    {
      key: "name",
      label: t("admin.family.colProfile"),
      sort: (m) => m.order,
      render: (m) => (
        <span className="flex items-center gap-3">
          <Avatar member={m} size={36} />
          <span className="font-extrabold">{m.name}</span>
          {m._id === account.memberId && (
            <span className="text-muted">{t("admin.family.me")}</span>
          )}
        </span>
      ),
    },
    {
      key: "username",
      label: t("admin.family.colUsername"),
      sort: (m) => m.username ?? "",
      render: (m) =>
        m.username ?? (
          <span className="text-muted">{t("admin.family.noUsername")}</span>
        ),
    },
    {
      key: "role",
      label: t("admin.family.colRole"),
      sort: (m) => (m.role === "admin" ? 0 : 1),
      render: (m) =>
        m.role === "admin" ? (
          <Badge tone="carrot">{t("admin.family.admin")}</Badge>
        ) : (
          <Badge>{t("admin.family.member")}</Badge>
        ),
    },
    {
      key: "lang",
      label: t("lang.column"),
      sort: (m) => (m.lang === "de" ? 1 : 0),
      render: (m) =>
        m.lang === "de" ? (
          <Badge tone="carrot">{t("lang.de")}</Badge>
        ) : (
          t("lang.fr")
        ),
    },
    {
      key: "access",
      label: t("admin.family.colAccess"),
      sort: (m) => (m.hasPassword ? 0 : m.username ? 1 : 2),
      render: (m) =>
        m.hasPassword ? (
          <Badge tone="herb">{t("admin.family.activated")}</Badge>
        ) : m.username ? (
          <Badge tone="sun">{t("admin.family.notActivated")}</Badge>
        ) : (
          <Badge>{t("admin.family.noAccess")}</Badge>
        ),
    },
  ];

  return (
    <>
      <GestionHeader
        title={t("admin.family.title")}
        subtitle={t("admin.family.subtitle", {
          family: account.family.name,
          count: plural(
            base.members.length,
            t("admin.family.profileOne"),
            t("admin.family.profileMany"),
          ),
        })}
      />
      <div className="grid max-w-4xl gap-8 px-6 pb-10">
        <section className="grid gap-3">
          <h2 className="text-xl font-black">
            {t("admin.family.nameAndLink")}
          </h2>
          <FamilyNameCard />
        </section>

        <section className="grid gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-black">
                {t("admin.family.accounts")}
              </h2>
              <p className="text-[15px] text-muted">
                {t("admin.family.accountsHelp")}
              </p>
            </div>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              <Plus size={20} /> {t("admin.family.addProfile")}
            </Button>
          </div>
          <DataTable
            rows={base.members}
            columns={columns}
            rowKey={(m) => m._id}
            onOpen={(m) => setEditing(m._id)}
            openLabel={(m) => t("admin.editName", { name: m.name })}
          />
        </section>

        <LookSection theme={account.look.theme} font={account.look.font} />

        <GuideSection enabled={base.settings.onboarding === true} />
      </div>
      {editing !== undefined && (
        <MemberSheet
          member={
            editing ? base.members.find((m) => m._id === editing) : undefined
          }
          onClose={() => setEditing(undefined)}
        />
      )}
    </>
  );
}

/** Switch of the onboarding: welcome card, tour and « Premiers pas » for new accounts. */
function GuideSection({ enabled }: { enabled: boolean }) {
  const { token } = useSession();
  const setEnabled = useMutation(api.onboarding.setEnabled);
  const run = useRun();
  const { t } = useT();
  return (
    <section className="grid gap-3">
      <div>
        <h2 className="text-xl font-black">{t("admin.guide.title")}</h2>
        <p className="text-[15px] text-muted">{t("admin.guide.help")}</p>
      </div>
      <div className="max-w-xl rounded-2xl bg-paper p-4 ring-1 ring-line">
        <Toggle
          checked={enabled}
          onChange={(on) =>
            void run(
              () => setEnabled({ token, enabled: on }),
              on ? t("admin.guide.on") : t("admin.guide.off"),
            )
          }
          label={t("admin.guide.title")}
          hint={enabled ? t("admin.guide.hintOn") : t("admin.guide.hintOff")}
        />
      </div>
    </section>
  );
}

/** Colours and font of the whole family, applied live on every phone. */
function LookSection({ theme, font }: { theme: Theme; font: Font }) {
  const { token } = useSession();
  const run = useRun();
  const updateSettings = useMutation(api.catalog.updateSettings);
  const { t } = useT();

  // The previews show every font: loaded here only, on this admin page
  useEffect(() => {
    for (const f of FONTS) void f.load().catch(() => undefined);
  }, []);

  return (
    <section className="grid gap-4" data-tour="look">
      <div>
        <h2 className="text-xl font-black">{t("admin.look.title")}</h2>
        <p className="text-[15px] text-muted">{t("admin.look.help")}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {THEMES.map((th) => {
          const chosen = th.id === theme;
          const [cream, accent, soft, other] = th.swatch;
          return (
            <button
              key={th.id}
              type="button"
              aria-pressed={chosen}
              onClick={() =>
                !chosen &&
                void run(
                  () => updateSettings({ token, theme: th.id }),
                  t("admin.look.theme", { name: th.label }),
                )
              }
              className={cx(
                "grid gap-3 rounded-2xl p-4 text-left ring-1 transition",
                chosen
                  ? "ring-[3px] ring-carrot"
                  : "ring-line hover:ring-carrot/50",
              )}
              style={{ background: cream }}
            >
              <span className="flex items-center justify-between">
                <span className="text-lg font-black text-[#2b2420]">
                  {th.label}
                </span>
                {chosen && (
                  <span
                    className="flex size-7 items-center justify-center rounded-full text-white"
                    style={{ background: accent }}
                  >
                    <Check size={18} strokeWidth={3} />
                  </span>
                )}
              </span>
              <span className="flex gap-2" aria-hidden>
                <span
                  className="rounded-xl px-3 py-1.5 text-[15px] font-extrabold text-white"
                  style={{ background: accent }}
                >
                  {t("admin.look.sampleButton")}
                </span>
                <span
                  className="rounded-xl px-3 py-1.5 text-[15px] font-extrabold"
                  style={{ background: soft }}
                >
                  {t("admin.look.sampleTab")}
                </span>
                <span
                  className="size-8 rounded-full"
                  style={{ background: other }}
                />
              </span>
              <span className="text-[15px] text-[#6b6058]">
                {th.description}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {FONTS.map((f) => {
          const chosen = f.id === font;
          return (
            <button
              key={f.id}
              type="button"
              aria-pressed={chosen}
              onClick={() =>
                !chosen &&
                void run(
                  () => updateSettings({ token, font: f.id }),
                  t("admin.look.font", { name: f.label }),
                )
              }
              className={cx(
                "grid gap-1 rounded-2xl bg-paper p-4 text-left ring-1 transition",
                chosen
                  ? "ring-[3px] ring-carrot"
                  : "ring-line hover:ring-carrot/50",
              )}
            >
              <span className="flex items-center justify-between text-[15px] font-bold text-muted">
                {f.label}
                {chosen && (
                  <Check size={18} strokeWidth={3} className="text-carrot" />
                )}
              </span>
              <span
                className="text-2xl font-black"
                style={{ fontFamily: `"${f.family}", sans-serif` }}
              >
                {t("admin.look.sampleDish")}
              </span>
              <span
                className="text-[15px]"
                style={{ fontFamily: `"${f.family}", sans-serif` }}
              >
                {t("admin.look.sampleText", { description: f.description })}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
