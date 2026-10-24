import { useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation } from "convex/react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Info,
  Minus,
  Plus,
  Trash2,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { formatNumber, NBSP, toBase, type Unit } from "../../convex/domain/quantities";
import { TAGS } from "../../convex/domain/tags";
import { useBase, useSession, type Base } from "../lib/session";
import { useRun } from "../lib/toast";
import { minutes } from "../lib/format";
import { BackButton } from "../components/Layout";
import { useAppPaths, useInGestion } from "../lib/paths";
import {
  Badge,
  Button,
  Card,
  Chip,
  cx,
  ErrorBox,
  IconButton,
  Loading,
  Page,
  SectionTitle,
  Select,
  Stepper,
  TextInput,
} from "../components/ui";
import { pastelFor } from "../components/recipes/data";
import { useIngredientMap, useRecipes, type RecipeRow } from "../lib/queries";
import { compatibleUnits, parseAmount, unitChoiceLabel, UNITS } from "../lib/units";
import { RecipeNotFound } from "../components/recipes/RecipeNotFound";
import { IngredientPicker } from "../components/recipes/IngredientPicker";
import { PhotoField } from "../components/recipes/PhotoField";

const EMOJIS = [
  "🍝",
  "🍕",
  "🍔",
  "🌮",
  "🌯",
  "🥙",
  "🥗",
  "🍲",
  "🍛",
  "🍜",
  "🍣",
  "🍱",
  "🥘",
  "🫕",
  "🥧",
  "🍗",
  "🥩",
  "🍖",
  "🐟",
  "🍤",
  "🍳",
  "🧀",
  "🥔",
  "🥕",
  "🥦",
  "🍄",
  "🌽",
  "🍅",
  "🥞",
  "🍚",
];

const PREP_STEP = 5;
const PREP_MAX = 300;
const FRIDGE_MAX = 7;

export interface ItemDraft {
  key: string;
  ingredientId: Id<"ingredients"> | null;
  name: string; // kept for display while a new ingredient reaches the catalog
  qty: string;
  unit: Unit;
  // Imported recipe: ingredient missing from the catalog, created on save
  newIngredient?: { name: string; unit: Unit; aisleId: Id<"aisles"> } | null;
  sourceText?: string; // line as written in the imported recipe
  check?: boolean; // the import could not settle the quantity or the aisle
}

interface StepDraft {
  key: string;
  text: string;
}

export interface Draft {
  name: string;
  emoji: string;
  description: string;
  tags: string[];
  prepMinutes: number;
  fridgeDays: number;
  defaultPersons: number;
  items: ItemDraft[];
  steps: StepDraft[];
  imageId: Id<"_storage"> | null;
  imageUrl: string | null;
  sourceUrl?: string;
}

let keySeq = 0;
export const newKey = () => `k${++keySeq}`;

const emptyItem = (): ItemDraft => ({
  key: newKey(),
  ingredientId: null,
  name: "",
  qty: "",
  unit: "g",
});
const emptyStep = (): StepDraft => ({ key: newKey(), text: "" });

function draftFrom(recipe: RecipeRow | undefined, base: Base): Draft {
  if (!recipe) {
    return {
      name: "",
      emoji: "🍲",
      description: "",
      tags: [],
      prepMinutes: 30,
      fridgeDays: 2,
      defaultPersons: base.settings.defaultPersons,
      items: [emptyItem()],
      steps: [emptyStep()],
      imageId: null,
      imageUrl: null,
    };
  }
  return {
    name: recipe.name,
    emoji: recipe.emoji,
    description: recipe.description ?? "",
    tags: recipe.tags,
    prepMinutes: recipe.prepMinutes,
    fridgeDays: recipe.fridgeDays,
    defaultPersons: recipe.defaultPersons ?? base.settings.defaultPersons,
    items: recipe.items.map((i) => ({
      key: newKey(),
      ingredientId: i.ingredientId,
      name: base.ingredients.find((x) => x._id === i.ingredientId)?.name ?? "",
      qty: formatNumber(i.qtyPerPerson, 3),
      unit: i.unit,
    })),
    steps: recipe.steps.length
      ? recipe.steps.map((text) => ({ key: newKey(), text }))
      : [emptyStep()],
    imageId: recipe.imageId ?? null,
    imageUrl: recipe.imageUrl ?? null,
    sourceUrl: recipe.sourceUrl,
  };
}

// NaN when the quantity is missing or invalid
function qtyOf(item: ItemDraft) {
  return parseAmount(item.qty) ?? NaN;
}

