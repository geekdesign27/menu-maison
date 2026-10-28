import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "convex/react";
import { ChevronRight, LogOut, Plus, Share2 } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { DAY_NAMES } from "../../convex/domain/dates";
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
import { ConfirmSheet } from "../components/shopping/ConfirmSheet";
import { MemberSheet } from "../components/shopping/MemberSheet";
import { AisleSheet } from "../components/shopping/AisleSheet";

// Monday first, as on a Swiss calendar; values follow Date.getDay()
const DAYS = [1, 2, 3, 4, 5, 6, 0].map((value) => {
  const long = DAY_NAMES[value];
  return {
    value,
    long,
    short: long.charAt(0).toUpperCase() + long.slice(1, 3),
  };
});

type Editing =
  | { kind: "member"; id?: Id<"members"> }
  | { kind: "aisle"; id?: Id<"aisles"> }
  | null;

export function SettingsPage() {
  const base = useBase();
  return (
    <Page title="Réglages" back={<BackButton fallback="/plus" />}>
      {base ? <SettingsContent base={base} /> : <Loading />}
    </Page>
  );
}

function SettingsContent({ base }: { base: Base }) {
  const { token, setToken } = useSession();
  const run = useRun();
  const updateSettings = useMutation(api.catalog.updateSettings);
  const logout = useMutation(api.access.logout);
  const [editing, setEditing] = useState<Editing>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [newShoppingDay, setNewShoppingDay] = useState<number | null>(null);

  const { settings } = base;
  const shoppingDayName = DAY_NAMES[settings.shoppingDay] ?? "samedi";
  const close = () => setEditing(null);

  return (
    <>
      <SectionTitle>Famille</SectionTitle>
      <FamilyNameCard />

      <SectionTitle>Profils</SectionTitle>
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
              label="Ajouter un profil"
              onClick={() => setEditing({ kind: "member" })}
            />
          </li>
        </ul>
      </Card>

      <SectionTitle>Jour des courses</SectionTitle>
      <Card className="p-4">
        <div className="grid grid-cols-7 gap-1.5" data-tour="shopping-day">
          {DAYS.map((d) => (
            <button
              key={d.value}
              type="button"
              aria-pressed={settings.shoppingDay === d.value}
              aria-label={d.long}
              onClick={() =>
                settings.shoppingDay !== d.value && setNewShoppingDay(d.value)
              }
              className={
                settings.shoppingDay === d.value
                  ? "min-h-12 rounded-2xl bg-carrot text-[15px] font-black text-white shadow-sm"
                  : "min-h-12 rounded-2xl bg-cream text-[15px] font-extrabold text-ink ring-1 ring-line active:bg-carrot-soft"
              }
            >
              {d.short}
            </button>
          ))}
        </div>
        <p className="mt-3 text-[15px] text-muted">
          La semaine du planning commence le {shoppingDayName} : la liste de
          courses couvre les sept jours qui suivent.
        </p>
      </Card>

      <SectionTitle>Portions par défaut</SectionTitle>
      <Card className="flex items-center gap-3 p-4">
        <p className="min-w-0 flex-1 text-[15px] text-muted">
          Proposé à chaque nouveau repas planifié.
        </p>
        <Stepper
          label="Portions par défaut"
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
            Gérer <ChevronRight size={18} />
          </Link>
        }
      >
        Magasin par défaut
      </SectionTitle>
      {base.stores.length === 0 ? (
        <p className="px-1 text-[15px] text-muted">
          Aucun magasin pour l'instant.
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

      <SectionTitle>Rayons</SectionTitle>
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
              label="Ajouter un rayon"
              onClick={() => setEditing({ kind: "aisle" })}
            />
          </li>
        </ul>
      </Card>

      <SectionTitle>Ingrédients et prix</SectionTitle>
      <Link to="/produits">
        <Card className="flex min-h-14 items-center gap-3 px-4 py-3">
          <span className="text-2xl" aria-hidden>
            🧺
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[17px] font-extrabold">Produits</span>
            <span className="block text-[15px] text-muted">
              {base.ingredients.length} ingrédients, avec leur prix, leur rayon
              et leur photo
            </span>
          </span>
          <ChevronRight className="shrink-0 text-muted" size={20} />
        </Card>
      </Link>

      <SectionTitle>Ce téléphone</SectionTitle>
      <div className="grid gap-2">
        <Button
          variant="danger"
          size="lg"
          onClick={() => setConfirmLogout(true)}
        >
          <LogOut size={20} /> Déconnecter ce téléphone
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
        title={`Faire les courses le ${newShoppingDay !== null ? DAY_NAMES[newShoppingDay] : ""} ?`}
        text="Les coches et les articles ajoutés à la main pour la semaine en cours seront remis à zéro."
        confirmLabel="Changer le jour"
        onConfirm={() =>
          newShoppingDay !== null
            ? run(() => updateSettings({ token, shoppingDay: newShoppingDay }))
            : Promise.resolve()
        }
      />
      <ConfirmSheet
        open={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        title="Déconnecter ce téléphone ?"
        text="Il faudra saisir à nouveau ton pseudo et ton mot de passe pour retrouver les menus et la liste de courses."
        confirmLabel="Déconnecter"
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
      "Nom de la famille enregistré",
    );
    setName(next?.name ?? account.family.name);
  };

  const share = async () => {
    try {
      const done = await shareLink(
        link,
        `Menu Maison, famille ${account.family.name} : connecte-toi avec ton pseudo et ton mot de passe.`,
      );
      if (done === "copied") toast("Lien copié, colle-le dans un message.");
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };

  return (
    <Card className="grid gap-3 p-4">
      {isAdmin ? (
        <TextInput
          label="Nom de la famille"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={save}
        />
      ) : (
        <p className="text-[17px] font-black">{account.family.name}</p>
      )}
      <div>
        <span className="block text-[15px] font-bold">Lien de connexion</span>
        <span className="block break-all text-[15px] text-muted">
          {link.replace(/^https?:\/\//, "")}
        </span>
        {isAdmin && (
          <span className="mt-1 block text-[15px] text-muted">
            Il suit le nom de la famille : changer le nom change le lien.
          </span>
        )}
      </div>
      <Button variant="secondary" onClick={share}>
        <Share2 size={20} /> Partager le lien
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
