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
  receiptPricesText,
  useProductRows,
  type ProductRowData,
} from "../pages/Products";
import { DataTable, Thumb, type Column } from "./DataTable";
import { GestionHeader } from "./GestionLayout";
import { useT } from "../i18n/useT";

export function ProductsSection() {
  const base = useBase();
  const rows = useProductRows();
  const { t, lang } = useT();
  if (!base || !rows) return <Loading />;
  const aisleById = new Map(base.aisles.map((a) => [a._id as string, a]));
  const aisleOf = (p: ProductRowData) =>
    p.aisleId ? aisleById.get(p.aisleId) : undefined;

  const columns: Column<ProductRowData>[] = [
    {
      key: "name",
      label: t("admin.products.colProduct"),
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
      label: t("admin.products.colType"),
      sort: (p) => p.kind,
      render: (p) =>
        p.kind === "ingredient" ? (
          <Badge>{t("admin.products.ingredient")}</Badge>
        ) : (
          <Badge tone="sun">{t("admin.products.staple")}</Badge>
        ),
    },
    {
      key: "aisle",
      className: "whitespace-nowrap",
      label: t("admin.products.colAisle"),
      sort: (p) => aisleOf(p)?.name ?? MISC_SECTION.name,
      render: (p) => aisleOf(p)?.name ?? MISC_SECTION.name,
    },
    {
      key: "price",
      className: "whitespace-nowrap",
      label: t("admin.products.colPrice"),
      sort: (p) => p.ingredient?.priceChf ?? p.staple?.priceChf,
      render: (p) => (
        <span>
          <span className={p.priced ? undefined : "text-berry"}>
            {productPriceText(p)}
          </span>
          {receiptPricesText(p) && (
            <span className="block text-[13px] font-semibold text-herb">
              {receiptPricesText(p)}
            </span>
          )}
        </span>
      ),
    },
    {
      key: "pack",
      label: t("admin.products.colPack"),
      align: "right",
      sort: (p) => p.ingredient?.packSize,
      render: (p) =>
        p.ingredient?.packSize !== undefined
          ? `${formatNumber(p.ingredient.packSize, 2, lang)} ${unitName(p.ingredient.unit, p.ingredient.packSize, lang)}`
          : null,
    },
    {
      key: "chains",
      label: t("admin.products.colChains"),
      sort: (p) => (p.ingredient ?? p.staple)?.onlyChains?.join(", "),
      render: (p) => {
        const chains = ((p.ingredient ?? p.staple)?.onlyChains ??
          []) as Chain[];
        return chains.length ? (
          <span
            className="flex gap-1"
            title={t("admin.products.onlyAt", { chains: chains.join(", ") })}
          >
            {chains.map((c) => (
              <ChainMark key={c} chain={c} size={22} />
            ))}
            <span className="sr-only">
              {t("admin.products.onlyAt", { chains: chains.join(", ") })}
            </span>
          </span>
        ) : (
          <span className="text-muted">{t("admin.products.everywhere")}</span>
        );
      },
    },
    {
      key: "recipes",
      label: t("admin.products.colRecipes"),
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
      label: t("admin.products.colPantry"),
      align: "center",
      sort: (p) => (p.ingredient?.pantry ? 0 : 1),
      render: (p) =>
        p.ingredient?.pantry ? (
          <Badge>{t("admin.products.often")}</Badge>
        ) : null,
    },
  ];

  return (
    <>
      <GestionHeader
        title={t("admin.products.title")}
        subtitle={plural(
          rows.length,
          t("admin.products.one"),
          t("admin.products.many"),
        )}
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
                openLabel={(p) => t("admin.editName", { name: p.name })}
              />
            </div>
          )}
        />
      </div>
    </>
  );
}
