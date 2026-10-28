import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation } from "convex/react";
import {
  Archive,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Minus,
  Plus,
  Trash2,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { orderAisles } from "../../convex/domain/shopping";
import { useBase, useSession, type Base } from "../lib/session";
import { useRun } from "../lib/toast";
import { BackButton } from "../components/Layout";
import { useAppPaths } from "../lib/paths";
import {
  Button,
  Card,
  Chip,
  cx,
  EmptyState,
  IconButton,
  Loading,
  Page,
  SearchInput,
  SectionTitle,
  Sheet,
  TextInput,
} from "../components/ui";
import {
  CHAINS,
  ChainMark,
  chainLabel,
  priceLevelText,
} from "../components/shopping/chains";
import { AislePicker } from "../components/shopping/AislePicker";
import { ConfirmSheet } from "../components/shopping/ConfirmSheet";
import { useUpdateStore } from "../components/shopping/useUpdateStore";
import { searchKey } from "../lib/text";
import { useT } from "../i18n/useT";

const MIN_FACTOR = 0.8;
const MAX_FACTOR = 1.2;

export function StoreEditorPage() {
  const { id } = useParams();
  const base = useBase();
  const store = base?.stores.find((s) => s._id === id);
  const paths = useAppPaths();
  const { t, lang } = useT();
  return (
    <Page
      title={store?.name ?? t("shopping.store.fallback")}
      subtitle={
        store
          ? t("shopping.store.chainOf", { chain: chainLabel(store.chain, lang) })
          : undefined
      }
      back={<BackButton fallback={paths.stores} />}
    >
      {!base ? (
        <Loading />
      ) : !store ? (
        <EmptyState
          emoji="🏚️"
          title={t("shopping.store.notFoundTitle")}
          text={t("shopping.store.notFoundText")}
        />
      ) : (
        <StoreForm key={store._id} store={store} base={base} />
      )}
    </Page>
  );
}

function StoreForm({ store, base }: { store: Doc<"stores">; base: Base }) {
  const { token } = useSession();
  const run = useRun();
  const navigate = useNavigate();
  const paths = useAppPaths();
  const update = useUpdateStore();
  const setOverride = useMutation(api.catalog.setOverride);
  const [name, setName] = useState(store.name);
  const [moved, setMoved] = useState<Id<"aisles"> | null>(null);
  const [addingException, setAddingException] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const { t, lang } = useT();

  const walk = useMemo(
    () => orderAisles(base.aisles, store) as Doc<"aisles">[],
    [base.aisles, store],
  );
  const aisleById = useMemo(
    () => new Map(base.aisles.map((a) => [a._id, a])),
    [base.aisles],
  );
  const ingredientById = useMemo(
    () => new Map(base.ingredients.map((i) => [i._id, i])),
    [base.ingredients],
  );
  const exceptions = store.overrides
    .map((o) => ({
      ingredient: ingredientById.get(o.ingredientId),
      aisle: aisleById.get(o.aisleId),
    }))
    .filter(
      (e): e is { ingredient: NonNullable<typeof e.ingredient>; aisle: NonNullable<typeof e.aisle> } =>
        !!e.ingredient && !!e.aisle,
    )
    .sort((a, b) => a.ingredient.name.localeCompare(b.ingredient.name, "fr"));

  const saveName = () => {
    if (name.trim() === store.name) return;
    if (!name.trim()) {
      setName(store.name);
      return;
    }
    run(() => update({ token, id: store._id, name: name.trim() }));
  };

  const move = (index: number, delta: -1 | 1) => {
    const ids = walk.map((a) => a._id);
    const target = index + delta;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    setMoved(ids[target]);
    run(() => update({ token, id: store._id, aisleOrder: ids }));
  };

  const changeFactor = (delta: number) => {
    const next = Math.round((store.priceFactor + delta) * 100) / 100;
    if (next < MIN_FACTOR || next > MAX_FACTOR) return;
    run(() => update({ token, id: store._id, priceFactor: next }));
  };

  return (
    <>
      <Card className="grid gap-4 p-4">
        <TextInput
          label={t("shopping.store.name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          enterKeyHint="done"
        />
        <div>
          <span className="mb-1 block text-[15px] font-bold">{t("shopping.chain")}</span>
          <div className="flex flex-wrap gap-2">
            {CHAINS.map((c) => (
              <Chip
                key={c}
                selected={store.chain === c}
                onClick={() =>
                  c !== store.chain &&
                  run(() => update({ token, id: store._id, chain: c }))
                }
                className="pl-1.5"
              >
                <ChainMark chain={c} size={28} />
                {chainLabel(c, lang)}
              </Chip>
            ))}
          </div>
        </div>
      </Card>

      <SectionTitle>{t("shopping.store.walk")}</SectionTitle>
      <p className="mb-3 px-1 text-[15px] text-muted">
        {t("shopping.store.walkHelp")}
      </p>
      <Card className="overflow-hidden">
        <ol className="divide-y divide-line">
          {walk.map((aisle, i) => (
            <li
              key={aisle._id}
              className={cx(
                "flex min-h-14 items-center gap-3 py-1.5 pr-2 pl-3 transition-colors duration-700",
                moved === aisle._id && "bg-sun-soft",
              )}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-carrot-soft text-[15px] font-black text-carrot-dark tabular-nums">
                {i + 1}
              </span>
              <span className="text-2xl" aria-hidden>
                {aisle.emoji}
              </span>
              <span className="min-w-0 flex-1 text-[17px] font-extrabold break-words">
                {aisle.name}
              </span>
              <IconButton
                label={t("shopping.store.moveUp", { aisle: aisle.name })}
                disabled={i === 0}
                onClick={() => move(i, -1)}
                className="bg-cream"
              >
                <ChevronUp size={24} />
              </IconButton>
              <IconButton
                label={t("shopping.store.moveDown", { aisle: aisle.name })}
                disabled={i === walk.length - 1}
                onClick={() => move(i, 1)}
                className="bg-cream"
              >
                <ChevronDown size={24} />
              </IconButton>
            </li>
          ))}
        </ol>
      </Card>

      <SectionTitle>{t("shopping.store.exceptions")}</SectionTitle>
      <p className="mb-3 px-1 text-[15px] text-muted">
        {t("shopping.store.exceptionsHelp")}
      </p>
      {exceptions.length > 0 && (
        <Card className="mb-3 overflow-hidden">
          <ul className="divide-y divide-line">
            {exceptions.map(({ ingredient, aisle }) => {
              const usual = aisleById.get(ingredient.aisleId);
              return (
                <li
                  key={ingredient._id}
                  className="flex min-h-14 items-center gap-2 py-2 pr-1 pl-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[17px] font-extrabold">
                      {ingredient.name}
                    </div>
                    <div className="flex flex-wrap items-center gap-1 text-[15px] text-muted">
                      {usual && (
                        <>
                          <span className="line-through">
                            {usual.emoji} {usual.name}
                          </span>
                          <ArrowRight size={14} aria-label={t("shopping.store.becomes")} />
                        </>
                      )}
                      <span className="font-bold text-carrot-dark">
                        {aisle.emoji} {aisle.name}
                      </span>
                    </div>
                  </div>
                  <IconButton
                    label={t("shopping.store.removeException", {
                      name: ingredient.name,
                    })}
                    onClick={() =>
                      run(
                        () =>
                          setOverride({
                            token,
                            storeId: store._id,
                            ingredientId: ingredient._id,
                            aisleId: null,
                          }),
                        t("shopping.store.exceptionRemoved", {
                          name: ingredient.name,
                        }),
                      )
                    }
                    className="text-muted"
                  >
                    <Trash2 size={20} />
                  </IconButton>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
      <Button variant="secondary" onClick={() => setAddingException(true)}>
        <Plus size={20} /> {t("shopping.store.addException")}
      </Button>

      <SectionTitle>{t("shopping.store.priceLevel")}</SectionTitle>
      <Card className="flex items-center gap-3 p-3">
        <IconButton
          label={t("shopping.store.cheaper")}
          disabled={store.priceFactor <= MIN_FACTOR}
          onClick={() => changeFactor(-0.01)}
          className="bg-cream ring-1 ring-line"
        >
          <Minus size={22} />
        </IconButton>
        <div className="min-w-0 flex-1 text-center">
          <div
            className={cx(
              "text-[17px] font-black",
              store.priceFactor < 1 && "text-herb",
              store.priceFactor > 1 && "text-berry",
            )}
            aria-live="polite"
          >
            {priceLevelText(store.priceFactor, lang)}
          </div>
          <div className="text-[15px] text-muted">
            {t("shopping.store.priceHelp")}
          </div>
        </div>
        <IconButton
          label={t("shopping.store.dearer")}
          disabled={store.priceFactor >= MAX_FACTOR}
          onClick={() => changeFactor(0.01)}
          className="bg-cream ring-1 ring-line"
        >
          <Plus size={22} />
        </IconButton>
      </Card>

      <div className="mt-10">
        <Button
          variant="danger"
          size="lg"
          onClick={() => setConfirmArchive(true)}
        >
          <Archive size={20} /> {t("shopping.store.archive")}
        </Button>
      </div>

      {addingException && (
        <AddExceptionSheet
          store={store}
          base={base}
          onClose={() => setAddingException(false)}
        />
      )}
      <ConfirmSheet
        open={confirmArchive}
        onClose={() => setConfirmArchive(false)}
        title={t("shopping.store.archiveTitle")}
        text={t("shopping.store.archiveText", { name: store.name })}
        confirmLabel={t("shopping.store.archiveConfirm")}
        danger
        onConfirm={async () => {
          navigate(paths.stores, { replace: true });
          await run(
            () => update({ token, id: store._id, archived: true }),
            t("shopping.store.archived", { name: store.name }),
          );
        }}
      />
    </>
  );
}

function AddExceptionSheet({
  store,
  base,
  onClose,
}: {
  store: Doc<"stores">;
  base: Base;
  onClose: () => void;
}) {
  const { token } = useSession();
  const run = useRun();
  const setOverride = useMutation(api.catalog.setOverride);
  const [search, setSearch] = useState("");
  const [ingredient, setIngredient] = useState<Doc<"ingredients"> | null>(null);
  const { t } = useT();

  const needle = searchKey(search);
  const matches = base.ingredients
    .filter((i) => searchKey(i.name).includes(needle))
    .slice(0, 40);
  const aisleById = new Map(base.aisles.map((a) => [a._id, a]));

  if (ingredient) {
    const current =
      store.overrides.find((o) => o.ingredientId === ingredient._id)?.aisleId ??
      null;
    return (
      <Sheet open onClose={onClose} title={ingredient.name}>
        <p className="mb-3 text-[17px]">
          {t("shopping.store.atStore", { store: store.name })}
        </p>
        <AislePicker
          aisles={base.aisles}
          value={current}
          usualAisleId={ingredient.aisleId}
          onPick={async (aisleId) => {
            onClose();
            await run(
              () =>
                setOverride({
                  token,
                  storeId: store._id,
                  ingredientId: ingredient._id,
                  aisleId,
                }),
              t("shopping.store.exceptionSaved"),
            );
          }}
        />
      </Sheet>
    );
  }

  return (
    <Sheet open onClose={onClose} title={t("shopping.store.whichItem")}>
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder={t("shopping.store.searchIngredient")}
      />
      <ul className="mt-3 grid gap-1.5">
        {matches.map((i) => {
          const aisle = aisleById.get(i.aisleId);
          return (
            <li key={i._id}>
              <button
                type="button"
                onClick={() => setIngredient(i)}
                className="flex min-h-14 w-full items-center gap-3 rounded-2xl bg-paper px-4 text-left ring-1 ring-line active:bg-carrot-soft"
              >
                <span className="min-w-0 flex-1 text-[17px] font-extrabold">
                  {i.name}
                </span>
                {aisle && (
                  <span className="text-[15px] text-muted">
                    {aisle.emoji} {aisle.name}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {matches.length === 0 && (
        <EmptyState
          emoji="🔎"
          title={t("shopping.store.noIngredientTitle")}
          text={t("shopping.store.noIngredientText")}
        />
      )}
    </Sheet>
  );
}
