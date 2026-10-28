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

export const slotValidator = v.union(
  v.literal("matin"),
  v.literal("midi"),
  v.literal("soir"),
);

/** Data borrowed from an Open Food Facts product; the ingredient itself stays generic. */
export const offValidator = v.object({
  code: v.string(), // barcode
  productName: v.string(), // for reference only, never shown as a brand to buy
  allergens: v.array(v.string()), // Open Food Facts tags, e.g. "en:gluten"
  nutriscore: v.optional(
    v.union(
      v.literal("a"),
      v.literal("b"),
      v.literal("c"),
      v.literal("d"),
      v.literal("e"),
    ),
  ),
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

export const themeValidator = v.union(
  v.literal("carotte"),
  v.literal("sauge"),
  v.literal("myrtille"),
);
export const fontValidator = v.union(
  v.literal("nunito"),
  v.literal("quicksand"),
  v.literal("lexend"),
  v.literal("atkinson"),
);
export const roleValidator = v.union(v.literal("admin"), v.literal("membre"));
// Language of the app for one profile; French for everyone unless set
export const langValidator = v.union(v.literal("fr"), v.literal("de"));
// « pas mangé »: cooked, not eaten (the dish goes to the fridge);
// « pas cuisiné »: never cooked (bought ingredients stay at home, see homeStock)
export const mealStatusValidator = v.union(
  v.literal("prévu"),
  v.literal("mangé"),
  v.literal("pas mangé"),
  v.literal("pas cuisiné"),
);

const familyId = v.id("families");

export default defineSchema({
  /** One household. Everything else belongs to exactly one family. */
  families: defineTable({
    name: v.string(), // « Famille Schütz »
    slug: v.string(), // in the sign-in link: menumaison.ch/#/f/schutz
    suspended: v.boolean(),
    aiCapUsd: v.optional(v.number()), // monthly Claude budget set by the super-admin
    createdAt: v.number(),
  }).index("by_slug", ["slug"]),

  /** Family members (profiles picked on the home screen). */
  members: defineTable({
    familyId,
    name: v.string(),
    emoji: v.string(),
    color: v.string(), // hex, used for avatar backgrounds
    order: v.number(),
    imageId: v.optional(v.id("_storage")), // profile photo, shown instead of the emoji
    // Sign-in, only for members who have an account (young children may not)
    username: v.optional(v.string()), // unique within the family, lowercase
    passwordHash: v.optional(v.string()), // "pbkdf2-sha256$<iterations>$<salt>$<hash>"
    role: v.optional(roleValidator),
    superadmin: v.optional(v.boolean()), // manages every family (PA)
    lang: v.optional(langValidator), // set by an admin or the member; absent = French
    // Welcome tour finished or skipped; 0 = account older than the guide (see domain/onboarding)
    onboardingDoneAt: v.optional(v.number()),
  })
    .index("by_family", ["familyId"])
    .index("by_family_username", ["familyId", "username"]),

  /** Generic aisles (rayons). Each store orders them its own way. */
  aisles: defineTable({
    familyId,
    name: v.string(),
    emoji: v.string(),
    order: v.number(), // default order when no store is selected
  }).index("by_family", ["familyId"]),

  ingredients: defineTable({
    familyId,
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
  })
    .index("by_family", ["familyId"])
    .index("by_family_name", ["familyId", "name"]),

  recipes: defineTable({
    familyId,
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
    sourceUrl: v.optional(v.string()), // page the recipe was imported from
    // true once the family keeps it ("Nos recettes"); catalog recipes start false
    saved: v.boolean(),
    archived: v.boolean(),
    createdBy: v.optional(v.id("members")),
  }).index("by_family", ["familyId"]),

  /** One heart per member and recipe. */
  likes: defineTable({
    familyId,
    recipeId: v.id("recipes"),
    memberId: v.id("members"),
  })
    .index("by_family", ["familyId"])
    .index("by_recipe", ["recipeId"])
    .index("by_member", ["memberId"]),

  stores: defineTable({
    familyId,
    chain: chainValidator,
    name: v.string(), // e.g. "Aldi Marly"
    aisleOrder: v.array(v.id("aisles")), // walking order through the store
    // Per-store exceptions: this ingredient sits in another aisle here
    overrides: v.array(
      v.object({ ingredientId: v.id("ingredients"), aisleId: v.id("aisles") }),
    ),
    priceFactor: v.number(), // 1 = average; 0.85 = cheaper chain
    archived: v.boolean(),
  }).index("by_family", ["familyId"]),

  /**
   * One planned dish. Cooking for tonight and tomorrow's lunch creates two
   * meals sharing the same `cookedOn` date: quantities add up on the list.
   */
  meals: defineTable({
    familyId,
    date: v.string(), // YYYY-MM-DD, day it is eaten
    slot: slotValidator,
    recipeId: v.optional(v.id("recipes")),
    title: v.optional(v.string()), // free text when no recipe (restaurant, pizza…)
    persons: v.number(), // portions eaten at this meal
    extraPortions: v.optional(v.number()), // portions cooked on top for the fridge (bought too)
    cookedOn: v.string(), // YYYY-MM-DD, day it is prepared
    // Leftover meals reuse food already cooked: never added to the shopping list
    fromLeftoverOf: v.optional(v.id("meals")),
    status: mealStatusValidator,
    // Portions left in the fridge after this meal (0 = nothing left)
    leftoverPortions: v.number(),
    // Who planned it and who last set its status: ticks the « Premiers pas » checklist
    addedBy: v.optional(v.id("members")),
    statusBy: v.optional(v.id("members")),
  })
    .index("by_family", ["familyId"])
    .index("by_family_date", ["familyId", "date"])
    .index("by_recipe", ["recipeId"]),

  /** Usual weeks ("menus types"), applied onto a planning week. */
  templates: defineTable({
    familyId,
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
  }).index("by_family", ["familyId"]),

  /** Check state of a shopping list item, keyed by period + item key. */
  shoppingChecks: defineTable({
    familyId,
    periodStart: v.string(),
    itemKey: v.string(), // "ing:<ingredientId>:<baseUnit>" or "extra:<extraId>"
    checked: v.boolean(),
    checkedBy: v.optional(v.id("members")),
    checkedAt: v.optional(v.number()),
  })
    .index("by_family", ["familyId"])
    .index("by_family_period", ["familyId", "periodStart"]),

  /** Free items added to a shopping period (lessive, café…). */
  shoppingExtras: defineTable({
    familyId,
    periodStart: v.string(),
    label: v.string(),
    qty: v.optional(v.number()),
    unit: v.optional(unitValidator),
    aisleId: v.optional(v.id("aisles")),
    addedBy: v.optional(v.id("members")),
    stapleId: v.optional(v.id("staples")),
  })
    .index("by_family", ["familyId"])
    .index("by_family_period", ["familyId", "periodStart"]),

  /** Usual non-recipe items (toilet paper, washing powder…), offered first when adding. */
  staples: defineTable({
    familyId,
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
  })
    .index("by_family", ["familyId"])
    .index("by_family_name", ["familyId", "name"]),

  /** Items already at home for a shopping week: kept out of the list. */
  stockSkips: defineTable({
    familyId,
    periodStart: v.string(),
    itemKey: v.string(),
  })
    .index("by_family", ["familyId"])
    .index("by_family_period", ["familyId", "periodStart"]),

  /**
   * Ingredients bought for a dish that was not cooked, still at home
   * (« À utiliser » in the fridge). No expiry date: the family judges.
   */
  homeStock: defineTable({
    familyId,
    ingredientId: v.id("ingredients"),
    qty: v.number(),
    unit: unitValidator, // base unit: g, ml, pc…
    since: v.string(), // YYYY-MM-DD, day the dish was planned
    fromMealId: v.optional(v.id("meals")),
    fromName: v.optional(v.string()), // name of the cancelled dish
  })
    .index("by_family", ["familyId"])
    .index("by_family_ingredient", ["familyId", "ingredientId"]),

  /** "Envies": dishes someone feels like eating soon. */
  wishes: defineTable({
    familyId,
    memberId: v.id("members"),
    recipeId: v.optional(v.id("recipes")),
    text: v.optional(v.string()),
    done: v.boolean(),
    createdAt: v.number(),
  }).index("by_family", ["familyId"]),

  /** Last price seen on a receipt for one product at one chain. */
  chainPrices: defineTable({
    familyId,
    chain: chainValidator,
    ingredientId: v.optional(v.id("ingredients")),
    stapleId: v.optional(v.id("staples")),
    priceChf: v.number(),
    // Ingredient: quantity of its unit the price buys (1000 g, 10 eggs); staple: 1 item
    priceQty: v.number(),
    label: v.string(), // as printed on the receipt
    observedOn: v.string(), // YYYY-MM-DD, receipt date
  })
    .index("by_family", ["familyId"])
    .index("by_ingredient", ["ingredientId"])
    .index("by_staple", ["stapleId"]),

  /**
   * How a chain prints a product on its receipts, learnt when a receipt is
   * checked. No ingredient nor staple: the line is off the family list.
   */
  receiptAliases: defineTable({
    familyId,
    chain: chainValidator,
    labelKey: v.string(),
    ingredientId: v.optional(v.id("ingredients")),
    stapleId: v.optional(v.id("staples")),
    packQty: v.optional(v.number()), // content of one pack, in the ingredient unit
  })
    .index("by_family", ["familyId"])
    .index("by_family_chain_label", ["familyId", "chain", "labelKey"]),

  /** Settings, one row per family. */
  settings: defineTable({
    familyId,
    shoppingDay: v.number(), // 0 = Sunday … 6 = Saturday; planning weeks start that day
    defaultStoreId: v.optional(v.id("stores")),
    defaultPersons: v.number(),
    theme: v.optional(themeValidator),
    font: v.optional(fontValidator),
    // Guide for new members; absent = off (families older than the guide)
    onboarding: v.optional(v.boolean()),
  }).index("by_family", ["familyId"]),

  /** Device sessions opened by a member (token kept in localStorage). */
  sessions: defineTable({
    token: v.string(), // SHA-256 of the device token, never the token itself
    memberId: v.id("members"),
    familyId,
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_member", ["memberId"]),

  /** Brute-force guard per sign-in name: « <family link name>:<username> ». */
  loginGuards: defineTable({
    key: v.string(),
    failures: v.number(),
    lastFailureAt: v.number(),
    lockedUntil: v.number(),
  }).index("by_key", ["key"]),

  /** One-time link to choose one's password (first sign-in, or reset). */
  invites: defineTable({
    familyId: v.id("families"),
    memberId: v.id("members"),
    token: v.string(), // SHA-256 of the link token
    expiresAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_member", ["memberId"]),
});
