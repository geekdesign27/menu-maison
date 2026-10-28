import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

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

export default http;
