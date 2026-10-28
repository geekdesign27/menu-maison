// The signed-in member's current password, asked again before a sensitive
// action (new password, new e-mail, deleting the family). Shared by plain and
// Node actions; counted like sign-ins (5 tries per 10 minutes per member).
import type { ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { ConvexError } from "convex/values";
import { verifyPassword } from "./domain/auth";

export const WRONG_PASSWORD = "Mot de passe actuel incorrect.";

export async function checkPassword(
  ctx: ActionCtx,
  memberId: Id<"members">,
  passwordHash: string,
  password: string,
) {
  if (!password || password.length > 200) throw new ConvexError(WRONG_PASSWORD);
  const allowed = await ctx.runMutation(internal.account.beginPasswordCheck, {
    memberId,
  });
  if (!allowed)
    throw new ConvexError("Trop d'essais. Réessaie dans quelques minutes.");
  if (!(await verifyPassword(password, passwordHash)))
    throw new ConvexError(WRONG_PASSWORD);
  // The right password: its tries are forgotten (several changes in a row stay possible)
  await ctx.runMutation(internal.account.endPasswordCheck, { memberId });
}
