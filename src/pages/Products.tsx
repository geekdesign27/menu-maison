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
import { NBSP } from "../../convex/domain/quantities";
import { useBase, useSession, type Base } from "../lib/session";
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
import { ChainMark, CHAINS, type Chain } from "../components/shopping/chains";
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
  const data = useQuery(api.products.list, token ? { token } : "skip");
  return useMemo(
    () =>
      data ? buildProducts(data.ingredients, data.staples, data.recipes) : null,
    [data],
  );
}

/** « CHF 3.50 pour 1000 g », « CHF 6.00 l'article » or « Pas de prix ». */
export function productPriceText(p: Row): string {
  if (
    p.ingredient?.priceChf !== undefined &&
    p.ingredient.priceQty !== undefined
  )
    return `${formatChf(p.ingredient.priceChf)} pour ${amountLabel(p.ingredient.priceQty, p.ingredient.unit)}`;
  if (p.staple?.priceChf !== undefined)
    return `${formatChf(p.staple.priceChf)} l'article`;
  return "Pas de prix";
}

/** « Lidl CHF 1.19 pour 1000 g (24.10) », prices read on receipts; "" when none. */
export function receiptPricesText(p: Row): string {
  const source = p.ingredient ?? p.staple!;
  return source.receiptPrices
    .map((r) => {
      const [, month, day] = r.observedOn.split("-");
      const amount = p.ingredient ? ` pour ${amountLabel(r.priceQty, p.ingredient.unit)}` : "";
      return `${r.chain} ${formatChf(r.priceChf)}${amount} (${day}.${month})`;
    })
    .join(", ");
}

export function ProductsPage() {
  const base = useBase();
  const rows = useProductRows();
  return (
    <Page
      title="Produits"
      subtitle={rows ? plural(rows.length, "produit", "produits") : undefined}
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
    if (blocker) toast(blocker, "error");
    else setDeleting(row);
  };

  const addButtons = (
    <div className={wide ? "flex justify-end gap-2" : "mt-4 grid gap-2 sm:grid-cols-2"}>
      <Button
        variant={wide ? "primary" : "secondary"}
        onClick={() => setEditing({ kind: "ingredient" })}
      >
        <Plus size={20} /> Ingrédient de recette
      </Button>
      <Button
        variant={wide ? "primary" : "secondary"}
        onClick={() => setEditing({ kind: "newStaple" })}
      >
        <Plus size={20} /> Article hors recette
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
          placeholder="Chercher un produit"
        />
        <Segmented
          label="Type de produit"
          value={kind}
          onChange={setKind}
          options={[
            { value: "all", label: "Tous" },
            { value: "ingredient", label: "Ingrédients" },
            { value: "staple", label: "Articles" },
          ]}
        />
        <div className="grid grid-cols-2 gap-2">
          <Select
            aria-label="Rayon"
            value={aisle}
            onChange={(e) => setAisle(e.target.value as AisleFilter)}
          >
            <option value="">Rayons</option>
            {base.aisles.map((a) => (
              <option key={a._id} value={a._id}>
                {a.emoji} {a.name}
              </option>
            ))}
            <option value="none">
              {MISC_SECTION.emoji} {MISC_SECTION.name}
            </option>
          </Select>
          <Select
            aria-label="Enseigne"
            value={chain}
            onChange={(e) => setChain(e.target.value as Chain | "")}
          >
            <option value="">Enseignes</option>
            {CHAINS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex gap-2">
          <Chip
            selected={missing === "price"}
            onClick={() => toggleMissing("price")}
          >
            Sans prix ({missingCount("price")})
          </Chip>
          <Chip
            selected={missing === "photo"}
            onClick={() => toggleMissing("photo")}
          >
            Sans photo ({missingCount("photo")})
          </Chip>
        </div>
      </div>

      {shown.length === 0 ? (
        <EmptyState
          emoji="🔎"
          title="Aucun produit ne correspond"
          text={
            filtered
              ? "Change la recherche ou les filtres."
              : "Ajoute un premier produit."
          }
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
        title={`Supprimer « ${deleting?.name ?? ""} » ?`}
        text={
          deleting?.kind === "staple"
            ? "L'article disparaît des articles habituels. La liste de courses de cette semaine le garde."
            : "L'ingrédient disparaît du catalogue. Aucune recette ne l'utilise."
        }
        confirmLabel="Supprimer"
        danger
        onConfirm={async () => {
          if (!deleting) return;
          const done = await run(async () => {
            if (deleting.ingredient)
              await removeIngredient({ token, id: deleting.ingredient._id });
            else await removeStaple({ token, id: deleting.staple!._id });
            return true;
          }, "Produit supprimé.");
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
  const used = p.recipes.filter((r) => !r.archived).length;
  const price = productPriceText(p);
  const receipts = receiptPricesText(p);

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
            Ticket{NBSP}: {receipts}
          </span>
        )}
        <span className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="text-[13px] font-bold text-muted">
            {aisle?.name ?? MISC_SECTION.name}
          </span>
          {p.kind === "ingredient" ? (
            <Badge tone={used ? "herb" : "neutral"}>
              {used
                ? plural(used, "recette", "recettes")
                : "Dans aucune recette"}
            </Badge>
          ) : (
            <Badge tone="sun">Hors recette</Badge>
          )}
          {p.ingredient?.pantry && <Badge>Souvent en stock</Badge>}
          {chains.length > 0 && (
            <span className="inline-flex items-center gap-1 text-[13px] font-bold text-muted">
              Seulement chez
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
      title="Nouvel article hors recette"
      footer={
        <Button size="lg" onClick={save} disabled={busy || !name.trim()}>
          Continuer
        </Button>
      }
    >
      <TextInput
        label="Nom"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ex. Papier toilette"
        autoFocus
      />
      <p className="mt-2 text-[15px] text-muted">
        Ensuite, tu choisis le rayon, le prix et la photo.
      </p>
    </Sheet>
  );
}
