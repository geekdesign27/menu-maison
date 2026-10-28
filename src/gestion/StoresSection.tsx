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
import { useT } from "../i18n/useT";

export function StoresSection() {
  const base = useBase();
  const { token } = useSession();
  const run = useRun();
  const navigate = useNavigate();
  const { t } = useT();
  const updateSettings = useMutation(api.catalog.updateSettings);
  const [adding, setAdding] = useState(false);
  if (!base) return <Loading />;
  const defaultId = base.settings.defaultStoreId;

  const columns: Column<Doc<"stores">>[] = [
    {
      key: "name",
      label: t("admin.stores.colStore"),
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
      label: t("admin.stores.colChain"),
      sort: (s) => s.chain,
      render: (s) => s.chain,
    },
    {
      key: "price",
      label: t("admin.stores.colPriceLevel"),
      sort: (s) => s.priceFactor,
      render: (s) => (
        <Badge tone={s.priceFactor < 1 ? "herb" : "neutral"}>
          {priceLevelText(s.priceFactor)}
        </Badge>
      ),
    },
    {
      key: "overrides",
      label: t("admin.stores.colOverrides"),
      align: "right",
      sort: (s) => s.overrides.length,
      render: (s) => s.overrides.length,
    },
    {
      key: "default",
      label: t("admin.stores.colDefault"),
      align: "center",
      sort: (s) => (s._id === defaultId ? 0 : 1),
      render: (s) => {
        const isDefault = s._id === defaultId;
        return (
          <IconButton
            label={
              isDefault
                ? t("admin.stores.isDefault", { name: s.name })
                : t("admin.stores.makeDefault", { name: s.name })
            }
            aria-pressed={isDefault}
            onClick={(e) => {
              // The row itself opens the store
              e.stopPropagation();
              if (!isDefault)
                void run(
                  () => updateSettings({ token, defaultStoreId: s._id }),
                  t("admin.stores.nowDefault", { name: s.name }),
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
        title={t("admin.stores.title")}
        subtitle={t("admin.stores.subtitle", {
          count: plural(
            base.stores.length,
            t("admin.stores.one"),
            t("admin.stores.many"),
          ),
        })}
        actions={
          <Button onClick={() => setAdding(true)}>
            <Plus size={20} /> {t("admin.stores.new")}
          </Button>
        }
      />
      <div className="max-w-4xl px-6 pb-10">
        <DataTable
          rows={base.stores}
          columns={columns}
          rowKey={(s) => s._id}
          onOpen={(s) => navigate(`/gestion/magasin/${s._id}`)}
          openLabel={(s) => t("admin.editName", { name: s.name })}
        />
      </div>
      {adding && (
        <AddStoreSheet stores={base.stores} onClose={() => setAdding(false)} />
      )}
    </>
  );
}
