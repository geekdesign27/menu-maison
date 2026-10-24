import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/** Base units used for quantities. Aggregation converts kg→g and l→ml. */
export const unitValidator = v.union(
  v.literal("g"),
  v.literal("kg"),
  v.literal("ml"),
  v.literal("l"),
  v.literal("pc"),
  v.literal("cs"), // cuillère à soupe
  v.literal("cc"), // cuillère à café
  v.literal("botte"),
  v.literal("boîte"),
  v.literal("paquet"),
  v.literal("pincée"),
  v.literal("tranche"),
);

export const slotValidator = v.union(v.literal("matin"), v.literal("midi"), v.literal("soir"));

/** Data borrowed from an Open Food Facts product; the ingredient itself stays generic. */
export const offValidator = v.object({
  code: v.string(), // barcode
  productName: v.string(), // for reference only, never shown as a brand to buy
  allergens: v.array(v.string()), // Open Food Facts tags, e.g. "en:gluten"
  nutriscore: v.optional(v.union(v.literal("a"), v.literal("b"), v.literal("c"), v.literal("d"), v.literal("e"))),
  // Per 100 g, or per 100 ml for drinks
  per100: v.optional(
    v.object({
      kcal: v.optional(v.number()),
      fat: v.optional(v.number()),
      saturatedFat: v.optional(v.number()),
      carbs: v.optional(v.number()),
      sugars: v.optional(v.number()),
      fiber: v.optional(v.number()),
      proteins: v.optional(v.number()),
      salt: v.optional(v.number()),
    }),
  ),
  fetchedAt: v.number(),
});

export const chainValidator = v.union(
  v.literal("Aldi"),
  v.literal("Lidl"),
  v.literal("Coop"),
  v.literal("Migros"),
  v.literal("Denner"),
  v.literal("Autre"),
);

