import { MISC_SECTION } from "../../convex/domain/shopping";
import { useBase } from "../lib/session";
import { plural } from "../lib/format";
import { unitName } from "../lib/units";
import { formatNumber } from "../../convex/domain/quantities";
import { Badge, Loading } from "../components/ui";
import { ChainMark, type Chain } from "../components/shopping/chains";
import {
  ProductsContent,
  productPriceText,
  useProductRows,
  type ProductRowData,
} from "../pages/Products";
import { DataTable, Thumb, type Column } from "./DataTable";
import { GestionHeader } from "./GestionLayout";

export function ProductsSection() {
  const base = useBase();
  const rows = useProductRows();
  if (!base || !rows) return <Loading />;
  const aisleById = new Map(base.aisles.map((a) => [a._id as string, a]));
  const aisleOf = (p: ProductRowData) =>
    p.aisleId ? aisleById.get(p.aisleId) : undefined;

  const columns: Column<ProductRowData>[] = [
    {
      key: "name",
      label: "Produit",
      sort: (p) => p.name,
      render: (p) => (
        <span className="flex items-center gap-3">
          <Thumb
            url={(p.ingredient ?? p.staple)?.imageUrl}
            emoji={aisleOf(p)?.emoji ?? MISC_SECTION.emoji}
          />
          <span className="font-extrabold">{p.name}</span>
        </span>
      ),
    },
    {
      key: "kind",
      className: "whitespace-nowrap",
      label: "Type",
      sort: (p) => p.kind,
      render: (p) =>
        p.kind === "ingredient" ? (
          <Badge>Ingrédient</Badge>
        ) : (
          <Badge tone="sun">Hors recette</Badge>
        ),
    },
    {
      key: "aisle",
      className: "whitespace-nowrap",
      label: "Rayon",
      sort: (p) => aisleOf(p)?.name ?? MISC_SECTION.name,
      render: (p) => aisleOf(p)?.name ?? MISC_SECTION.name,
    },
    {
      key: "price",
      className: "whitespace-nowrap",
      label: "Prix",
      sort: (p) => p.ingredient?.priceChf ?? p.staple?.priceChf,
      render: (p) => (
        <span className={p.priced ? undefined : "text-berry"}>
          {productPriceText(p)}
        </span>
      ),
    },
    {
      key: "pack",
      label: "Paquet",
      align: "right",
      sort: (p) => p.ingredient?.packSize,
      render: (p) =>
        p.ingredient?.packSize !== undefined
          ? `${formatNumber(p.ingredient.packSize)} ${unitName(p.ingredient.unit, p.ingredient.packSize)}`
          : null,
    },
    {
      key: "chains",
      label: "Enseignes",
      sort: (p) => (p.ingredient ?? p.staple)?.onlyChains?.join(", "),
      render: (p) => {
        const chains = ((p.ingredient ?? p.staple)?.onlyChains ??
          []) as Chain[];
        return chains.length ? (
          <span
            className="flex gap-1"
            title={`Seulement chez ${chains.join(", ")}`}
          >
            {chains.map((c) => (
              <ChainMark key={c} chain={c} size={22} />
            ))}
            <span className="sr-only">Seulement chez {chains.join(", ")}</span>
          </span>
        ) : (
          <span className="text-muted">Partout</span>
        );
      },
    },
    {
      key: "recipes",
      label: "Recettes",
      align: "right",
      sort: (p) =>
        p.kind === "ingredient"
          ? p.recipes.filter((r) => !r.archived).length
          : null,
      render: (p) =>
        p.kind === "ingredient"
          ? p.recipes.filter((r) => !r.archived).length
          : null,
    },
    {
      key: "pantry",
      label: "En stock",
      align: "center",
      sort: (p) => (p.ingredient?.pantry ? 0 : 1),
      render: (p) => (p.ingredient?.pantry ? <Badge>Souvent</Badge> : null),
    },
  ];

  return (
    <>
      <GestionHeader
        title="Produits"
        subtitle={plural(rows.length, "produit", "produits")}
      />
      <div className="px-6 pb-10">
        <ProductsContent
          base={base}
          rows={rows}
          renderRows={(shown, open) => (
            <div className="mt-4">
              <DataTable
                rows={shown}
                columns={columns}
                rowKey={(p) => p.key}
                onOpen={open}
                openLabel={(p) => `Modifier ${p.name}`}
              />
            </div>
          )}
        />
      </div>
    </>
  );
}
