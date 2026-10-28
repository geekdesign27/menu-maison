import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { CopyPlus, Save, Trash } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { Lang } from "../../convex/domain/lang";
import {
  addDays,
  dayOfWeek,
  dayShortName,
  formatDateRange,
} from "../../convex/domain/dates";
import { translate } from "../i18n";
import { useT } from "../i18n/useT";
import { useSession } from "../lib/session";
import { useWeek } from "../lib/week";
import { useRun, useToast } from "../lib/toast";
import { plural } from "../lib/format";
import { BackButton } from "../components/Layout";
import { Field } from "../components/planning/controls";
import { slotInText, SLOTS, useWeekMeals } from "../components/planning/data";
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

export function TemplatesPage() {
  const { token } = useSession();
  const { start, end } = useWeek();
  const { t, lang } = useT();
  const templates = useQuery(api.templates.list, token ? { token } : "skip");
  const [applying, setApplying] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);

  return (
    <Page
      title={t("week.templates")}
      subtitle={t("week.templatesSubtitle")}
      back={<BackButton fallback="/plus" />}
    >
      <Button
        variant="secondary"
        className="mt-2 w-full"
        onClick={() => setSaving(true)}
      >
        <Save size={20} />
        {t("week.saveAsTemplate")}
      </Button>
      <p className="mt-1 px-1 text-center text-[15px] text-muted">
        {t("week.shownWeek", { range: formatDateRange(start, end, lang) })}
      </p>

      {templates === undefined ? (
        <Loading label={t("week.loadingTemplates")} />
      ) : templates.length === 0 ? (
        <Card className="mt-4">
          <EmptyState
            emoji="🗂️"
            title={t("week.noTemplateTitle")}
            text={t("week.noTemplateText")}
          />
        </Card>
      ) : (
        <ul className="mt-4 space-y-3">
          {templates.map((tpl) => (
            <li key={tpl._id}>
              <TemplateCard template={tpl} onApply={() => setApplying(tpl)} />
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
  const { t, lang } = useT();
  const run = useRun();
  const remove = useMutation(api.templates.remove);
  const [confirm, setConfirm] = useState(false);

  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="min-w-0 truncate text-lg font-black">{template.name}</h3>
        <span className="shrink-0 text-[15px] font-bold text-muted">
          {plural(
            template.entries.length,
            t("week.dishOne"),
            t("week.dishMany"),
          )}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1">
        {Array.from({ length: 7 }, (_, i) => {
          const entries = template.entries
            .filter((e) => e.dayOffset === i)
            .sort((a, b) => SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot));
          return (
            <div
              key={i}
              className="flex min-h-20 flex-col items-center gap-0.5 rounded-xl bg-cream py-1.5"
            >
              <span className="text-[13px] font-bold text-muted">
                {dayShortName(dayOfWeek(addDays(start, i)), lang)}
              </span>
              {entries.map((e, j) => (
                <span
                  key={j}
                  className="text-xl leading-tight"
                  title={`${e.recipeName} (${slotInText(e.slot, lang)})`}
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
            {t("week.deleteTemplateConfirm", { name: template.name })}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => setConfirm(false)}>
              {t("week.cancel")}
            </Button>
            <button
              type="button"
              className="min-h-12 rounded-2xl bg-berry px-4 font-extrabold text-white active:brightness-95"
              onClick={() =>
                run(
                  () => remove({ token, id: template._id }),
                  t("week.templateDeleted"),
                )
              }
            >
              {t("week.delete")}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex gap-2">
          <Button className="flex-1" onClick={onApply}>
            <CopyPlus size={20} />
            {t("week.apply")}
          </Button>
          <Button
            variant="danger"
            aria-label={t("week.deleteNamed", { name: template.name })}
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
  const { t } = useT();
  return (
    <Sheet
      open={!!template}
      onClose={onClose}
      title={template ? t("week.applyNamed", { name: template.name }) : ""}
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
  const { t, lang } = useT();
  const run = useRun();
  const toast = useToast();
  const apply = useMutation(api.templates.apply);
  const meals = useWeekMeals(start);
  const [mode, setMode] = useState<"add" | "replace">("add");
  const [busy, setBusy] = useState(false);
  const planned = (meals ?? []).filter(
    (m) => m.status === "prévu" && !m.fromLeftoverOf,
  ).length;
  const count = plural(
    template.entries.length,
    t("week.dishOne"),
    t("week.dishMany"),
  );

  return (
    <div className="space-y-5">
      <p className="text-[17px] font-bold">
        {t("week.toWeekOf", { range: formatDateRange(start, end, lang) })}
      </p>
      <Segmented
        label={t("week.alreadyPlanned")}
        value={mode}
        onChange={setMode}
        options={[
          { value: "add", label: t("week.add") },
          { value: "replace", label: t("week.replace") },
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
          ? t("week.applyAddInfo", { count })
          : planned > 0
            ? t("week.applyReplaceInfo", {
                planned: plural(
                  planned,
                  t("week.plannedRemovedOne"),
                  t("week.plannedRemovedMany"),
                ),
              })
            : t("week.applyEmptyInfo")}
      </p>
      <Button
        size="lg"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const result = await run(() =>
            apply({
              token,
              id: template._id,
              start,
              replace: mode === "replace",
            }),
          );
          setBusy(false);
          if (result === undefined) return;
          toast(appliedMessage(result.added, result.skipped, lang));
          onClose();
        }}
      >
        {mode === "replace" && planned > 0
          ? t("week.replaceWeek")
          : t("week.applyToWeek")}
      </Button>
    </div>
  );
}

/** « 3 plats ajoutés à la semaine (1 recette archivée ignorée) ». */
function appliedMessage(added: number, skipped: number, lang: Lang) {
  const tr = (key: Parameters<typeof translate>[1]) => translate(lang, key);
  const text = translate(
    lang,
    added > 1 ? "week.appliedMany" : "week.appliedOne",
    { dishes: plural(added, tr("week.dishOne"), tr("week.dishMany")) },
  );
  if (skipped === 0) return text;
  return `${text} (${plural(skipped, tr("week.skippedOne"), tr("week.skippedMany"))})`;
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
  const { t } = useT();
  return (
    <Sheet open={open} onClose={onClose} title={t("week.saveWeek")}>
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
  const { t, lang } = useT();
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
        {t("week.saveSummary", {
          range: formatDateRange(start, end, lang),
          count:
            meals === undefined
              ? "…"
              : plural(
                  count,
                  t("week.withRecipeOne"),
                  t("week.withRecipeMany"),
                ),
        })}
      </p>
      {templates.length > 0 && (
        <Segmented
          label={t("week.saveMode")}
          value={mode}
          onChange={(m) => {
            setMode(m);
            if (m === "new") setReplaceId(null);
          }}
          options={[
            { value: "new", label: t("week.new") },
            { value: "replace", label: t("week.replace") },
          ]}
        />
      )}
      {mode === "replace" && (
        <Field label={t("week.templateToReplace")}>
          <div className="flex flex-wrap gap-2">
            {templates.map((tpl) => (
              <Chip
                key={tpl._id}
                selected={replaceId === tpl._id}
                onClick={() => {
                  setReplaceId(tpl._id);
                  setName(tpl.name);
                }}
              >
                {tpl.name}
              </Chip>
            ))}
          </div>
        </Field>
      )}
      <TextInput
        label={t("week.name")}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("week.namePlaceholder")}
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
              ? t("week.templateUpdated")
              : t("week.templateSaved"),
          );
          setBusy(false);
          if (id) onClose();
        }}
      >
        <Save size={20} />
        {t("week.save")}
      </Button>
    </div>
  );
}
