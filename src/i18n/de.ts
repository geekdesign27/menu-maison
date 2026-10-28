// German (Switzerland) texts, gathered from the zone files (src/i18n/zones).
import type { Messages } from "./fr";
import * as core from "./zones/core";
import * as week from "./zones/week";
import * as shopping from "./zones/shopping";
import * as recipes from "./zones/recipes";
import * as common from "./zones/common";
import * as admin from "./zones/admin";

export const de: Messages = {
  ...core.de,
  ...week.de,
  ...shopping.de,
  ...recipes.de,
  ...common.de,
  ...admin.de,
};
