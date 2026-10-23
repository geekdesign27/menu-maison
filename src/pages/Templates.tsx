import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { CopyPlus, Save, Trash } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { addDays, dayOfWeek, formatDateRange } from "../../convex/domain/dates";
import { useSession } from "../lib/session";
import { useWeek } from "../lib/week";
import { useRun } from "../lib/toast";
import { plural } from "../lib/format";
import { BackButton } from "../components/Layout";
import { Field } from "../components/planning/controls";
import { useWeekMeals } from "../components/planning/data";
import {
  Button,
  Card,
  Chip,
  cx,
  EmptyState,
  Loading,
  Page,
  Segmented,
  Sheet,
  TextInput,
} from "../components/ui";

type Template = FunctionReturnType<typeof api.templates.list>[number];

const SHORT = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];

export function TemplatesPage() {
  const { token } = useSession();
  const { start, end } = useWeek();
  const templates = useQuery(api.templates.list, token ? { token } : "skip");
  const [applying, setApplying] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);

  return (
    <Page
      title="Menus types"
      subtitle="Nos semaines habituelles"
      back={<BackButton fallback="/plus" />}
    >
      <Button
        variant="secondary"
        className="mt-2 w-full"
        onClick={() => setSaving(true)}
      >
        <Save size={20} />
        Enregistrer cette semaine comme menu type
      </Button>
      <p className="mt-1 px-1 text-center text-[15px] text-muted">
        Semaine affichée : {formatDateRange(start, end)}
      </p>

      {templates === undefined ? (
        <Loading label="Chargement des menus types" />
      ) : templates.length === 0 ? (
        <Card className="mt-4">
          <EmptyState
            emoji="🗂️"
            title="Aucun menu type"
            text="Planifie une semaine qui plaît à tout le monde, puis enregistre-la ici pour la réutiliser en un tap."
          />
        </Card>
      ) : (
        <ul className="mt-4 space-y-3">
          {templates.map((t) => (
            <li key={t._id}>
              <TemplateCard template={t} onApply={() => setApplying(t)} />
            </li>
          ))}
        </ul>
      )}

      <ApplySheet template={applying} onClose={() => setApplying(null)} />
      <SaveWeekSheet
        open={saving}
        templates={templates ?? []}
        onClose={() => setSaving(false)}
      />
    </Page>
  );
}

function TemplateCard({
  template,
  onApply,
}: {
  template: Template;
  onApply: () => void;
}) {
  const { token } = useSession();
  const { start } = useWeek();
  const run = useRun();
  const remove = useMutation(api.templates.remove);
  const [confirm, setConfirm] = useState(false);

  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="min-w-0 truncate text-lg font-black">{template.name}</h3>
        <span className="shrink-0 text-[15px] font-bold text-muted">
          {plural(template.entries.length, "plat", "plats")}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1">
        {Array.from({ length: 7 }, (_, i) => {
          const entries = template.entries
            .filter((e) => e.dayOffset === i)
            .sort((a, b) => a.slot.localeCompare(b.slot));
          return (
            <div
              key={i}
              className="flex min-h-20 flex-col items-center gap-0.5 rounded-xl bg-cream py-1.5"
            >
              <span className="text-[13px] font-bold text-muted">
                {SHORT[dayOfWeek(addDays(start, i))]}
              </span>
              {entries.map((e, j) => (
                <span
                  key={j}
                  className="text-xl leading-tight"
                  title={`${e.recipeName} (${e.slot})`}
                >
                  {e.recipeEmoji}
                </span>
              ))}
            </div>
          );
        })}
      </div>

      {confirm ? (
        <div className="mt-3 rounded-2xl bg-berry-soft p-3">
          <p className="font-extrabold text-berry">
            Supprimer « {template.name} » ?
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => setConfirm(false)}>
              Annuler
            </Button>
            <button
              type="button"
              className="min-h-12 rounded-2xl bg-berry px-4 font-extrabold text-white active:brightness-95"
              onClick={() =>
                run(
                  () => remove({ token, id: template._id }),
                  "Menu type supprimé",
                )
              }
            >
              Supprimer
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex gap-2">
          <Button className="flex-1" onClick={onApply}>
            <CopyPlus size={20} />
            Appliquer
          </Button>
          <Button
            variant="danger"
            aria-label={`Supprimer ${template.name}`}
            onClick={() => setConfirm(true)}
          >
            <Trash size={20} />
          </Button>
        </div>
      )}
    </Card>
  );
}

function ApplySheet({
  template,
  onClose,
}: {
  template: Template | null;
  onClose: () => void;
}) {
  return (
    <Sheet
      open={!!template}
      onClose={onClose}
      title={template ? `Appliquer «\u00a0${template.name}\u00a0»` : ""}
    >
      {template && (
        <ApplyForm key={template._id} template={template} onClose={onClose} />
      )}
    </Sheet>
  );
}