function isBlank(item: ItemDraft) {
  return !item.ingredientId && !item.newIngredient && !item.qty.trim();
}

function validate(draft: Draft): string[] {
  const errors: string[] = [];
  if (!draft.name.trim()) errors.push("Donne un nom à la recette.");
  if (!draft.emoji.trim()) errors.push("Choisis un emoji.");
  draft.items.forEach((item, i) => {
    if (isBlank(item)) return;
    if (item.newIngredient && !item.newIngredient.name.trim())
      errors.push(`Ingrédient ${i + 1}${NBSP}: donne un nom au nouvel ingrédient.`);
    else if (!item.ingredientId && !item.newIngredient)
      errors.push(`Ingrédient ${i + 1}${NBSP}: choisis l'ingrédient.`);
    if (!(qtyOf(item) > 0))
      errors.push(
        `Ingrédient ${i + 1}${NBSP}: indique une quantité plus grande que zéro.`,
      );
  });
  return errors;
}

// First visible character, so a pasted text keeps only one emoji
function firstGrapheme(text: string) {
  const segment = new Intl.Segmenter("fr", { granularity: "grapheme" })
    .segment(text.trim())
    [Symbol.iterator]()
    .next();
  return segment.done ? "" : segment.value.segment;
}

export function RecipeEditorPage() {
  const { id } = useParams();
  const base = useBase();
  const recipes = useRecipes();
  const title = id ? "Modifier la recette" : "Nouvelle recette";
  const paths = useAppPaths();
  const back = (
    <BackButton fallback={id ? paths.recipeSaved(id) : paths.recipes} />
  );

  if (!base || (id && !recipes)) {
    return (
      <Page title={title} back={back}>
        <Loading />
      </Page>
    );
  }
  const recipe = id ? recipes?.find((r) => r._id === id) : undefined;
  if (id && !recipe) {
    return (
      <Page title={title} back={back}>
        <RecipeNotFound />
      </Page>
    );
  }
  return (
    <RecipeForm
      key={id ?? "new"}
      title={title}
      back={back}
      base={base}
      recipeId={recipe?._id}
      initial={draftFrom(recipe, base)}
    />
  );
}

