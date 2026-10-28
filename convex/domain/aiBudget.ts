// AI budget of a family: what Claude and the dictation cost each month, and
// when a family has used up its share. Pure functions, tested with Vitest.
import { inTrial, TRIAL_CAPS, type Billing } from "./billing";

/** Claude Opus 5.5 list prices, USD per million tokens (checked 2026-10-28). */
export const CLAUDE_PRICES = { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 } as const;

export const DEFAULT_CAP_USD = 2;
/** Reserved before a Claude call (a receipt costs about 0.09 USD), settled with the real cost after. */
export const CLAUDE_ESTIMATE_USD = 0.1;
/** Counted when a usage cannot be read: errs on the side of the budget. */
export const UNKNOWN_COST_USD = 0.5;
export const DEFAULT_DICTATION_CAP = 60;

export type AiKind = "claude" | "dictation";

/** Products sent to Claude at most per list (catalogue in a prompt): bounds the cost of one call. */
export const MAX_CATALOG_IN_PROMPT = 1500;

export interface ClaudeUsage {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}

/** Cost of one Claude answer, from its `usage` (a fallback model is counted at the same prices). */
export function claudeCostUsd(usage: ClaudeUsage): number {
  const p = CLAUDE_PRICES;
  if (!Number.isFinite(usage.input_tokens) || !Number.isFinite(usage.output_tokens)) return UNKNOWN_COST_USD;
  return (
    (usage.input_tokens * p.input +
      usage.output_tokens * p.output +
      (usage.cache_read_input_tokens ?? 0) * p.cacheRead +
      (usage.cache_creation_input_tokens ?? 0) * p.cacheWrite) /
    1_000_000
  );
}

/** Budget month in Swiss time, « 2026-10 »: the counters start again on the 1st. */
export function budgetMonth(at: number): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Zurich",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date(at));
  const year = parts.find((p) => p.type === "year")!.value;
  const month = parts.find((p) => p.type === "month")!.value;
  return `${year}-${month}`;
}

export interface MonthUsage {
  claudeUsd: number;
  dictations: number;
}

export interface Caps {
  /** null: never blocked (the super-admin's family). */
  claudeUsd: number | null;
  dictations: number | null;
}

/**
 * The family's caps: its own settings, else the defaults; none for the
 * super-admin's family; lower ones during a free trial.
 */
export function capsOf(
  family: { aiCapUsd?: number; dictationCap?: number; offered?: boolean; billing?: Billing },
  unlimited: boolean,
): Caps {
  if (unlimited) return { claudeUsd: null, dictations: null };
  const claudeUsd = family.aiCapUsd ?? DEFAULT_CAP_USD;
  const dictations = family.dictationCap ?? DEFAULT_DICTATION_CAP;
  if (!inTrial(family)) return { claudeUsd, dictations };
  return {
    claudeUsd: Math.min(claudeUsd, TRIAL_CAPS.claudeUsd),
    dictations: Math.min(dictations, TRIAL_CAPS.dictations),
  };
}

export const CLAUDE_BUDGET_REACHED =
  "Le budget IA de ta famille pour ce mois est atteint. Il repart le 1er du mois prochain.";
export const DICTATIONS_REACHED =
  "Ta famille a utilisé toutes ses dictées de ce mois. Elles repartent le 1er du mois prochain.";

/** Why a new call is refused, or null. Checked before the call: one call may go slightly over. */
export function budgetProblem(kind: AiKind, used: MonthUsage, caps: Caps): string | null {
  if (kind === "claude")
    return caps.claudeUsd !== null && used.claudeUsd >= caps.claudeUsd ? CLAUDE_BUDGET_REACHED : null;
  return caps.dictations !== null && used.dictations >= caps.dictations ? DICTATIONS_REACHED : null;
}
