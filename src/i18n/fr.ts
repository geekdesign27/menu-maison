// French texts of the app, the reference, gathered from the zone files
// (src/i18n/zones). « {name} » is replaced by `t`.
import * as core from "./zones/core";
import * as week from "./zones/week";
import * as shopping from "./zones/shopping";
import * as recipes from "./zones/recipes";
import * as common from "./zones/common";
import * as admin from "./zones/admin";
import * as gate from "./zones/gate";

export const fr = {
  ...core.fr,
  ...week.fr,
  ...shopping.fr,
  ...recipes.fr,
  ...common.fr,
  ...admin.fr,
  ...gate.fr,
};

export type MessageKey = keyof typeof fr;
export type Messages = Record<MessageKey, string>;
