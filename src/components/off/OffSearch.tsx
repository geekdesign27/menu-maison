import { useEffect, useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Nutriscore, OffHit } from "../../../convex/domain/openFoodFacts";
import { useSession } from "../../lib/session";
import { errorMessage } from "../../lib/format";
import { searchKey } from "../../lib/text";
import { cx, SearchInput, Sheet } from "../ui";
import { useT } from "../../i18n/useT";

// Open Food Facts allows about ten searches a minute: wait for a pause in
// typing, need a few letters and never ask twice for the same words.
const DEBOUNCE_MS = 800;
const MIN_LETTERS = 3;
const cache = new Map<string, OffHit[]>();

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; hits: OffHit[] }
  | { status: "error"; message: string };

export function useOffSearch(query: string): SearchState {
  const { token } = useSession();
  const search = useAction(api.openFoodFacts.search);
  const { lang } = useT();
  const key = searchKey(query);
  const [state, setState] = useState<SearchState>({ status: "idle" });

  useEffect(() => {
    if (key.length < MIN_LETTERS) {
      setState({ status: "idle" });
      return;
    }
    const cached = cache.get(key);
    if (cached) {
      setState({ status: "done", hits: cached });
      return;
    }
    let stale = false;
    setState({ status: "loading" });
    const timer = setTimeout(() => {
      search({ token, query: key })
        .then((hits) => {
          cache.set(key, hits);
          if (!stale) setState({ status: "done", hits });
        })
        .catch(
          (e) =>
            !stale &&
            setState({ status: "error", message: errorMessage(e, lang) }),
        );
    }, DEBOUNCE_MS);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [key, search, token, lang]);

  return state;
}

const NUTRISCORE_COLORS: Record<Nutriscore, string> = {
  a: "#038141",
  b: "#85bb2f",
  c: "#fecb02",
  d: "#ee8100",
  e: "#e63e11",
};

export function NutriscoreBadge({
  grade,
  size = "sm",
}: {
  grade: Nutriscore;
  size?: "sm" | "md";
}) {
  return (
    <span
      title={`Nutri-Score ${grade.toUpperCase()}`}
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-md font-black",
        size === "sm"
          ? "h-6 min-w-6 px-1 text-[13px]"
          : "h-8 min-w-8 px-1.5 text-[17px]",
        grade === "c" ? "text-ink" : "text-white",
      )}
      style={{ background: NUTRISCORE_COLORS[grade] }}
    >
      <span className="sr-only">Nutri-Score </span>
      {grade.toUpperCase()}
    </span>
  );
}

/** Results of an Open Food Facts search; `onChoose` receives the tapped product. */
export function OffResults({
  query,
  onChoose,
  busyCode,
}: {
  query: string;
  onChoose: (hit: OffHit) => void;
  /** Product being imported: its row shows a waiting state. */
  busyCode?: string | null;
}) {
  const state = useOffSearch(query);
  const { t } = useT();
  if (state.status === "idle") return null;
  return (
    <section
      aria-label={t("recipes.offProducts")}
      aria-busy={state.status === "loading"}
    >
      <h3 className="mt-2 mb-2 px-1 text-[13px] font-extrabold tracking-wide text-muted uppercase">
        {t("recipes.offOn")}
      </h3>
      {state.status === "loading" && (
        <p className="rounded-2xl bg-paper px-4 py-3 text-[15px] text-muted ring-1 ring-line">
          {t("recipes.offSearching")}
        </p>
      )}
      {state.status === "error" && (
        <p
          role="alert"
          className="rounded-2xl bg-berry-soft px-4 py-3 text-[15px] font-semibold text-berry"
        >
          {state.message}
        </p>
      )}
      {state.status === "done" && state.hits.length === 0 && (
        <p className="rounded-2xl bg-paper px-4 py-3 text-[15px] text-muted ring-1 ring-line">
          {t("recipes.offNoResult")}
        </p>
      )}
      {state.status === "done" && state.hits.length > 0 && (
        <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-paper">
          {state.hits.map((hit) => (
            <li key={hit.code}>
              <button
                type="button"
                disabled={!!busyCode}
                onClick={() => onChoose(hit)}
                className="flex min-h-16 w-full items-center gap-3 px-3 py-2 text-left active:bg-carrot-soft disabled:opacity-60"
              >
                {hit.thumbUrl ? (
                  <img
                    src={hit.thumbUrl}
                    alt=""
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="size-12 shrink-0 rounded-lg bg-white object-contain"
                  />
                ) : (
                  <span
                    className="size-12 shrink-0 rounded-lg bg-cream"
                    aria-hidden
                  />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">
                    {hit.productName}
                  </span>
                  {hit.brands.length > 0 && (
                    <span className="block truncate text-[13px] text-muted">
                      {hit.brands.join(", ")}
                    </span>
                  )}
                </span>
                {busyCode === hit.code ? (
                  <span className="text-[13px] font-bold text-muted">
                    {t("recipes.offImporting")}
                  </span>
                ) : (
                  hit.nutriscore && <NutriscoreBadge grade={hit.nutriscore} />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 px-1 text-[13px] text-muted">
        {t("recipes.offDisclaimer")}
      </p>
    </section>
  );
}

/** Sheet searching Open Food Facts for an existing ingredient. */
export function OffPickSheet({
  initialQuery,
  busyCode,
  onChoose,
  onClose,
}: {
  initialQuery: string;
  busyCode?: string | null;
  onChoose: (hit: OffHit) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  const { t } = useT();
  return (
    <Sheet open onClose={onClose} title={t("recipes.offSearchTitle")}>
      <div className="space-y-3">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder={t("recipes.offProductName")}
        />
        <OffResults query={query} onChoose={onChoose} busyCode={busyCode} />
      </div>
    </Sheet>
  );
}
