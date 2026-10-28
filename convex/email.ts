// Sending e-mails through Resend (RESEND_API_KEY, EMAIL_FROM), each one once:
// a key per event in `emailLog`, so a Stripe event received twice or a daily
// check run again never sends it twice. Without key, nothing leaves (logged).
import {
  internalAction,
  internalMutation,
  type MutationCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { renderEmail, type EmailData, type EmailKind } from "./domain/emails";
import type { Lang } from "./domain/lang";

const RESEND_URL = "https://api.resend.com/emails";
const DEFAULT_FROM = "Menu Maison <bonjour@menumaison.ch>";
const MAX_ATTEMPTS = 3;
const RETRY_MS = [60_000, 10 * 60_000];

const kindValidator = v.union(
  v.literal("welcome"),
  v.literal("trialEnding"),
  v.literal("confirmed"),
  v.literal("paymentFailed"),
  v.literal("canceled"),
  v.literal("adminSignup"),
  v.literal("adminConverted"),
  v.literal("adminCanceled"),
  v.literal("adminPaymentFailed"),
);

export const dataValidator = v.object({
  familyName: v.string(),
  adminName: v.string(),
  date: v.optional(v.string()),
  link: v.optional(v.string()),
  loginLink: v.optional(v.string()),
  email: v.optional(v.string()),
  lang: v.optional(v.union(v.literal("fr"), v.literal("de"))),
  subscribers: v.optional(v.number()),
});

/** The app's address in links (SITE_URL), https://menumaison.ch by default. */
export function siteUrl() {
  return (process.env.SITE_URL ?? "https://menumaison.ch").replace(/\/+$/, "");
}

/**
 * Queues an e-mail once per `key`; `to` may be missing (no address known):
 * then nothing is sent. PA's alerts go to ADMIN_ALERT_EMAIL.
 */
export async function sendOnce(
  ctx: MutationCtx,
  mail: {
    kind: EmailKind;
    key: string;
    to?: string | null;
    lang: Lang;
    data: EmailData;
    familyId?: Id<"families">;
  },
) {
  const to = mail.kind.startsWith("admin")
    ? process.env.ADMIN_ALERT_EMAIL
    : mail.to;
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return;
  const seen = await ctx.db
    .query("emailLog")
    .withIndex("by_key", (q) => q.eq("key", mail.key))
    .unique();
  if (seen) return;
  const logId = await ctx.db.insert("emailLog", {
    key: mail.key,
    kind: mail.kind,
    familyId: mail.familyId,
    status: "queued",
    at: Date.now(),
  });
  await ctx.scheduler.runAfter(0, internal.email.deliver, {
    logId,
    kind: mail.kind,
    to,
    lang: mail.lang,
    data: mail.data,
  });
}

/** Sends one e-mail through Resend and records the result (never the content). */
export const deliver = internalAction({
  args: {
    logId: v.id("emailLog"),
    kind: kindValidator,
    to: v.string(),
    lang: v.union(v.literal("fr"), v.literal("de")),
    data: dataValidator,
    attempt: v.optional(v.number()),
  },
  handler: async (ctx, { logId, kind, to, lang, data, attempt = 1 }) => {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      await ctx.runMutation(internal.email.markDelivered, {
        logId,
        status: "skipped",
      });
      return;
    }
    const mail = renderEmail(kind, data, lang);
    let status: "sent" | "failed" = "failed";
    try {
      const response = await fetch(RESEND_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM ?? DEFAULT_FROM,
          to: [to],
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
        }),
        signal: AbortSignal.timeout(20_000),
      });
      status = response.ok ? "sent" : "failed";
      // The kind and the HTTP status only: never the address or the content
      if (!response.ok) console.log("email failed", kind, response.status);
    } catch {
      console.log("email failed", kind, "network");
    }
    // Resend unavailable: tried again after 1 minute, then 10 minutes
    if (status === "failed" && attempt < MAX_ATTEMPTS) {
      await ctx.scheduler.runAfter(RETRY_MS[attempt - 1], internal.email.deliver, {
        logId,
        kind,
        to,
        lang,
        data,
        attempt: attempt + 1,
      });
      return;
    }
    await ctx.runMutation(internal.email.markDelivered, { logId, status });
  },
});

export const markDelivered = internalMutation({
  args: {
    logId: v.id("emailLog"),
    status: v.union(
      v.literal("sent"),
      v.literal("failed"),
      v.literal("skipped"),
    ),
  },
  handler: async (ctx, { logId, status }) => {
    await ctx.db.patch(logId, { status });
  },
});