export function RecipeForm({
  title,
  back,
  base,
  recipeId,
  initial,
}: {
  title: string;
  back: ReactNode;
  base: Base;
  recipeId?: Id<"recipes">;
  initial: Draft;
}) {
  const { token, memberId } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const paths = useAppPaths();
  const wide = useInGestion();
  const run = useRun();
  const ingredients = useIngredientMap();
  const create = useMutation(api.recipes.create);
  const update = useMutation(api.recipes.update);
  const [draft, setDraft] = useState(initial);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const setItem = (key: string, patch: Partial<ItemDraft>) =>
    setDraft((d) => ({
      ...d,
      items: d.items.map((i) => (i.key === key ? { ...i, ...patch } : i)),
    }));
  const setStep = (key: string, text: string) =>
    setDraft((d) => ({
      ...d,
      steps: d.steps.map((s) => (s.key === key ? { ...s, text } : s)),
    }));
  const moveStep = (index: number, delta: number) =>
    setDraft((d) => {
      const steps = [...d.steps];
      const [moved] = steps.splice(index, 1);
      steps.splice(index + delta, 0, moved);
      return { ...d, steps };
    });

  const save = async () => {
    const found = validate(draft);
    setErrors(found);
    if (found.length) {
      requestAnimationFrame(() =>
        errorRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        }),
      );
      return;
    }
    const payload = {
      name: draft.name.trim(),
      emoji: draft.emoji.trim(),
      description: draft.description.trim() || undefined,
      tags: draft.tags,
      prepMinutes: draft.prepMinutes,
      fridgeDays: draft.fridgeDays,
      defaultPersons: draft.defaultPersons,
      steps: draft.steps.map((s) => s.text.trim()).filter(Boolean),
      imageId: draft.imageId ?? undefined,
      sourceUrl: draft.sourceUrl,
    };
    const filled = draft.items.filter((i) => !isBlank(i));
    const items = filled.flatMap((i) =>
      i.ingredientId
        ? [{ ingredientId: i.ingredientId, qtyPerPerson: qtyOf(i), unit: i.unit }]
        : [],
    );
    setSaving(true);
    if (recipeId) {
      const done = await run(
        () => update({ token, id: recipeId, ...payload, items }),
        "Recette enregistrée",
      );
      setSaving(false);
      if (done === undefined) return;
      // Back to the recipe screen we came from, without stacking a duplicate
      if (location.key !== "default") navigate(-1);
      else navigate(paths.recipeSaved(recipeId), { replace: true });
    } else {
      const newId = await run(
        () =>
          create({
            token,
            memberId: memberId ?? undefined,
            ...payload,
            items: filled.map((i) =>
              i.ingredientId
                ? { ingredientId: i.ingredientId, qtyPerPerson: qtyOf(i), unit: i.unit }
                : {
                    newIngredient: { ...i.newIngredient!, name: i.newIngredient!.name.trim() },
                    qtyPerPerson: qtyOf(i),
                    unit: i.unit,
                  },
            ),
          }),
        "Recette ajoutée à nos recettes",
      );
      setSaving(false);
      if (newId) navigate(paths.recipeSaved(newId), { replace: true });
    }
  };

  const saveButton = (
    <Button size="sm" onClick={save} disabled={saving}>
      Enregistrer
    </Button>
  );

  return (
    <Page title={title} back={back} action={saveButton} wide={wide}>
      {/* Two columns on the desktop management area: the dish on the left, what goes in it on the right */}
      <div
        className={
          wide ? "grid items-start gap-x-10 xl:grid-cols-2" : undefined
        }
      >
        <div>
          {/* Name and emoji */}
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="flex size-20 shrink-0 items-center justify-center rounded-3xl text-5xl"
              style={{ background: pastelFor(draft.name || "Recette") }}
            >
              {draft.emoji || "🍽️"}
            </span>
            <div className="min-w-0 flex-1">
              <TextInput
                label="Nom du plat"
                value={draft.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Ex. Gratin de courge"
                className="text-lg font-extrabold"
              />
            </div>
          </div>

          <SectionTitle>Emoji</SectionTitle>
          <Card className="p-3">
            <div
              className={cx(
                "grid gap-1.5",
                wide ? "grid-cols-10" : "grid-cols-6",
              )}
            >
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  aria-label={`Emoji ${e}`}
                  aria-pressed={draft.emoji === e}
                  onClick={() => set("emoji", e)}
                  className={cx(
                    "flex aspect-square min-h-11 items-center justify-center rounded-2xl text-[26px] transition active:scale-90",
                    draft.emoji === e
                      ? "bg-carrot-soft ring-2 ring-carrot"
                      : "active:bg-cream",
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
            <div className="mt-3">
              <TextInput
                aria-label="Autre emoji"
                placeholder="Ou tape un autre emoji"
                value={EMOJIS.includes(draft.emoji) ? "" : draft.emoji}
                onChange={(e) => set("emoji", firstGrapheme(e.target.value))}
              />
            </div>
          </Card>

          <PhotoField
            imageUrl={draft.imageUrl}
            onChange={(image) =>
              setDraft((d) => ({
                ...d,
                imageId: image?.id ?? null,
                imageUrl: image?.url ?? null,
              }))
            }
          />

          <SectionTitle>Description</SectionTitle>
          <textarea
            aria-label="Description"
            value={draft.description}
            onChange={(e) => set("description", e.target.value)}
            rows={2}
            placeholder="En une phrase, ce qui donne envie"
            className="w-full rounded-2xl bg-paper px-4 py-3 ring-1 ring-line outline-none placeholder:text-muted/70 focus:ring-2 focus:ring-carrot"
          />

          <SectionTitle>Style</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {TAGS.map((tag) => {
              const on = draft.tags.includes(tag);
              return (
                <Chip
                  key={tag}
                  selected={on}
                  onClick={() =>
                    set(
                      "tags",
                      on
                        ? draft.tags.filter((t) => t !== tag)
                        : [...draft.tags, tag],
                    )
                  }
                >
                  {tag}
                </Chip>
              );
            })}
          </div>

          <SectionTitle>Temps et conservation</SectionTitle>
          <Card className="divide-y divide-line">
            <div className="flex items-center justify-between gap-3 p-4">
              <div>
                <div className="font-extrabold">Préparation</div>
                <div className="text-[15px] text-muted">
                  {minutes(draft.prepMinutes)}
                </div>
              </div>
              <div
                className="flex items-center gap-1"
                role="group"
                aria-label="Temps de préparation"
              >
                <IconButton
                  label="Cinq minutes de moins"
                  disabled={draft.prepMinutes <= PREP_STEP}
                  onClick={() =>
                    set(
                      "prepMinutes",
                      Math.max(PREP_STEP, draft.prepMinutes - PREP_STEP),
                    )
                  }
                  className="bg-paper ring-1 ring-line"
                >
                  <Minus size={20} />
                </IconButton>
                <span className="min-w-12 text-center text-xl font-black tabular-nums">
                  {draft.prepMinutes}
                </span>
                <IconButton
                  label="Cinq minutes de plus"
                  disabled={draft.prepMinutes >= PREP_MAX}
                  onClick={() =>
                    set(
                      "prepMinutes",
                      Math.min(PREP_MAX, draft.prepMinutes + PREP_STEP),
                    )
                  }
                  className="bg-paper ring-1 ring-line"
                >
                  <Plus size={20} />
                </IconButton>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 p-4">
              <div>
                <div className="font-extrabold">Au frigo</div>
                <div className="text-[15px] text-muted">
                  {draft.fridgeDays === 0
                    ? "À manger tout de suite"
                    : `Se garde ${draft.fridgeDays} ${draft.fridgeDays > 1 ? "jours" : "jour"}`}
                </div>
              </div>
              <Stepper
                label="Jours au frigo"
                value={draft.fridgeDays}
                onChange={(n) => set("fridgeDays", n)}
                min={0}
                max={FRIDGE_MAX}
              />
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-line p-4">
              <div>
                <div className="font-extrabold">D'habitude pour</div>
                <div className="text-[15px] text-muted">
                  {draft.defaultPersons > 1
                    ? `${draft.defaultPersons}\u00a0portions`
                    : "1\u00a0portion"}
                  , proposé en planifiant
                </div>
              </div>
              <Stepper
                label="Portions d'habitude"
                value={draft.defaultPersons}
                onChange={(n) => set("defaultPersons", n)}
                min={1}
                max={12}
              />
            </div>
          </Card>
        </div>

        <div>
          <SectionTitle>Ingrédients</SectionTitle>
          <div className="mb-3 flex items-start gap-2 rounded-2xl bg-sun-soft p-3 text-[15px] font-bold">
            <Info
              size={20}
              className="mt-0.5 shrink-0 text-[#8a6200]"
              aria-hidden
            />
            <span>
              Quantités pour 1 portion, l'app multiplie selon le nombre de
              portions au menu.
            </span>
          </div>
          <div className="space-y-3">
            {draft.items.map((item, index) => {
              const ing = item.ingredientId
                ? ingredients[item.ingredientId]
                : undefined;
              // Pieces are always offered (« 1 poivron »): they get their own line on the list
              const isNew = !ing && !!item.newIngredient;
              const family = compatibleUnits(
                ing?.unit ?? item.newIngredient?.unit ?? item.unit,
              );
              // A new ingredient takes whichever unit is chosen here
              const units = isNew
                ? UNITS
                : family.includes("pc")
                  ? family
                  : [...family, "pc" as const];
              return (
                <Card key={item.key} className="space-y-2 p-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPickerFor(item.key)}
                      className="flex min-h-12 min-w-0 flex-1 items-center gap-2 rounded-2xl bg-cream px-4 text-left ring-1 ring-line active:bg-carrot-soft"
                    >
                      <span
                        className={cx(
                          "min-w-0 flex-1 truncate font-extrabold",
                          !item.ingredientId && "text-muted",
                        )}
                      >
                        {ing?.name ??
                          (isNew
                            ? "Choisir dans nos produits"
                            : item.name || "Choisir un ingrédient")}
                      </span>
                      <ChevronDown size={20} className="shrink-0 text-muted" />
                    </button>
                    <IconButton
                      label={`Retirer l'ingrédient ${index + 1}`}
                      onClick={() =>
                        set(
                          "items",
                          draft.items.filter((i) => i.key !== item.key),
                        )
                      }
                      className="text-berry"
                    >
                      <Trash2 size={20} />
                    </IconButton>
                  </div>
                  {(item.sourceText || item.check) && (
                    <div className="flex flex-wrap items-center gap-2 px-1 text-[15px] text-muted">
                      {item.check && <Badge tone="sun">À vérifier</Badge>}
                      {item.sourceText && <span>« {item.sourceText} »</span>}
                    </div>
                  )}
                  {isNew && item.newIngredient && (
                    <div className="space-y-2 rounded-2xl bg-carrot-soft/60 p-3">
                      <div className="flex items-center gap-2">
                        <Badge tone="carrot">Nouveau</Badge>
                        <span className="text-[15px] font-bold">
                          Créé dans nos produits à l'enregistrement
                        </span>
                      </div>
                      <TextInput
                        aria-label={`Nom du nouvel ingrédient ${index + 1}`}
                        value={item.newIngredient.name}
                        onChange={(e) =>
                          setItem(item.key, {
                            newIngredient: {
                              ...item.newIngredient!,
                              name: e.target.value,
                            },
                          })
                        }
                        className="font-extrabold"
                      />
                      <Select
                        aria-label={`Rayon du nouvel ingrédient ${index + 1}`}
                        value={item.newIngredient.aisleId}
                        onChange={(e) =>
                          setItem(item.key, {
                            newIngredient: {
                              ...item.newIngredient!,
                              aisleId: e.target.value as Id<"aisles">,
                            },
                          })
                        }
                      >
                        {base.aisles.map((a) => (
                          <option key={a._id} value={a._id}>
                            {a.emoji} {a.name}
                          </option>
                        ))}
                      </Select>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      aria-label={`Quantité pour 1 portion, ingrédient ${index + 1}`}
                      inputMode="decimal"
                      value={item.qty}
                      onChange={(e) =>
                        setItem(item.key, { qty: e.target.value })
                      }
                      placeholder="Quantité"
                      className="min-h-12 w-32 rounded-2xl bg-paper px-4 font-bold ring-1 ring-line outline-none placeholder:text-muted/70 focus:ring-2 focus:ring-carrot"
                    />
                    {units.length > 1 ? (
                      <Select
                        aria-label={`Unité, ingrédient ${index + 1}`}
                        value={item.unit}
                        onChange={(e) =>
                          setItem(item.key, {
                            unit: e.target.value as Unit,
                            ...(isNew && {
                              newIngredient: {
                                ...item.newIngredient!,
                                unit: toBase(1, e.target.value as Unit).unit,
                              },
                            }),
                          })
                        }
                        className="font-bold"
                      >
                        {units.map((u) => (
                          <option key={u} value={u}>
                            {unitChoiceLabel(u)}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <span className="flex min-h-12 flex-1 items-center px-2 font-bold text-muted">
                        {unitChoiceLabel(item.unit)}
                      </span>
                    )}
                  </div>
                </Card>
              );
            })}
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => set("items", [...draft.items, emptyItem()])}
            >
              <Plus size={20} />
              Ajouter un ingrédient
            </Button>
          </div>

          <SectionTitle>Préparation</SectionTitle>
          <div className="space-y-3">
            {draft.steps.map((step, index) => (
              <Card key={step.key} className="p-3">
                <div className="mb-2 flex items-center gap-1">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-carrot font-black text-white">
                    {index + 1}
                  </span>
                  <span className="flex-1 pl-1 font-extrabold">
                    Étape {index + 1}
                  </span>
                  <IconButton
                    label={`Monter l'étape ${index + 1}`}
                    disabled={index === 0}
                    onClick={() => moveStep(index, -1)}
                  >
                    <ArrowUp size={20} />
                  </IconButton>
                  <IconButton
                    label={`Descendre l'étape ${index + 1}`}
                    disabled={index === draft.steps.length - 1}
                    onClick={() => moveStep(index, 1)}
                  >
                    <ArrowDown size={20} />
                  </IconButton>
                  <IconButton
                    label={`Supprimer l'étape ${index + 1}`}
                    onClick={() =>
                      set(
                        "steps",
                        draft.steps.filter((s) => s.key !== step.key),
                      )
                    }
                    className="text-berry"
                  >
                    <Trash2 size={20} />
                  </IconButton>
                </div>
                <textarea
                  aria-label={`Texte de l'étape ${index + 1}`}
                  value={step.text}
                  onChange={(e) => setStep(step.key, e.target.value)}
                  rows={3}
                  placeholder="Ce qu'il faut faire"
                  className="w-full rounded-2xl bg-cream px-4 py-3 ring-1 ring-line outline-none placeholder:text-muted/70 focus:ring-2 focus:ring-carrot"
                />
              </Card>
            ))}
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => set("steps", [...draft.steps, emptyStep()])}
            >
              <Plus size={20} />
              Ajouter une étape
            </Button>
          </div>

          <div className="mt-8 space-y-3">
            {errors.length > 0 && (
              <div ref={errorRef}>
                <ErrorBox>
                  <ul className="space-y-1">
                    {errors.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                </ErrorBox>
              </div>
            )}
            <Button size="lg" onClick={save} disabled={saving}>
              {saving ? "Enregistrement…" : "Enregistrer la recette"}
            </Button>
          </div>
        </div>
      </div>

      <IngredientPicker
        open={pickerFor !== null}
        onClose={() => setPickerFor(null)}
        base={base}
        onPick={(picked) => {
          if (pickerFor)
            setItem(pickerFor, {
              ingredientId: picked._id,
              name: picked.name,
              unit: picked.unit,
              newIngredient: null,
              check: false,
            });
        }}
      />
    </Page>
  );
}
