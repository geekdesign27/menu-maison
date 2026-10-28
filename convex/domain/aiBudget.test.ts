import { describe, expect, it } from "vitest";
import {
  budgetMonth,
  budgetProblem,
  capsOf,
  claudeCostUsd,
  CLAUDE_BUDGET_REACHED,
  DICTATIONS_REACHED,
} from "./aiBudget";

describe("AI budget", () => {
  it("prices a Claude answer from its tokens", () => {
    // A receipt: about 6000 tokens read, 2000 written
    expect(claudeCostUsd({ input_tokens: 6000, output_tokens: 2000 })).toBeCloseTo(0.064, 6);
    expect(claudeCostUsd({ input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 1_000_000 })).toBeCloseTo(0.2, 6);
    expect(claudeCostUsd({ input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: null })).toBe(0);
    // An unreadable usage is counted high, never as NaN (which would lift the cap)
    expect(claudeCostUsd({ input_tokens: NaN, output_tokens: 10 })).toBe(0.5);
  });

  it("counts months in Swiss time", () => {
    // 31 October 23:30 UTC is already 1 November in Switzerland (UTC+1)
    expect(budgetMonth(Date.UTC(2026, 9, 31, 23, 30))).toBe("2026-11");
    expect(budgetMonth(Date.UTC(2026, 9, 31, 22, 30))).toBe("2026-10");
  });

  it("uses the family's caps, the defaults, or none for the super-admin's family", () => {
    expect(capsOf({}, false)).toEqual({ claudeUsd: 2, dictations: 60 });
    expect(capsOf({ aiCapUsd: 5, dictationCap: 10 }, false)).toEqual({ claudeUsd: 5, dictations: 10 });
    expect(capsOf({ aiCapUsd: 5 }, true)).toEqual({ claudeUsd: null, dictations: null });
  });

  it("refuses a new call once the cap is reached, never without a cap", () => {
    const caps = { claudeUsd: 2, dictations: 60 };
    expect(budgetProblem("claude", { claudeUsd: 1.99, dictations: 0 }, caps)).toBeNull();
    expect(budgetProblem("claude", { claudeUsd: 2, dictations: 0 }, caps)).toBe(CLAUDE_BUDGET_REACHED);
    expect(budgetProblem("dictation", { claudeUsd: 5, dictations: 59 }, caps)).toBeNull();
    expect(budgetProblem("dictation", { claudeUsd: 0, dictations: 60 }, caps)).toBe(DICTATIONS_REACHED);
    expect(budgetProblem("claude", { claudeUsd: 99, dictations: 999 }, { claudeUsd: null, dictations: null })).toBeNull();
  });
});
