import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { ChevronRight, Plus } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import type { Id } from "../../convex/_generated/dataModel";
import {
  buildProducts,
  deletionBlocker,
  filterProducts,
  type Product,
  type ProductKind,
} from "../../convex/domain/products";
import { MISC_SECTION } from "../../convex/domain/shopping";
import type { Lang } from "../../convex/domain/lang";
import { useBase, useSession, type Base } from "../lib/session";
import { translate } from "../i18n";
import { useT } from "../i18n/useT";
import { serverText } from "../i18n/serverText";
import { localize } from "../lib/catalogNames";
import { useRun, useToast } from "../lib/toast";
import { formatChf, plural } from "../lib/format";
import { amountLabel } from "../lib/units";
import { useInGestion } from "../lib/paths";
import { BackButton } from "../components/Layout";
import {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  Loading,
  Page,
  SearchInput,
  Segmented,
  Select,
  TextInput,
  Sheet,
} from "../components/ui";
import { ChainMark, CHAINS, chainLabel, type Chain } from "../components/shopping/chains";
import { ConfirmSheet } from "../components/shopping/ConfirmSheet";
import { IngredientSheet } from "../components/shopping/IngredientSheet";
import { StapleSheet } from "../components/shopping/StapleSheet";

type Data = FunctionReturnType<typeof api.products.list>;
export type ProductRowData = Product<
  Data["ingredients"][number],
  Data["staples"][number]
>;
type Row = ProductRowData;

// "" = every aisle, "none" = items without aisle (« Divers »)
type AisleFilter = Id<"aisles"> | "" | "none";
type Missing = "price" | "photo";

type Editing =
  | { kind: "ingredient"; id?: Id<"ingredients"> }
  | { kind: "staple"; id: Id<"staples"> }
  | { kind: "newStaple" }
  | null;

/** Every ingredient and usual item, live, as « Produits » rows (null while loading). */
export function useProductRows(): Row[] | null {
  const { token } = useSession();
  const { lang } = useT();
  const data = useQuery(api.products.list, token ? { token } : "skip");
  return useMemo(
    () =>
      data
        ? buildProducts(localize(data.ingredients, lang), localize(data.staples, lang), data.recipes, lang)
        : null,
    [data, lang],
  );
}

/** « CHF 3.50 pour 1000 g », « CHF 6.00 l'article » or « Pas de prix ». */
export function productPriceText(p: Row, lang: Lang = "fr"): string {
  if (
    p.ingredient?.priceChf !== undefined &&
    p.ingredient.priceQty !== undefined
  )
    return translate(lang, "recipes.priceFor", {
      price: formatChf(p.ingredient.priceChf),
      amount: amountLabel(p.ingredient.priceQty, p.ingredient.unit, lang),
    });
  if (p.staple?.priceChf !== undefined)
    return translate(lang, "recipes.pricePerItem", {
      price: formatChf(p.staple.priceChf),
    });
  return translate(lang, "recipes.noPrice");
}

/** « Lidl CHF 1.19 pour 1000 g (24.10) », prices read on receipts; "" when none. */
export function receiptPricesText(p: Row, lang: Lang = "fr"): string {
  const source = p.ingredient ?? p.staple!;
  return source.receiptPrices
    .map((r) => {
      const [, month, day] = r.observedOn.split("-");
      const price = p.ingredient
        ? translate(lang, "recipes.priceFor", {
            price: formatChf(r.priceChf),
            amount: amountLabel(r.priceQty, p.ingredient.unit, lang),
          })
        : formatChf(r.priceChf);
      return `${r.chain} ${price} (${day}.${month})`;
    })
    .join(", ");
}

export function ProductsPage() {
  const base = useBase();
  const rows = useProductRows();
  const { t } = useT();
  return (
    <Page
      title={t("recipes.products")}
      subtitle={
        rows
          ? plural(
              rows.length,
              t("recipes.productOne"),
              t("recipes.productMany"),
            )
          : undefined
      }
      back={<BackButton fallback="/plus" />}
    >
      {base && rows ? <ProductsContent base={base} rows={rows} /> : <Loading />}
    </Page>
  );
}

/**
 * Filters, list and editing sheets of the products. `renderRows` swaps the phone
 * list for another view (the table of /gestion); `open` starts editing a row.
 */
