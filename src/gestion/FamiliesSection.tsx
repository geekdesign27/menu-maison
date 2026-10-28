import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { KeyRound, Pause, Play, Plus, Share2 } from "lucide-react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../convex/_generated/api";
import { pseudoFromName } from "../../convex/domain/auth";
import { useSession } from "../lib/session";
import { useRun, useToast } from "../lib/toast";
import { errorMessage, plural } from "../lib/format";
import { appUrl, shareLink } from "../lib/share";
import {
  Badge,
  Button,
  ErrorBox,
  Loading,
  Sheet,
  TextInput,
} from "../components/ui";
import { ConfirmSheet } from "../components/shopping/ConfirmSheet";
import { DataTable, type Column } from "./DataTable";
import { GestionHeader } from "./GestionLayout";

type Family = FunctionReturnType<typeof api.superadmin.families>[number];

const DATE = new Intl.DateTimeFormat("fr-CH", {
  day: "numeric",
  month: "short",
  year: "numeric",
});
const shortDate = (ms: number | null) => (ms ? DATE.format(ms) : "jamais");
const shortLink = (slug: string) =>
  appUrl(`/f/${slug}`).replace(/^https?:\/\//, "");

/** Super-admin: every family of the app, create one, help its admin, suspend it. */
export function FamiliesSection() {
  const { token, account } = useSession();
  const isSuperadmin = account?.superadmin === true;
  const families = useQuery(
    api.superadmin.families,
    isSuperadmin ? { token } : "skip",
  );
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  if (!isSuperadmin)
    return (
      <div className="p-6">
        <ErrorBox>Cette page est réservée au super-admin.</ErrorBox>
      </div>
    );
  if (!families) return <Loading />;
  const open = families.find((f) => f._id === openId);

  const columns: Column<Family>[] = [
    {
      key: "name",
      label: "Famille",
      sort: (f) => f.name,
      render: (f) => (
        <span className="block">
          <span className="font-extrabold">{f.name}</span>
          {f.isMine && <span className="text-muted"> (la tienne)</span>}
          <span className="block text-[13px] text-muted">
            {shortLink(f.slug)}
          </span>
        </span>
      ),
    },
    {
      key: "members",
      label: "Comptes activés",
      align: "right",
      sort: (f) => f.members.filter((m) => m.activated).length,
      render: (f) =>
        `${f.members.filter((m) => m.activated).length} sur ${f.members.length}`,
    },
    {
      key: "recipes",
      label: "Recettes",
      align: "right",
      sort: (f) => f.recipes,
      render: (f) => f.recipes,
    },
    {
      key: "lastSignIn",
      label: "Dernière connexion",
      sort: (f) => f.lastSignIn ?? 0,
      render: (f) => shortDate(f.lastSignIn),
    },
    {
      key: "createdAt",
      label: "Créée le",
      sort: (f) => f.createdAt,
      render: (f) => shortDate(f.createdAt),
    },
    {
      key: "status",
      label: "Statut",
      sort: (f) => (f.suspended ? 1 : 0),
      render: (f) =>
        f.suspended ? (
          <Badge tone="berry">Suspendue</Badge>
        ) : (
          <Badge tone="herb">Active</Badge>
        ),
    },
  ];

  return (
    <>
      <GestionHeader
        title="Familles"
        subtitle={`${plural(families.length, "famille", "familles")} sur Menu Maison. Espace réservé au super-admin.`}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus size={20} /> Créer une famille
          </Button>
        }
      />
      <div className="max-w-5xl px-6 pb-10">
        <DataTable
          rows={families}
          columns={columns}
          rowKey={(f) => f._id}
          onOpen={(f) => setOpenId(f._id)}
          openLabel={(f) => `Ouvrir ${f.name}`}
          initialSort={{ key: "createdAt", direction: "asc" }}
        />
      </div>
      {creating && <CreateFamilySheet onClose={() => setCreating(false)} />}
      {open && <FamilySheet family={open} onClose={() => setOpenId(null)} />}
    </>
  );
}

