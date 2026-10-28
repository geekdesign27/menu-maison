import { useEffect, useState } from "react";
import { useAction, useMutation } from "convex/react";
import { ClipboardPaste, Link2, Sparkles } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { formatNumber } from "../../convex/domain/quantities";
import type { Lang } from "../../convex/domain/lang";
import { useBase, useSession } from "../lib/session";
import { errorMessage } from "../lib/format";
import { BackButton } from "../components/Layout";
import { useAppPaths } from "../lib/paths";
import { Button, Card, ErrorBox, Loading, Page } from "../components/ui";
import { newKey, RecipeForm, type Draft } from "./RecipeEditor";
import { Dictation } from "../components/recipes/Dictation";
import type { Id } from "../../convex/_generated/dataModel";
import { useT } from "../i18n/useT";
import type { MessageKey } from "../i18n";

type Imported = FunctionReturnType<typeof api.recipeImport.read>;

// Shown one after the other while Claude reads, so the wait feels alive
const STEPS: MessageKey[] = [
  "recipes.importStepRead",
  "recipes.importStepIngredients",
  "recipes.importStepQty",
  "recipes.importStepSteps",
];

function toDraft(r: Imported, lang: Lang): Draft {
  return {
    name: r.name,
    emoji: r.emoji,
    description: r.description,
    tags: r.tags,
    prepMinutes: r.prepMinutes,
    fridgeDays: r.fridgeDays,
    defaultPersons: r.defaultPersons,
    items: r.items.map((i) => ({
      key: newKey(),
      ingredientId: i.ingredientId,
      name: i.newIngredient?.name ?? "",
      qty: i.qtyPerPerson !== null ? formatNumber(i.qtyPerPerson, 3, lang) : "",
      unit: i.unit,
      newIngredient: i.newIngredient,
      sourceText: i.text,
      check: i.check,
    })),
    steps: r.steps.map((text) => ({ key: newKey(), text })),
    imageId: r.imageId,
    imageUrl: r.imageUrl,
    sourceUrl: r.sourceUrl ?? undefined,
  };
}

export function RecipeImportPage() {
  const base = useBase();
  const paths = useAppPaths();
  const { t, lang } = useT();
  const [draft, setDraft] = useState<Draft | null>(null);
  const back = <BackButton fallback={paths.recipes} />;

  if (!base) {
    return (
      <Page title={t("recipes.newImportTitle")} back={back}>
        <Loading />
      </Page>
    );
  }
  if (draft) {
    return (
      <RecipeForm
        title={t("recipes.newRecipe")}
        back={back}
        base={base}
        initial={draft}
      />
    );
  }
  return (
    <Page title={t("recipes.newImportTitle")} back={back}>
      <ImportForm onRead={(r) => setDraft(toDraft(r, lang))} />
    </Page>
  );
}

function ImportForm({ onRead }: { onRead: (r: Imported) => void }) {
  const { token } = useSession();
  const { t, lang } = useT();
  const read = useAction(api.recipeImport.read);
  const transcribe = useAction(api.recipeImport.transcribe);
  const uploadUrl = useMutation(api.recipes.generateUploadUrl);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<"idle" | "transcribing" | "reading">(
    "idle",
  );
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (phase !== "reading") return;
    setStep(0);
    const timer = setInterval(
      () => setStep((n) => Math.min(n + 1, STEPS.length - 1)),
      4000,
    );
    return () => clearInterval(timer);
  }, [phase]);

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) setInput(text.trim());
    } catch {
      setError(t("recipes.clipboardBlocked"));
    }
  };

  const prepare = async (text: string) => {
    setError(null);
    setPhase("reading");
    try {
      onRead(await read({ token, input: text }));
    } catch (e) {
      setError(errorMessage(e, lang));
      setPhase("idle");
    }
  };

  // The transcript lands in the field: if the recipe cannot be prepared, it can be fixed and sent again
  const dictated = async (audio: Blob) => {
    setError(null);
    setPhase("transcribing");
    try {
      const url = await uploadUrl({ token });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": audio.type },
        body: audio,
      });
      if (!res.ok) throw new Error(t("recipes.dictationUploadFailed"));
      const { storageId } = (await res.json()) as {
        storageId: Id<"_storage">;
      };
      const { text } = await transcribe({ token, audioId: storageId });
      setInput(text);
      await prepare(text);
    } catch (e) {
      setError(errorMessage(e, lang));
      setPhase("idle");
    }
  };

  if (phase !== "idle") {
    return (
      <Card className="flex flex-col items-center gap-4 p-8 text-center">
        <Sparkles size={40} className="animate-pulse text-carrot" aria-hidden />
        <p className="text-lg font-extrabold" aria-live="polite">
          {phase === "transcribing"
            ? t("recipes.importTranscribing")
            : t(STEPS[step])}
        </p>
        <p className="text-[15px] text-muted">{t("recipes.importWait")}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Dictation onRecorded={dictated} onError={setError} />
      {error && <ErrorBox>{error}</ErrorBox>}
      <div
        className="flex items-center gap-3 pt-2 text-[15px] font-bold text-muted"
        aria-hidden
      >
        <span className="h-px flex-1 bg-line" />
        {t("recipes.or")}
        <span className="h-px flex-1 bg-line" />
      </div>
      <Card className="flex items-start gap-3 bg-carrot-soft p-4">
        <Link2
          size={24}
          className="mt-0.5 shrink-0 text-carrot-dark"
          aria-hidden
        />
        <p className="text-[15px] font-bold">{t("recipes.importHint")}</p>
      </Card>
      <label className="block">
        <span className="mb-1 block text-[15px] font-bold">
          {t("recipes.importLabel")}
        </span>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={input.length > 200 ? 10 : 3}
          placeholder="https://…"
          autoCapitalize="off"
          autoCorrect="off"
          className="w-full rounded-2xl bg-paper px-4 py-3 ring-1 ring-line outline-none placeholder:text-muted/70 focus:ring-2 focus:ring-carrot"
        />
      </label>
      <div className="grid grid-cols-[auto_1fr] gap-3">
        <Button variant="secondary" onClick={paste}>
          <ClipboardPaste size={20} />
          {t("recipes.paste")}
        </Button>
        <Button onClick={() => prepare(input)} disabled={!input.trim()}>
          <Sparkles size={20} />
          {t("recipes.prepare")}
        </Button>
      </div>
    </div>
  );
}
