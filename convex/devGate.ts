// Entry password of the online test version (dev.menumaison.ch), set with
// scripts/set-dev-secrets.sh. Without DEV_SITE_PASSWORD (production), nobody
// gets a ticket: the gate fails closed.
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { reserve } from "./access";
import { sha256 } from "./lib";
import {
  DEV_GATE_LIMIT,
  DEV_GATE_MAX_LENGTH,
  sameText,
  ticketSource,
  type DevGateAnswer,
} from "./domain/devGate";

const ticketFor = (password: string) => sha256(ticketSource(password));

/** The password typed on the test site: a ticket to keep on the device, or why not. */
export const enter = mutation({
  args: { password: v.string() },
  handler: async (ctx, { password }): Promise<DevGateAnswer> => {
    const secret = process.env.DEV_SITE_PASSWORD;
    if (!secret) return { ok: false, reason: "closed" };
    if (!password || password.length > DEV_GATE_MAX_LENGTH)
      return { ok: false, reason: "wrong" };
    // Booked before the check: a success counts too, so parallel tries cannot slip past
    const slot = await reserve(ctx, "devgate:*", DEV_GATE_LIMIT, Date.now());
    if (!slot.allowed)
      return { ok: false, reason: "locked", retryAt: slot.retryAt };
    // Both hashed first: compared at the same length whatever was typed
    const expected = await ticketFor(secret);
    if (!sameText(await ticketFor(password), expected))
      return { ok: false, reason: "wrong" };
    return { ok: true, ticket: expected };
  },
});

/** Whether the ticket kept on this device still opens the test site. */
export const check = query({
  args: { ticket: v.string() },
  handler: async (_ctx, { ticket }) => {
    const secret = process.env.DEV_SITE_PASSWORD;
    if (!secret) return false;
    return sameText(ticket, await ticketFor(secret));
  },
});
