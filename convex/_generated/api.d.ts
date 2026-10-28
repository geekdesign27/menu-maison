/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as access from "../access.js";
import type * as catalog from "../catalog.js";
import type * as claude from "../claude.js";
import type * as crons from "../crons.js";
import type * as domain_auth from "../domain/auth.js";
import type * as domain_dates from "../domain/dates.js";
import type * as domain_leftovers from "../domain/leftovers.js";
import type * as domain_openFoodFacts from "../domain/openFoodFacts.js";
import type * as domain_products from "../domain/products.js";
import type * as domain_quantities from "../domain/quantities.js";
import type * as domain_receipts from "../domain/receipts.js";
import type * as domain_recipeImport from "../domain/recipeImport.js";
import type * as domain_shopping from "../domain/shopping.js";
import type * as domain_sort from "../domain/sort.js";
import type * as domain_stats from "../domain/stats.js";
import type * as domain_tags from "../domain/tags.js";
import type * as domain_text from "../domain/text.js";
import type * as families from "../families.js";
import type * as homeStock from "../homeStock.js";
import type * as lib from "../lib.js";
import type * as meals from "../meals.js";
import type * as openFoodFacts from "../openFoodFacts.js";
import type * as products from "../products.js";
import type * as receipts from "../receipts.js";
import type * as recipeImport from "../recipeImport.js";
import type * as recipes from "../recipes.js";
import type * as seed from "../seed.js";
import type * as seedData from "../seedData.js";
import type * as shopping from "../shopping.js";
import type * as staples from "../staples.js";
import type * as stats from "../stats.js";
import type * as superadmin from "../superadmin.js";
import type * as templates from "../templates.js";
import type * as wishes from "../wishes.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  access: typeof access;
  catalog: typeof catalog;
  claude: typeof claude;
  crons: typeof crons;
  "domain/auth": typeof domain_auth;
  "domain/dates": typeof domain_dates;
  "domain/leftovers": typeof domain_leftovers;
  "domain/openFoodFacts": typeof domain_openFoodFacts;
  "domain/products": typeof domain_products;
  "domain/quantities": typeof domain_quantities;
  "domain/receipts": typeof domain_receipts;
  "domain/recipeImport": typeof domain_recipeImport;
  "domain/shopping": typeof domain_shopping;
  "domain/sort": typeof domain_sort;
  "domain/stats": typeof domain_stats;
  "domain/tags": typeof domain_tags;
  "domain/text": typeof domain_text;
  families: typeof families;
  homeStock: typeof homeStock;
  lib: typeof lib;
  meals: typeof meals;
  openFoodFacts: typeof openFoodFacts;
  products: typeof products;
  receipts: typeof receipts;
  recipeImport: typeof recipeImport;
  recipes: typeof recipes;
  seed: typeof seed;
  seedData: typeof seedData;
  shopping: typeof shopping;
  staples: typeof staples;
  stats: typeof stats;
  superadmin: typeof superadmin;
  templates: typeof templates;
  wishes: typeof wishes;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
