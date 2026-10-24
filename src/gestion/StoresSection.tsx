import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "convex/react";
import { Plus, Star } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { useBase, useSession } from "../lib/session";
import { useRun } from "../lib/toast";
import { plural } from "../lib/format";
import { Badge, Button, cx, IconButton, Loading } from "../components/ui";
import { ChainMark, priceLevelText } from "../components/shopping/chains";
import { AddStoreSheet } from "../pages/Stores";
import { DataTable, type Column } from "./DataTable";
import { GestionHeader } from "./GestionLayout";

export function StoresSection() {
  const base = useBase();
  const { token } = useSession();
  const run = useRun();
  const navigate = useNavigate();
  const updateSettings = useMutation(api.catalog.updateSettings);
  const [adding, setAdding] = useState(false);
  if (!base) return <Loading />;
  const defaultId = base.settings.defaultStoreId;

  const columns: Column<Doc<"stores">>[] = [
    {
      key: "name",
      label: "Magasin",
      sort: (s) => s.name,
      render: (s) => (
        <span className="flex items-center gap-3">
          <ChainMark chain={s.chain} size={36} />
          <span className="font-extrabold">{s.name}</span>
        </span>
      ),
    },
    {
      key: "chain",
      label: "Enseigne",
      sort: (s) => s.chain,
      render: (s) => s.chain,
    },
    {
      key: "price",
      label: "Niveau de prix",
      sort: (s) => s.priceFactor,
      render: (s) => (
        <Badge tone={s.priceFactor < 1 ? "herb" : "neutral"}>
          {priceLevelText(s.priceFactor)}
        </Badge>
      ),
    },
    {
      key: "overrides",
      label: "Exceptions",
      align: "right",
      sort: (s) => s.overrides.length,
      render: (s) => s.overrides.length,
    },
    {
      key: "default",
      label: "Par défaut",
      align: "center",
      sort: (s) => (s._id === defaultId ? 0 : 1),
      render: (s) => {
        const isDefault = s._id === defaultId;
        return (
          <IconButton
            label={
              isDefault
                ? `${s.name} est le magasin par défaut`
                : `Choisir ${s.name} comme magasin par défaut`
            }
            aria-pressed={isDefault}
            onClick={(e) => {
              // The row itself opens the store
              e.stopPropagation();
              if (!isDefault)
                void run(
                  () => updateSettings({ token, defaultStoreId: s._id }),
                  `${s.name} est le magasin par défaut.`,
                );
            }}
          >
            <Star
              size={22}
              className={cx(isDefault ? "fill-sun text-sun" : "text-muted")}
            />
          </IconButton>
        );
      },
    },
  ];

  return (
    <>
      <GestionHeader
        title="Magasins"
        subtitle={`${plural(base.stores.length, "magasin", "magasins")}. L'étoile désigne celui proposé sur la liste de courses.`}
        actions={
          <Button onClick={() => setAdding(true)}>
            <Plus size={20} /> Nouveau magasin
          </Button>
        }
      />
      <div className="max-w-4xl px-6 pb-10">
        <DataTable
          rows={base.stores}
          columns={columns}
          rowKey={(s) => s._id}
          onOpen={(s) => navigate(`/gestion/magasin/${s._id}`)}
          openLabel={(s) => `Modifier ${s.name}`}
        />
      </div>
      {adding && (
        <AddStoreSheet stores={base.stores} onClose={() => setAdding(false)} />
      )}
    </>
  );
}