/** A one-time link ready to send, shown in full to be copied on a computer. */
function LinkReady({
  url,
  message,
  note,
}: {
  url: string;
  message: string;
  note: string;
}) {
  const toast = useToast();
  const send = async () => {
    try {
      const done = await shareLink(url, message);
      if (done === "copied") toast("Lien copié, colle-le dans un message.");
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };
  return (
    <div className="grid gap-2 rounded-2xl bg-herb-soft p-4">
      <p className="text-[15px] font-bold">{note}</p>
      <code className="block rounded-xl bg-paper p-3 text-[13px] break-all select-all">
        {url}
      </code>
      <Button onClick={send}>
        <Share2 size={20} /> Envoyer ou copier le lien
      </Button>
    </div>
  );
}

function CreateFamilySheet({ onClose }: { onClose: () => void }) {
  const { token } = useSession();
  const run = useRun();
  const create = useMutation(api.superadmin.createOne);
  const [name, setName] = useState("");
  const [admin, setAdmin] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{
    name: string;
    slug: string;
    username: string;
    invite: string;
  } | null>(null);

  const submit = async () => {
    setBusy(true);
    const res = await run(
      () =>
        create({
          token,
          name,
          admin,
          username: username.trim() || undefined,
        }),
      `« ${name.trim()} » est créée`,
    );
    setBusy(false);
    if (res) setCreated({ name: name.trim(), ...res });
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={created ? `« ${created.name} » est créée` : "Créer une famille"}
      footer={
        created ? (
          <Button size="lg" variant="secondary" onClick={onClose}>
            Terminé
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={submit}
            disabled={busy || !name.trim() || !admin.trim()}
          >
            <Plus size={22} /> {busy ? "Création…" : "Créer la famille"}
          </Button>
        )
      }
    >
      {created ? (
        <div className="grid gap-4">
          <p className="text-[15px]">
            Catalogue de départ copié (rayons, ingrédients, recettes, magasins).
            Lien de connexion de la famille :{" "}
            <strong>{shortLink(created.slug)}</strong>
          </p>
          <LinkReady
            url={appUrl(`/activer/${created.invite}`)}
            message={`Bienvenue sur Menu Maison ! Ouvre ce lien pour choisir ton mot de passe. Ton pseudo : ${created.username}.`}
            note={`Lien d'activation de l'admin, pseudo « ${created.username} », valable 14 jours et utilisable une fois.`}
          />
        </div>
      ) : (
        <div className="grid gap-4">
          <TextInput
            label="Nom de la famille"
            placeholder="Dupont"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <TextInput
            label="Prénom de l'admin"
            placeholder="Marc"
            value={admin}
            onChange={(e) => setAdmin(e.target.value)}
          />
          <TextInput
            label="Pseudo de l'admin"
            autoCapitalize="none"
            autoCorrect="off"
            placeholder={
              admin.trim() ? pseudoFromName(admin) : "proposé d'après le prénom"
            }
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <p className="text-[15px] text-muted">
            Le nom donne le lien de connexion. L'admin choisira son mot de passe
            avec le lien que tu lui enverras, puis il ajoutera sa famille.
          </p>
        </div>
      )}
    </Sheet>
  );
}

function FamilySheet({
  family,
  onClose,
}: {
  family: Family;
  onClose: () => void;
}) {
  const { token } = useSession();
  const run = useRun();
  const adminLink = useMutation(api.superadmin.adminLink);
  const setSuspended = useMutation(api.superadmin.setSuspended);
  const [link, setLink] = useState<{
    url: string;
    member: Family["members"][number];
  } | null>(null);
  const [confirm, setConfirm] = useState(false);

  const newLink = async (member: Family["members"][number]) => {
    const t = await run(() => adminLink({ token, memberId: member._id }));
    if (t) setLink({ url: appUrl(`/activer/${t}`), member });
  };

  return (
    <Sheet open onClose={onClose} title={family.name}>
      <div className="grid gap-4">
        <p className="text-[15px]">
          Lien de connexion : <strong>{shortLink(family.slug)}</strong>
          <br />
          {plural(family.recipes, "recette", "recettes")}, créée le{" "}
          {shortDate(family.createdAt)}, dernière connexion{" "}
          {family.lastSignIn
            ? `le ${shortDate(family.lastSignIn)}`
            : ": jamais"}
          .
        </p>

        <section className="grid gap-2">
          <h3 className="text-[17px] font-black">Membres</h3>
          <ul className="divide-y divide-line rounded-2xl bg-paper ring-1 ring-line">
            {family.members.map((m) => (
              <li key={m._id} className="flex flex-wrap items-center gap-2 p-3">
                <span className="min-w-0 flex-1">
                  <span className="font-extrabold">{m.name}</span>
                  {m.username && (
                    <span className="text-muted"> · {m.username}</span>
                  )}
                  <span className="mt-0.5 flex gap-1">
                    {m.admin && <Badge tone="carrot">Admin</Badge>}
                    {m.activated ? (
                      <Badge tone="herb">Activé</Badge>
                    ) : m.username ? (
                      <Badge tone="sun">Pas encore activé</Badge>
                    ) : (
                      <Badge>Sans accès</Badge>
                    )}
                  </span>
                </span>
                {m.admin && m.username && !family.isMine && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => newLink(m)}
                  >
                    <KeyRound size={18} /> Nouveau lien
                  </Button>
                )}
              </li>
            ))}
          </ul>
          {family.isMine && (
            <p className="text-[15px] text-muted">
              Pour ta famille, les liens se créent dans Réglages, Profils.
            </p>
          )}
        </section>

        {link && (
          <LinkReady
            url={link.url}
            message={`Voici ton lien Menu Maison pour choisir ton mot de passe. Ton pseudo : ${link.member.username}.`}
            note={`Lien pour ${link.member.name}, valable ${link.member.activated ? "48 heures" : "14 jours"} et utilisable une fois. Ses appareils sont déconnectés.`}
          />
        )}

        {!family.isMine && (
          <Button
            variant={family.suspended ? "herb" : "danger"}
            onClick={() => setConfirm(true)}
          >
            {family.suspended ? (
              <>
                <Play size={20} /> Réactiver la famille
              </>
            ) : (
              <>
                <Pause size={20} /> Suspendre la famille
              </>
            )}
          </Button>
        )}
      </div>
      <ConfirmSheet
        open={confirm}
        onClose={() => setConfirm(false)}
        title={
          family.suspended
            ? `Réactiver ${family.name} ?`
            : `Suspendre ${family.name} ?`
        }
        text={
          family.suspended
            ? "Ses membres pourront à nouveau se connecter avec leur pseudo et leur mot de passe, et retrouveront toutes leurs données."
            : "Tous ses appareils sont déconnectés et ses liens en attente annulés. Rien n'est effacé : tu peux réactiver la famille à tout moment."
        }
        confirmLabel={family.suspended ? "Réactiver" : "Suspendre"}
        danger={!family.suspended}
        onConfirm={() =>
          run(
            () =>
              setSuspended({
                token,
                familyId: family._id,
                suspended: !family.suspended,
              }),
            family.suspended
              ? `${family.name} est réactivée.`
              : `${family.name} est suspendue.`,
          ).then(() => undefined)
        }
      />
    </Sheet>
  );
}