export function ProductsContent({
  base,
  rows,
  renderRows,
}: {
  base: Base;
  rows: Row[];
  renderRows?: (shown: Row[], open: (p: Row) => void) => ReactNode;
}) {
  const { token } = useSession();
  const run = useRun();
  const toast = useToast();
  const { t, lang } = useT();
  const removeIngredient = useMutation(api.catalog.removeIngredient);
  const removeStaple = useMutation(api.staples.remove);
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<ProductKind | "all">("all");
  const [aisle, setAisle] = useState<AisleFilter>("");
  const [chain, setChain] = useState<Chain | "">("");
  const [missing, setMissing] = useState<Missing | null>(null);
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);

  const aisleById = new Map(base.aisles.map((a) => [a._id as string, a]));
  const filter = {
    search,
    kind: kind === "all" ? undefined : kind,
    aisleId: aisle === "" ? undefined : aisle === "none" ? null : aisle,
    chain: chain || undefined,
  };
  const missingCount = (what: Missing) =>
    filterProducts(rows, { ...filter, missing: what }).length;
  const shown = filterProducts(rows, {
    ...filter,
    missing: missing ?? undefined,
  });
  const filtered = !!(search || kind !== "all" || aisle || chain || missing);
  const toggleMissing = (what: Missing) =>
    setMissing(missing === what ? null : what);
  const close = () => setEditing(null);
  const wide = useInGestion();

  const editedIngredient =
    editing?.kind === "ingredient" && editing.id
      ? rows.find((p) => p.ingredient?._id === editing.id)
      : undefined;
  const editedStaple =
    editing?.kind === "staple"
      ? rows.find((p) => p.staple?._id === editing.id)
      : undefined;

  const open = (p: Row) =>
    setEditing(
      p.ingredient
        ? { kind: "ingredient", id: p.ingredient._id }
        : { kind: "staple", id: p.staple!._id },
    );

  const askDelete = (row: Row) => {
    const blocker =
      row.kind === "ingredient" ? deletionBlocker(row.recipes) : null;
    if (blocker) toast(serverText(lang, blocker), "error");
    else setDeleting(row);
  };

  const addButtons = (
    <div
      className={
        wide ? "flex justify-end gap-2" : "mt-4 grid gap-2 sm:grid-cols-2"
      }
    >
      <Button
        variant={wide ? "primary" : "secondary"}
        onClick={() => setEditing({ kind: "ingredient" })}
      >
        <Plus size={20} /> {t("recipes.addRecipeIngredient")}
      </Button>
      <Button
        variant={wide ? "primary" : "secondary"}
        onClick={() => setEditing({ kind: "newStaple" })}
      >
        <Plus size={20} /> {t("recipes.addStaple")}
      </Button>
    </div>
  );

  return (
    <>
      {/* On the desktop management area, filters fit on two lines and adding comes first */}
      {wide && <div className="mb-4">{addButtons}</div>}
      <div className={wide ? "grid gap-3 lg:grid-cols-2" : "grid gap-3"}>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={t("recipes.searchProduct")}
        />
        <Segmented
          label={t("recipes.productKind")}
          value={kind}
          onChange={setKind}
          options={[
            { value: "all", label: t("recipes.kindAll") },
            { value: "ingredient", label: t("recipes.ingredients") },
            { value: "staple", label: t("recipes.kindStaples") },
          ]}
        />
        <div className="grid grid-cols-2 gap-2">
          <Select
            aria-label={t("recipes.aisle")}
            value={aisle}
            onChange={(e) => setAisle(e.target.value as AisleFilter)}
          >
            <option value="">{t("recipes.aisles")}</option>
            {base.aisles.map((a) => (
              <option key={a._id} value={a._id}>
                {a.emoji} {a.name}
              </option>
            ))}
            <option value="none">
              {MISC_SECTION.emoji} {t("recipes.miscAisle")}
            </option>
          </Select>
          <Select
            aria-label={t("recipes.chain")}
            value={chain}
            onChange={(e) => setChain(e.target.value as Chain | "")}
          >
            <option value="">{t("recipes.chains")}</option>
            {CHAINS.map((c) => (
              <option key={c} value={c}>
                {chainLabel(c, lang)}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex gap-2">
          <Chip
            selected={missing === "price"}
            onClick={() => toggleMissing("price")}
          >
            {t("recipes.noPriceCount", { count: missingCount("price") })}
          </Chip>
          <Chip
            selected={missing === "photo"}
            onClick={() => toggleMissing("photo")}
          >
            {t("recipes.noPhotoCount", { count: missingCount("photo") })}
          </Chip>
        </div>
      </div>

      {shown.length === 0 ? (
        <EmptyState
          emoji="🔎"
          title={t("recipes.noProductMatch")}
          text={t(
            filtered ? "recipes.changeFilters" : "recipes.addFirstProduct",
          )}
        />
      ) : renderRows ? (
        renderRows(shown, open)
      ) : (
        <Card className="mt-4 overflow-hidden">
          <ul className="divide-y divide-line">
            {shown.map((p) => (
              <li key={p.key}>
                <ProductRow
                  product={p}
                  aisle={p.aisleId ? aisleById.get(p.aisleId) : undefined}
                  onClick={() => open(p)}
                />
              </li>
            ))}
          </ul>
        </Card>
      )}

      {!wide && addButtons}

      {editing?.kind === "ingredient" && (
        <IngredientSheet
          ingredient={editedIngredient?.ingredient}
          aisles={base.aisles}
          onDelete={
            editedIngredient ? () => askDelete(editedIngredient) : undefined
          }
          onClose={close}
        />
      )}
      {editedStaple?.staple && (
        <StapleSheet
          key={editedStaple.staple._id}
          staple={editedStaple.staple}
          onDelete={() => askDelete(editedStaple)}
          onClose={close}
        />
      )}
      {editing?.kind === "newStaple" && (
        <NewStapleSheet
          onCreated={(id) => setEditing({ kind: "staple", id })}
          onClose={close}
        />
      )}
      <ConfirmSheet
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={t("recipes.deleteTitle", { name: deleting?.name ?? "" })}
        text={t(
          deleting?.kind === "staple"
            ? "recipes.deleteStapleText"
            : "recipes.deleteIngredientText",
        )}
        confirmLabel={t("recipes.delete")}
        danger
        onConfirm={async () => {
          if (!deleting) return;
          const done = await run(async () => {
            if (deleting.ingredient)
              await removeIngredient({ token, id: deleting.ingredient._id });
            else await removeStaple({ token, id: deleting.staple!._id });
            return true;
          }, t("recipes.productDeleted"));
          if (done) close();
        }}
      />
    </>
  );
}

function ProductRow({
  product: p,
  aisle,
  onClick,
}: {
  product: Row;
  aisle?: Base["aisles"][number];
  onClick: () => void;
}) {
  const source = p.ingredient ?? p.staple!;
  const chains = (source.onlyChains ?? []) as Chain[];
  const { t, lang } = useT();
  const used = p.recipes.filter((r) => !r.archived).length;
  const price = productPriceText(p, lang);
  const receipts = receiptPricesText(p, lang);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-16 w-full items-center gap-3 px-4 py-2.5 text-left active:bg-cream"
    >
      {source.imageUrl ? (
        <img
          src={source.imageUrl}
          alt=""
          loading="lazy"
          className="size-12 shrink-0 rounded-xl bg-cream object-cover"
        />
      ) : (
        <span
          className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-carrot-soft text-2xl"
          aria-hidden
        >
          {aisle?.emoji ?? MISC_SECTION.emoji}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[17px] font-extrabold">
          {p.name}
        </span>
        <span
          className={
            p.priced
              ? "block truncate text-[15px] text-muted"
              : "block truncate text-[15px] text-berry"
          }
        >
          {price}
        </span>
        {receipts && (
          <span className="block text-[13px] font-semibold text-herb">
            {t("recipes.receipt", { prices: receipts })}
          </span>
        )}
        <span className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="text-[13px] font-bold text-muted">
            {aisle?.name ?? t("recipes.miscAisle")}
          </span>
          {p.kind === "ingredient" ? (
            <Badge tone={used ? "herb" : "neutral"}>
              {used
                ? plural(used, t("recipes.recipeOne"), t("recipes.recipeMany"))
                : t("recipes.inNoRecipe")}
            </Badge>
          ) : (
            <Badge tone="sun">{t("recipes.notInRecipe")}</Badge>
          )}
          {p.ingredient?.pantry && <Badge>{t("recipes.oftenInStock")}</Badge>}
          {chains.length > 0 && (
            <span className="inline-flex items-center gap-1 text-[13px] font-bold text-muted">
              {t("recipes.onlyAt")}
              {chains.map((c) => (
                <ChainMark key={c} chain={c} size={20} />
              ))}
              <span className="sr-only">{chains.join(", ")}</span>
            </span>
          )}
        </span>
      </span>
      <ChevronRight className="shrink-0 text-muted" size={20} />
    </button>
  );
}

function NewStapleSheet({
  onCreated,
  onClose,
}: {
  onCreated: (id: Id<"staples">) => void;
  onClose: () => void;
}) {
  const { token } = useSession();
  const run = useRun();
  const create = useMutation(api.staples.create);
  const { t } = useT();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    const id = await run(() => create({ token, name }));
    setBusy(false);
    if (id) onCreated(id);
  };
  return (
    <Sheet
      open
      onClose={onClose}
      title={t("recipes.newStapleTitle")}
      footer={
        <Button size="lg" onClick={save} disabled={busy || !name.trim()}>
          {t("recipes.continue")}
        </Button>
      }
    >
      <TextInput
        label={t("recipes.name")}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("recipes.newStaplePlaceholder")}
        autoFocus
      />
      <p className="mt-2 text-[15px] text-muted">
        {t("recipes.newStapleHint")}
      </p>
    </Sheet>
  );
}