export default defineSchema({
  /** Family members (profiles picked on the home screen). */
  members: defineTable({
    name: v.string(),
    emoji: v.string(),
    color: v.string(), // hex, used for avatar backgrounds
    order: v.number(),
    imageId: v.optional(v.id("_storage")), // profile photo, shown instead of the emoji
  }),

  /** Generic aisles (rayons). Each store orders them its own way. */
  aisles: defineTable({
    name: v.string(),
    emoji: v.string(),
    order: v.number(), // default order when no store is selected
  }),

  ingredients: defineTable({
    name: v.string(),
    aisleId: v.id("aisles"),
    unit: unitValidator, // unit used in recipes and on the list
    // Estimated price in CHF for `priceQty` of `unit` (e.g. 3.50 CHF for 1000 g)
    priceChf: v.optional(v.number()),
    priceQty: v.optional(v.number()),
    pantry: v.optional(v.boolean()), // usually in stock at home (spices, oil, rice…)
    // Bought by the pack: how much of `unit` one pack holds (8 slices, 200 g…)
    packSize: v.optional(v.number()),
    onlyChains: v.optional(v.array(chainValidator)), // sold only by these chains (julienne: Coop)
    imageId: v.optional(v.id("_storage")), // photo of the exact product to buy
    off: v.optional(offValidator), // photo, allergens and nutrition from Open Food Facts
  }).index("by_name", ["name"]),

  recipes: defineTable({
    name: v.string(),
    emoji: v.string(),
    description: v.optional(v.string()),
    tags: v.array(v.string()),
    prepMinutes: v.number(),
    fridgeDays: v.number(), // how many days leftovers keep in the fridge
    defaultPersons: v.optional(v.number()), // usual servings (1 for a personal breakfast); else the household default
    // Quantities are per person; the list multiplies by the planned persons
    items: v.array(
      v.object({
        ingredientId: v.id("ingredients"),
        qtyPerPerson: v.number(),
        unit: unitValidator,
      }),
    ),
    steps: v.array(v.string()),
    imageId: v.optional(v.id("_storage")), // photo taken by the family
    // true once the family keeps it ("Nos recettes"); catalog recipes start false
    saved: v.boolean(),
    archived: v.boolean(),
    createdBy: v.optional(v.id("members")),
  }),

  /** One heart per member and recipe. */
  likes: defineTable({
    recipeId: v.id("recipes"),
    memberId: v.id("members"),
  })
    .index("by_recipe", ["recipeId"])
    .index("by_member", ["memberId"]),

  stores: defineTable({
    chain: chainValidator,
    name: v.string(), // e.g. "Aldi Marly"
    aisleOrder: v.array(v.id("aisles")), // walking order through the store
    // Per-store exceptions: this ingredient sits in another aisle here
    overrides: v.array(
      v.object({ ingredientId: v.id("ingredients"), aisleId: v.id("aisles") }),
    ),
    priceFactor: v.number(), // 1 = average; 0.85 = cheaper chain
    archived: v.boolean(),
  }),

  /**
   * One planned dish. Cooking for tonight and tomorrow's lunch creates two
   * meals sharing the same `cookedOn` date: quantities add up on the list.
   */
  meals: defineTable({
    date: v.string(), // YYYY-MM-DD, day it is eaten
    slot: slotValidator,
    recipeId: v.optional(v.id("recipes")),
    title: v.optional(v.string()), // free text when no recipe (restaurant, pizza…)
    persons: v.number(), // portions eaten at this meal
    extraPortions: v.optional(v.number()), // portions cooked on top for the fridge (bought too)
    cookedOn: v.string(), // YYYY-MM-DD, day it is prepared
    // Leftover meals reuse food already cooked: never added to the shopping list
    fromLeftoverOf: v.optional(v.id("meals")),
    status: v.union(
      v.literal("prévu"),
      v.literal("mangé"),
      v.literal("pas mangé"),
    ),
    // Portions left in the fridge after this meal (0 = nothing left)
    leftoverPortions: v.number(),
  })
    .index("by_date", ["date"])
    .index("by_recipe", ["recipeId"]),

  /** Usual weeks ("menus types"), applied onto a planning week. */
  templates: defineTable({
    name: v.string(),
    entries: v.array(
      v.object({
        dayOffset: v.number(), // 0 = first day of the planning week
        slot: slotValidator,
        recipeId: v.id("recipes"),
        persons: v.number(),
        extraPortions: v.optional(v.number()),
        cookedDayOffset: v.number(), // usually dayOffset, or dayOffset-1 for a lunch cooked the evening before
      }),
    ),
  }),

  /** Check state of a shopping list item, keyed by period + item key. */
  shoppingChecks: defineTable({
    periodStart: v.string(),
    itemKey: v.string(), // "ing:<ingredientId>:<baseUnit>" or "extra:<extraId>"
    checked: v.boolean(),
    checkedBy: v.optional(v.id("members")),
    checkedAt: v.optional(v.number()),
  }).index("by_period", ["periodStart"]),

  /** Free items added to a shopping period (lessive, café…). */
  shoppingExtras: defineTable({
    periodStart: v.string(),
    label: v.string(),
    qty: v.optional(v.number()),
    unit: v.optional(unitValidator),
    aisleId: v.optional(v.id("aisles")),
    addedBy: v.optional(v.id("members")),
    stapleId: v.optional(v.id("staples")),
  }).index("by_period", ["periodStart"]),

  /** Usual non-recipe items (toilet paper, washing powder…), offered first when adding. */
  staples: defineTable({
    name: v.string(),
    aisleId: v.optional(v.id("aisles")),
    useCount: v.number(),
    lastUsedAt: v.optional(v.number()),
    // Last quantity used, proposed again next time
    qty: v.optional(v.number()),
    unit: v.optional(unitValidator),
    priceChf: v.optional(v.number()), // price of one item
    onlyChains: v.optional(v.array(chainValidator)),
    imageId: v.optional(v.id("_storage")), // photo of the exact product to buy
  }).index("by_name", ["name"]),

  /** Items already at home for a shopping week: kept out of the list. */
  stockSkips: defineTable({
    periodStart: v.string(),
    itemKey: v.string(),
  }).index("by_period", ["periodStart"]),

  /** "Envies": dishes someone feels like eating soon. */
  wishes: defineTable({
    memberId: v.id("members"),
    recipeId: v.optional(v.id("recipes")),
    text: v.optional(v.string()),
    done: v.boolean(),
    createdAt: v.number(),
  }),

  /** Single-row settings. */
  settings: defineTable({
    shoppingDay: v.number(), // 0 = Sunday … 6 = Saturday; planning weeks start that day
    defaultStoreId: v.optional(v.id("stores")),
    defaultPersons: v.number(),
  }),

  /** Device sessions opened with the family code (token kept in localStorage). */
  sessions: defineTable({
    token: v.string(), // SHA-256 of the device token, never the token itself
    codeHash: v.optional(v.string()), // fingerprint of FAMILY_CODE at login
    createdAt: v.number(),
    expiresAt: v.number(),
  }).index("by_token", ["token"]),

  /** Brute-force guard on the family code (one row). */
  accessGuard: defineTable({
    failures: v.number(),
    lastFailureAt: v.optional(v.number()),
    lockedUntil: v.number(),
  }),
});
