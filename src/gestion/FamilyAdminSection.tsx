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
import { FamilyNameCard } from "../pages/Settings";
import { DataTable, type Column } from "./DataTable";
import { GestionHeader } from "./GestionLayout";

/** Family admins: name and link, accounts and roles, colours and font. */
export function FamilyAdminSection() {
  const base = useBase();
  const { account } = useSession();
  // undefined: closed; null: new profile
  const [editing, setEditing] = useState<Id<"members"> | null | undefined>(
    undefined,
  );

  if (account && account.role !== "admin")
    return (
      <div className="p-6">
        <ErrorBox>Cette page est réservée aux admins de la famille.</ErrorBox>
      </div>
    );
  if (!base || !account) return <Loading />;

  const columns: Column<Member>[] = [
    {
      key: "name",
      label: "Profil",
      sort: (m) => m.order,
      render: (m) => (
        <span className="flex items-center gap-3">
          <Avatar member={m} size={36} />
          <span className="font-extrabold">{m.name}</span>
          {m._id === account.memberId && (
            <span className="text-muted">(toi)</span>
          )}
        </span>
      ),
    },
    {
      key: "username",
      label: "Pseudo",
      sort: (m) => m.username ?? "",
      render: (m) => m.username ?? <span className="text-muted">aucun</span>,
    },
    {
      key: "role",
      label: "Rôle",
      sort: (m) => (m.role === "admin" ? 0 : 1),
      render: (m) =>
        m.role === "admin" ? (
          <Badge tone="carrot">Admin</Badge>
        ) : (
          <Badge>Membre</Badge>
        ),
    },
    {
      key: "access",
      label: "Accès",
      sort: (m) => (m.hasPassword ? 0 : m.username ? 1 : 2),
      render: (m) =>
        m.hasPassword ? (
          <Badge tone="herb">Activé</Badge>
        ) : m.username ? (
          <Badge tone="sun">Pas encore activé</Badge>
        ) : (
          <Badge>Sans accès</Badge>
        ),
    },
  ];

  return (
    <>
      <GestionHeader
        title="Famille"
        subtitle={`${account.family.name} : ${plural(base.members.length, "profil", "profils")}, comptes et apparence de l'app.`}
      />
      <div className="grid max-w-4xl gap-8 px-6 pb-10">
        <section className="grid gap-3">
          <h2 className="text-xl font-black">Nom et lien de connexion</h2>
          <FamilyNameCard />
        </section>

        <section className="grid gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-black">Comptes</h2>
              <p className="text-[15px] text-muted">
                Clique sur un profil pour son pseudo, son rôle et son lien
                d'activation ou de mot de passe oublié.
              </p>
            </div>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              <Plus size={20} /> Ajouter un profil
            </Button>
          </div>
          <DataTable
            rows={base.members}
            columns={columns}
            rowKey={(m) => m._id}
            onOpen={(m) => setEditing(m._id)}
            openLabel={(m) => `Modifier ${m.name}`}
          />
        </section>

        <LookSection theme={account.look.theme} font={account.look.font} />
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

/** Colours and font of the whole family, applied live on every phone. */
function LookSection({ theme, font }: { theme: Theme; font: Font }) {
  const { token } = useSession();
  const run = useRun();
  const updateSettings = useMutation(api.catalog.updateSettings);

  // The previews show every font: loaded here only, on this admin page
  useEffect(() => {
    for (const f of FONTS) void f.load().catch(() => undefined);
  }, []);

  return (
    <section className="grid gap-4">
      <div>
        <h2 className="text-xl font-black">Apparence</h2>
        <p className="text-[15px] text-muted">
          Le choix vaut pour toute la famille, sur tous les téléphones, tout de
          suite.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {THEMES.map((t) => {
          const chosen = t.id === theme;
          const [cream, accent, soft, other] = t.swatch;
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={chosen}
              onClick={() =>
                !chosen &&
                void run(
                  () => updateSettings({ token, theme: t.id }),
                  `Thème ${t.label}`,
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
                  {t.label}
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
                  Bouton
                </span>
                <span
                  className="rounded-xl px-3 py-1.5 text-[15px] font-extrabold"
                  style={{ background: soft }}
                >
                  Onglet
                </span>
                <span
                  className="size-8 rounded-full"
                  style={{ background: other }}
                />
              </span>
              <span className="text-[15px] text-[#6b6058]">
                {t.description}
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
                  `Police ${f.label}`,
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
                Gratin de courgettes
              </span>
              <span
                className="text-[15px]"
                style={{ fontFamily: `"${f.family}", sans-serif` }}
              >
                {f.description}. Lundi 3 portions, 1 l de lait, 250 g de
                gruyère.
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
