import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { deviceOf, isBot, isClientEvent, sourceOf } from "./domain/visits";

const http = httpRouter();

// Stripe's webhook: the raw body and its signature go to the Node action that
// checks them (convex/stripeNode.ts). URL to give Stripe:
// https://<deployment>.convex.site/stripe/webhook
http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const signature = request.headers.get("stripe-signature");
    if (!signature) return new Response("Missing signature", { status: 400 });
    const payload = await request.text();
    // Stripe events are small; anything bigger is not Stripe
    if (payload.length > 1_000_000)
      return new Response("Too large", { status: 413 });
    const result = await ctx.runAction(internal.stripeNode.handleWebhook, {
      payload,
      signature,
    });
    return new Response(result.ok ? "ok" : "refused", {
      status: result.status,
    });
  }),
});

// Visit statistics from the landing page (src/lib/visits.ts),
// sent with navigator.sendBeacon: no cookie, no visitor id, counters only
http.route({
  path: "/stats",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const done = new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*" } });
    const userAgent = request.headers.get("user-agent");
    if (isBot(userAgent)) return done;
    // Refused before reading: a beacon is a few dozen bytes
    if (Number(request.headers.get("content-length") ?? 0) > 1000)
      return new Response("Too large", { status: 413 });
    const text = await request.text();
    if (text.length > 1000) return new Response("Too large", { status: 413 });
    let body: { event?: unknown; lang?: unknown; ref?: unknown; utm?: unknown };
    try {
      body = JSON.parse(text);
    } catch {
      return new Response("Bad request", { status: 400 });
    }
    if (!isClientEvent(body.event) || (body.lang !== "fr" && body.lang !== "de"))
      return new Response("Bad request", { status: 400 });
    await ctx.runMutation(internal.visits.record, {
      event: body.event,
      lang: body.lang,
      device: deviceOf(userAgent),
      source: sourceOf(
        typeof body.ref === "string" ? body.ref : null,
        typeof body.utm === "string" ? body.utm : null,
      ),
    });
    return done;
  }),
});

export default http;
