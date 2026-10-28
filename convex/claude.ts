import Anthropic from "@anthropic-ai/sdk";
import { ConvexError } from "convex/values";
import type { ActionCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { reserveCall, settleClaude } from "./aiBudget";
import { claudeCostUsd } from "./domain/aiBudget";

const MODEL = "claude-opus-5-5";

/** Messages shown to the family, specific to each use (receipt, recipe…). */
export interface ClaudeMessages {
  missingKey: string;
  refusal: string;
  tooLong: string;
  failed: string;
  busy: string;
}

/**
 * One structured call to Claude: the answer follows `schema` and comes back as
 * parsed JSON. Errors become ConvexErrors with the given French messages; the
 * model's text is never quoted in an error. Every call goes through the
 * family's monthly budget: refused once it is used up, counted once answered.
 */
export async function askClaude({
  ctx,
  familyId,
  label,
  system,
  content,
  schema,
  maxTokens,
  messages,
}: {
  ctx: ActionCtx;
  familyId: Id<"families">;
  label: string; // for the cost line in the Convex logs
  system: string;
  content: Anthropic.Beta.BetaContentBlockParam[];
  schema: Record<string, unknown>;
  maxTokens: number;
  messages: ClaudeMessages;
}): Promise<unknown> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new ConvexError(messages.missingKey);
  await reserveCall(ctx, familyId, "claude");
  const client = new Anthropic({ apiKey });
  let text = "";
  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema },
      },
      system,
      messages: [{ role: "user", content }],
    });
    // Tokens only, to follow the cost of each call in the Convex logs
    console.log(label, JSON.stringify(response.usage));
    // Paid even when the answer is then refused or unreadable
    await settleClaude(ctx, familyId, claudeCostUsd(response.usage));
    if (response.stop_reason === "refusal")
      throw new ConvexError(messages.refusal);
    if (response.stop_reason === "max_tokens")
      throw new ConvexError(messages.tooLong);
    for (const block of response.content)
      if (block.type === "text") text += block.text;
  } catch (e) {
    if (e instanceof ConvexError) throw e;
    if (e instanceof Anthropic.AuthenticationError)
      throw new ConvexError(
        "La clé ANTHROPIC_API_KEY est refusée par Anthropic.",
      );
    if (e instanceof Anthropic.RateLimitError)
      throw new ConvexError(messages.busy);
    throw new ConvexError(messages.failed);
  }
  try {
    return JSON.parse(text);
  } catch {
    // A JSON syntax error would quote the model's reply: keep a fixed message
    throw new ConvexError("Réponse illisible.");
  }
}
