import { useState } from "react";
import { Plus } from "lucide-react";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { useBase } from "../lib/session";
import { plural } from "../lib/format";
import { Button, Loading } from "../components/ui";
import { AisleSheet } from "../components/shopping/AisleSheet";
import { useProductRows } from "../pages/Products";
import { DataTable, Thumb, type Column } from "./DataTable";
import { GestionHeader } from "./GestionLayout";

type AisleRow = Doc<"aisles"> & { ingredients: number; staples: number };

export function AislesSection() {
  const base = useBase();
  const products = useProductRows();
  // undefined: closed, null: new aisle
  const [editing, setEditing] = useState<Id<"aisles"> | null | undefined>(
    undefined,
  );
  if (!base || !products) return <Loading />;

  const rows: AisleRow[] = base.aisles.map((a) => ({
    ...a,
    ingredients: products.filter(
      (p) => p.kind === "ingredient" && p.aisleId === a._id,
    ).length,
    staples: products.filter((p) => p.kind === "staple" && p.aisleId === a._id)
      .length,
  }));

  const columns: Column<AisleRow>[] = [
    {
      key: "order",
      label: "Ordre",
      align: "right",
      sort: (a) => a.order,
      render: (a) => a.order + 1,
    },
    {
      key: "name",
      label: "Rayon",
      sort: (a) => a.name,
      render: (a) => (
        <span className="flex items-center gap-3">
          <Thumb emoji={a.emoji} />
          <span className="font-extrabold">{a.name}</span>
        </span>
      ),
    },
    {
      key: "ingredients",
      label: "Ingrédients",
      align: "right",
      sort: (a) => a.ingredients,
      render: (a) => a.ingredients,
    },
    {
      key: "staples",
      label: "Hors recette",
      align: "right",
      sort: (a) => a.staples,
      render: (a) => a.staples,
    },
  ];

  return (
    <>
      <GestionHeader
        title="Rayons"
        subtitle={`${plural(rows.length, "rayon", "rayons")}. Chaque magasin les range dans son propre ordre.`}
        actions={
          <Button onClick={() => setEditing(null)}>
            <Plus size={20} /> Nouveau rayon
          </Button>
        }
      />
      <div className="max-w-3xl px-6 pb-10">
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(a) => a._id}
          onOpen={(a) => setEditing(a._id)}
          openLabel={(a) => `Modifier le rayon ${a.name}`}
        />
      </div>
      {editing !== undefined && (
        <AisleSheet
          aisle={
            editing ? base.aisles.find((a) => a._id === editing) : undefined
          }
          onClose={() => setEditing(undefined)}
        />
      )}
    </>
  );
}