function ApplyForm({
  template,
  onClose,
}: {
  template: Template;
  onClose: () => void;
}) {
  const { token } = useSession();
  const { start, end } = useWeek();
  const run = useRun();
  const apply = useMutation(api.templates.apply);
  const meals = useWeekMeals(start);
  const [mode, setMode] = useState<"add" | "replace">("add");
  const [busy, setBusy] = useState(false);
  const planned = (meals ?? []).filter(
    (m) => m.status === "prévu" && !m.fromLeftoverOf,
  ).length;
  const count = plural(template.entries.length, "plat", "plats");

  return (
    <div className="space-y-5">
      <p className="text-[17px] font-bold">
        À la semaine du {formatDateRange(start, end)}
      </p>
      <Segmented
        label="Plats déjà prévus"
        value={mode}
        onChange={setMode}
        options={[
          { value: "add", label: "Ajouter" },
          { value: "replace", label: "Remplacer" },
        ]}
      />
      <p
        className={cx(
          "rounded-2xl p-4 text-[15px] font-semibold",
          mode === "replace" && planned > 0
            ? "bg-berry-soft text-berry"
            : "bg-paper text-muted ring-1 ring-line",
        )}
      >
        {mode === "add"
          ? `Les ${count} du menu type s'ajoutent à ceux déjà prévus.`
          : planned > 0
            ? `${plural(planned, "plat prévu sera retiré", "plats prévus seront retirés")} avant d'ajouter le menu type. Les plats mangés et les restes ne bougent pas.`
            : "Aucun plat prévu cette semaine\u00a0: le menu type s'ajoute simplement."}
      </p>
      <Button
        size="lg"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const n = await run(
            () =>
              apply({
                token,
                id: template._id,
                start,
                replace: mode === "replace",
              }),
            `${count} ajoutés à la semaine`,
          );
          setBusy(false);
          if (n !== undefined) onClose();
        }}
      >
        {mode === "replace" && planned > 0
          ? "Remplacer la semaine"
          : "Appliquer à la semaine"}
      </Button>
    </div>
  );
}

function SaveWeekSheet({
  open,
  templates,
  onClose,
}: {
  open: boolean;
  templates: Template[];
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Enregistrer la semaine">
      {open && <SaveWeekForm templates={templates} onClose={onClose} />}
    </Sheet>
  );
}

function SaveWeekForm({
  templates,
  onClose,
}: {
  templates: Template[];
  onClose: () => void;
}) {
  const { token } = useSession();
  const { start, end } = useWeek();
  const run = useRun();
  const saveWeek = useMutation(api.templates.saveWeek);
  const meals = useWeekMeals(start);
  const [mode, setMode] = useState<"new" | "replace">("new");
  const [name, setName] = useState("");
  const [replaceId, setReplaceId] = useState<Id<"templates"> | null>(null);
  const [busy, setBusy] = useState(false);
  const count = (meals ?? []).filter(
    (m) => m.recipeId && !m.fromLeftoverOf,
  ).length;
  const canSave =
    !!name.trim() && count > 0 && (mode === "new" || !!replaceId) && !busy;

  return (
    <div className="space-y-5">
      <p className="text-[15px] font-semibold text-muted">
        Semaine du {formatDateRange(start, end)} :{" "}
        {meals === undefined
          ? "…"
          : plural(count, "plat avec recette", "plats avec recette")}
        . Les textes libres et les restes ne sont pas repris.
      </p>
      {templates.length > 0 && (
        <Segmented
          label="Type d'enregistrement"
          value={mode}
          onChange={(m) => {
            setMode(m);
            if (m === "new") setReplaceId(null);
          }}
          options={[
            { value: "new", label: "Nouveau" },
            { value: "replace", label: "Remplacer" },
          ]}
        />
      )}
      {mode === "replace" && (
        <Field label="Menu type à remplacer">
          <div className="flex flex-wrap gap-2">
            {templates.map((t) => (
              <Chip
                key={t._id}
                selected={replaceId === t._id}
                onClick={() => {
                  setReplaceId(t._id);
                  setName(t.name);
                }}
              >
                {t.name}
              </Chip>
            ))}
          </div>
        </Field>
      )}
      <TextInput
        label="Nom"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Semaine classique, semaine chargée…"
        maxLength={50}
      />
      <Button
        size="lg"
        disabled={!canSave}
        onClick={async () => {
          setBusy(true);
          const id = await run(
            () =>
              saveWeek({
                token,
                name,
                start,
                replaceId: replaceId ?? undefined,
              }),
            mode === "replace"
              ? "Menu type mis à jour"
              : "Menu type enregistré",
          );
          setBusy(false);
          if (id) onClose();
        }}
      >
        <Save size={20} />
        Enregistrer
      </Button>
    </div>
  );
}
