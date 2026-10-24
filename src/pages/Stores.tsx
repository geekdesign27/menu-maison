import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "convex/react";
import { ChevronRight, Plus, Star } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useBase, useSession } from "../lib/session";
import { useRun } from "../lib/toast";
import { plural } from "../lib/format";
import { BackButton } from "../components/Layout";
import { useAppPaths } from "../lib/paths";
import {
  Badge,
  Button,
  Card,
  Chip,
  cx,
  EmptyState,
  IconButton,
  Loading,
  Page,
  Sheet,
  TextInput,
} from "../components/ui";
import {
  CHAINS,
  ChainMark,
  priceLevelText,
  type Chain,
} from "../components/shopping/chains";

export function StoresPage() {
  const base = useBase();
  const { token } = useSession();
  const run = useRun();
  const updateSettings = useMutation(api.catalog.updateSettings);
  const [adding, setAdding] = useState(false);

  return (
    <Page
      title="Magasins"
      subtitle="L'ordre des rayons de chaque magasin"
      back={<BackButton fallback="/plus" />}
    >
      {!base ? (
        <Loading />
      ) : (
        <>
          {base.stores.length === 0 ? (
            <EmptyState
              emoji="🏪"
              title="Aucun magasin"
              text="Ajoute ton magasin habituel : la liste de courses suivra son parcours, rayon après rayon."
            />
          ) : (
            <ul className="grid gap-3">
              {base.stores.map((s) => {
                const isDefault = s._id === base.settings.defaultStoreId;
                return (
                  <li key={s._id}>
                    <Card className="flex items-center gap-1 pr-2">
                      <Link
                        to={`/magasin/${s._id}`}
                        className="flex min-h-20 min-w-0 flex-1 items-center gap-3 py-3 pl-4"
                      >
                        <ChainMark chain={s.chain} size={44} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-lg font-black">
                            {s.name}
                          </div>
                          <div className="mt-0.5 flex flex-wrap gap-1.5">
                            <Badge
                              tone={s.priceFactor < 1 ? "herb" : "neutral"}
                            >
                              {priceLevelText(s.priceFactor)}
                            </Badge>
                            {s.overrides.length > 0 && (
                              <Badge tone="carrot">
                                {plural(
                                  s.overrides.length,
                                  "exception",
                                  "exceptions",
                                )}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="shrink-0 text-muted" />
                      </Link>
                      <IconButton
                        label={
                          isDefault
                            ? `${s.name} est le magasin par défaut`
                            : `Choisir ${s.name} comme magasin par défaut`
                        }
                        aria-pressed={isDefault}
                        onClick={() =>
                          !isDefault &&
                          run(
                            () =>
                              updateSettings({ token, defaultStoreId: s._id }),
                            `${s.name} est le magasin par défaut.`,
                          )
                        }
                      >
                        <Star
                          size={24}
                          className={cx(
                            isDefault ? "fill-sun text-sun" : "text-muted",
                          )}
                        />
                      </IconButton>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-3 px-1 text-[15px] text-muted">
            L'étoile désigne le magasin proposé par défaut sur la liste de
            courses.
          </p>
          <Button size="lg" className="mt-6" onClick={() => setAdding(true)}>
            <Plus size={22} /> Ajouter un magasin
          </Button>
        </>
      )}
      {adding && base && (
        <AddStoreSheet stores={base.stores} onClose={() => setAdding(false)} />
      )}
    </Page>
  );
}

export function AddStoreSheet({
  stores,
  onClose,
}: {
  stores: { _id: Id<"stores">; name: string; chain: Chain }[];
  onClose: () => void;
}) {
  const { token } = useSession();
  const run = useRun();
  const navigate = useNavigate();
  const paths = useAppPaths();
  const createStore = useMutation(api.catalog.createStore);
  const [chain, setChain] = useState<Chain>("Aldi");
  const [name, setName] = useState("");
  const [copyFrom, setCopyFrom] = useState<Id<"stores"> | undefined>();
  const [busy, setBusy] = useState(false);

  const pickChain = (c: Chain) => {
    setChain(c);
    // Prefill the chain name while the field is empty or only holds a chain name
    if (!name.trim() || CHAINS.some((x) => name.trim() === x)) {
      setName(c === "Autre" ? "" : `${c} `);
    }
  };

  const create = async () => {
    setBusy(true);
    const id = await run(
      () => createStore({ token, chain, name, copyFrom }),
      "Magasin ajouté.",
    );
    setBusy(false);
    if (id) navigate(paths.store(id));
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title="Nouveau magasin"
      footer={
        <Button size="lg" onClick={create} disabled={busy || !name.trim()}>
          Créer le magasin
        </Button>
      }
    >
      <div className="grid gap-5">
        <div>
          <span className="mb-1 block text-[15px] font-bold">Enseigne</span>
          <div className="flex flex-wrap gap-2">
            {CHAINS.map((c) => (
              <Chip
                key={c}
                selected={chain === c}
                onClick={() => pickChain(c)}
                className="pl-1.5"
              >
                <ChainMark chain={c} size={28} />
                {c}
              </Chip>
            ))}
          </div>
        </div>
        <TextInput
          label="Nom"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex. Aldi Marly"
        />
        {stores.length > 0 && (
          <div>
            <span className="mb-1 block text-[15px] font-bold">
              Copier l'ordre de…
            </span>
            <p className="mb-2 text-[15px] text-muted">
              Pratique pour une autre succursale de la même enseigne.
            </p>
            <div className="flex flex-wrap gap-2">
              <Chip
                selected={copyFrom === undefined}
                onClick={() => setCopyFrom(undefined)}
              >
                Ordre standard
              </Chip>
              {stores.map((s) => (
                <Chip
                  key={s._id}
                  selected={copyFrom === s._id}
                  onClick={() => setCopyFrom(s._id)}
                  className="pl-1.5"
                >
                  <ChainMark chain={s.chain} size={28} />
                  {s.name}
                </Chip>
              ))}
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}
