import { TAGS } from "./domain/tags";
/**
 * Seed data for Menu Maison: aisles, ingredients, recipes, stores, members.
 * All content is original (written for this app, not copied from any source).
 * Prices are rough 2026 estimates for an average Swiss supermarket, in CHF.
 * Pure data module: no Convex imports, so it can be tested with Vitest.
 */

export type Unit =
  | "g"
  | "kg"
  | "ml"
  | "l"
  | "pc"
  | "cs"
  | "cc"
  | "botte"
  | "boîte"
  | "paquet"
  | "pincée";

export type Chain = "Aldi" | "Lidl" | "Coop" | "Migros" | "Denner" | "Autre";

/** Array order = default walking order when no store is selected. */
export interface SeedAisle {
  key: string;
  name: string;
  emoji: string;
}

export interface SeedIngredient {
  name: string;
  aisle: string; // SeedAisle.key
  unit: Unit;
  priceChf?: number; // price for `priceQty` of `unit`
  priceQty?: number;
}

export interface SeedRecipeItem {
  ingredient: string; // exact SeedIngredient.name
  qtyPerPerson: number;
  unit: Unit;
}

export interface SeedRecipe {
  name: string;
  emoji: string;
  description: string;
  tags: string[];
  prepMinutes: number;
  fridgeDays: number;
  items: SeedRecipeItem[];
  steps: string[];
}

export interface SeedStore {
  chain: Chain;
  name: string;
  aisleOrder: string[]; // every aisle key, in walking order
  priceFactor: number;
}

export interface SeedMember {
  name: string;
  emoji: string;
  color: string;
}

// ---------------------------------------------------------------------------
// Aisles
// ---------------------------------------------------------------------------

export const AISLES: SeedAisle[] = [
  { key: "fruits-legumes", name: "Fruits et légumes", emoji: "🥬" },
  { key: "boulangerie", name: "Boulangerie", emoji: "🥖" },
  { key: "boucherie", name: "Boucherie et volaille", emoji: "🥩" },
  { key: "poissonnerie", name: "Poissonnerie", emoji: "🐟" },
  { key: "laitiers", name: "Produits laitiers et œufs", emoji: "🥛" },
  { key: "fromages", name: "Fromages", emoji: "🧀" },
  { key: "charcuterie", name: "Charcuterie", emoji: "🥓" },
  { key: "surgeles", name: "Surgelés", emoji: "🧊" },
  { key: "pates-riz", name: "Pâtes, riz et céréales", emoji: "🍝" },
  { key: "conserves", name: "Conserves et sauces", emoji: "🥫" },
  { key: "epices", name: "Épices et condiments", emoji: "🧂" },
  { key: "huiles", name: "Huiles et vinaigres", emoji: "🫒" },
  { key: "petit-dej", name: "Petit-déjeuner et pâtisserie", emoji: "🥣" },
  { key: "boissons", name: "Boissons", emoji: "🍷" },
  { key: "menage", name: "Ménage et hygiène", emoji: "🧽" },
];

// ---------------------------------------------------------------------------
// Ingredients
// ---------------------------------------------------------------------------

function ing(
  name: string,
  aisle: string,
  unit: Unit,
  priceChf: number,
  priceQty: number,
): SeedIngredient {
  return { name, aisle, unit, priceChf, priceQty };
}

export const INGREDIENTS: SeedIngredient[] = [
  // Fruits et légumes
  ing("Oignon", "fruits-legumes", "pc", 0.35, 1),
  ing("Oignon rouge", "fruits-legumes", "pc", 0.5, 1),
  ing("Échalote", "fruits-legumes", "pc", 0.4, 1),
  ing("Gousse d'ail", "fruits-legumes", "pc", 0.2, 1),
  ing("Pommes de terre", "fruits-legumes", "g", 2.6, 1000),
  ing("Patate douce", "fruits-legumes", "g", 5.5, 1000),
  ing("Carottes", "fruits-legumes", "g", 2.2, 1000),
  ing("Poireaux", "fruits-legumes", "g", 4.8, 1000),
  ing("Céleri-rave", "fruits-legumes", "g", 4.2, 1000),
  ing("Céleri branche", "fruits-legumes", "g", 6.5, 1000),
  ing("Courgettes", "fruits-legumes", "g", 4.9, 1000),
  ing("Poivron rouge", "fruits-legumes", "pc", 1.3, 1),
  ing("Poivron jaune", "fruits-legumes", "pc", 1.3, 1),
  ing("Tomates", "fruits-legumes", "g", 4.9, 1000),
  ing("Tomates cerises", "fruits-legumes", "g", 4.5, 500),
  ing("Concombre", "fruits-legumes", "pc", 1.2, 1),
  ing("Laitue", "fruits-legumes", "pc", 2.2, 1),
  ing("Rampon", "fruits-legumes", "g", 3.5, 100),
  ing("Épinards frais", "fruits-legumes", "g", 3.95, 250),
  ing("Brocoli", "fruits-legumes", "g", 6.5, 1000),
  ing("Chou-fleur", "fruits-legumes", "pc", 3.9, 1),
  ing("Champignons de Paris", "fruits-legumes", "g", 3.5, 250),
  ing("Courge butternut", "fruits-legumes", "g", 3.9, 1000),
  ing("Haricots verts", "fruits-legumes", "g", 9.5, 1000),
  ing("Avocat", "fruits-legumes", "pc", 1.6, 1),
  ing("Citron", "fruits-legumes", "pc", 0.6, 1),
  ing("Citron vert", "fruits-legumes", "pc", 0.7, 1),
  ing("Gingembre", "fruits-legumes", "g", 1.5, 100),
  ing("Pomme", "fruits-legumes", "pc", 0.6, 1),
  ing("Petits fruits rouges", "fruits-legumes", "g", 4.9, 250),
  ing("Persil", "fruits-legumes", "botte", 1.9, 1),
  ing("Ciboulette", "fruits-legumes", "botte", 1.9, 1),
  ing("Basilic", "fruits-legumes", "botte", 2.5, 1),
  ing("Coriandre", "fruits-legumes", "botte", 2.5, 1),
  ing("Aneth", "fruits-legumes", "botte", 2.5, 1),
  ing("Menthe", "fruits-legumes", "botte", 2.5, 1),
  ing("Oignons nouveaux", "fruits-legumes", "botte", 1.9, 1),
  ing("Bananes", "fruits-legumes", "g", 2.9, 1000),
  ing("Fenouil", "fruits-legumes", "g", 5.5, 1000),
  ing("Aubergine", "fruits-legumes", "g", 6.5, 1000),

  // Boulangerie
  ing("Pain mi-blanc", "boulangerie", "g", 4.2, 1000),
  ing("Baguette", "boulangerie", "pc", 1.9, 1),
  ing("Pain toast", "boulangerie", "g", 2.9, 500),
  ing("Pains à burger", "boulangerie", "pc", 0.75, 1),
  ing("Tortillas de blé", "boulangerie", "pc", 0.45, 1),
  ing("Tresse au beurre", "boulangerie", "g", 5.8, 500),

  // Boucherie et volaille
  ing("Émincé de veau", "boucherie", "g", 55, 1000),
  ing("Émincé de poulet", "boucherie", "g", 26, 1000),
  ing("Filets de poulet", "boucherie", "g", 29, 1000),
  ing("Poulet entier", "boucherie", "g", 11, 1000),
  ing("Cuisses de poulet", "boucherie", "g", 12, 1000),
  ing("Viande hachée de bœuf", "boucherie", "g", 22, 1000),
  ing("Viande hachée mixte", "boucherie", "g", 17, 1000),
  ing("Ragoût de bœuf", "boucherie", "g", 32, 1000),
  ing("Émincé de bœuf", "boucherie", "g", 45, 1000),
  ing("Escalopes de porc", "boucherie", "g", 28, 1000),
  ing("Côtelettes de porc", "boucherie", "g", 22, 1000),
  ing("Escalopes de dinde", "boucherie", "g", 29, 1000),
  ing("Saucisse de veau", "boucherie", "pc", 2.5, 1),
  ing("Merguez", "boucherie", "g", 22, 1000),

  // Poissonnerie
  ing("Filet de saumon", "poissonnerie", "g", 42, 1000),
  ing("Filet de cabillaud", "poissonnerie", "g", 40, 1000),
  ing("Filets de perche", "poissonnerie", "g", 65, 1000),
  ing("Crevettes décortiquées", "poissonnerie", "g", 38, 1000),
  ing("Saumon fumé", "poissonnerie", "g", 6.5, 100),

  // Produits laitiers et œufs
  ing("Œufs", "laitiers", "pc", 0.55, 1),
  ing("Lait", "laitiers", "ml", 1.75, 1000),
  ing("Crème entière", "laitiers", "ml", 3.1, 250),
  ing("Demi-crème", "laitiers", "ml", 2.4, 250),
  ing("Crème double de la Gruyère", "laitiers", "ml", 6.9, 250),
  ing("Crème acidulée", "laitiers", "g", 2.2, 180),
  ing("Beurre", "laitiers", "g", 3.6, 250),
  ing("Yogourt nature", "laitiers", "g", 0.8, 180),
  ing("Séré", "laitiers", "g", 1.9, 500),
  ing("Mascarpone", "laitiers", "g", 2.9, 250),
  ing("Tofu nature", "laitiers", "g", 3.5, 250),
  ing("Pâte feuilletée abaissée", "laitiers", "paquet", 2.9, 1),
  ing("Pâte brisée abaissée", "laitiers", "paquet", 2.6, 1),
  ing("Pâte à pizza abaissée", "laitiers", "paquet", 3.4, 1),

  // Fromages
  ing("Gruyère AOP", "fromages", "g", 24, 1000),
  ing("Vacherin fribourgeois AOP", "fromages", "g", 29, 1000),
  ing("Fromage à raclette", "fromages", "g", 23, 1000),
  ing("Emmental AOP", "fromages", "g", 19, 1000),
  ing("Parmesan", "fromages", "g", 34, 1000),
  ing("Feta", "fromages", "g", 2.9, 200),
  ing("Mozzarella", "fromages", "g", 1.7, 150),
  ing("Fromage râpé", "fromages", "g", 3.6, 200),

  // Charcuterie
  ing("Lardons fumés", "charcuterie", "g", 3.5, 150),
  ing("Jambon cuit", "charcuterie", "g", 3.9, 150),
  ing("Cervelas", "charcuterie", "pc", 1.3, 1),
  ing("Saucisse aux choux", "charcuterie", "g", 26, 1000),
  ing("Saucisson vaudois IGP", "charcuterie", "g", 24, 1000),
  ing("Viande séchée", "charcuterie", "g", 7.5, 100),
  ing("Lard fumé", "charcuterie", "g", 24, 1000),
  ing("Saucisses de Vienne", "charcuterie", "pc", 0.9, 1),
  ing("Chorizo", "charcuterie", "g", 3.5, 100),

  // Surgelés
  ing("Petits pois surgelés", "surgeles", "g", 2.4, 500),
  ing("Épinards hachés surgelés", "surgeles", "g", 2.6, 750),
  ing("Légumes pour wok surgelés", "surgeles", "g", 3.9, 750),
  ing("Frites au four", "surgeles", "g", 3.9, 750),

  // Pâtes, riz et céréales
  ing("Spaghetti", "pates-riz", "g", 1.7, 500),
  ing("Penne", "pates-riz", "g", 1.7, 500),
  ing("Macaronis", "pates-riz", "g", 1.9, 500),
  ing("Cornettes", "pates-riz", "g", 1.7, 500),
  ing("Feuilles de lasagne", "pates-riz", "g", 2.9, 500),
  ing("Tagliatelles", "pates-riz", "g", 2.9, 500),
  ing("Nouilles asiatiques", "pates-riz", "g", 2.9, 250),
  ing("Riz basmati", "pates-riz", "g", 3.9, 1000),
  ing("Riz arborio", "pates-riz", "g", 3.9, 1000),
  ing("Semoule de couscous", "pates-riz", "g", 2.2, 500),
  ing("Quinoa", "pates-riz", "g", 4.5, 500),
  ing("Lentilles corail", "pates-riz", "g", 3.5, 500),
  ing("Lentilles vertes", "pates-riz", "g", 2.9, 500),
  ing("Polenta", "pates-riz", "g", 2.5, 500),
  ing("Gnocchi", "pates-riz", "g", 3.5, 500),

  // Conserves et sauces
  ing("Tomates concassées", "conserves", "boîte", 1.2, 1),
  ing("Concentré de tomates", "conserves", "g", 1.3, 200),
  ing("Passata de tomates", "conserves", "ml", 1.9, 700),
  ing("Pois chiches", "conserves", "boîte", 1.3, 1),
  ing("Haricots rouges", "conserves", "boîte", 1.3, 1),
  ing("Haricots blancs", "conserves", "boîte", 1.3, 1),
  ing("Maïs doux", "conserves", "boîte", 1.6, 1),
  ing("Lait de coco", "conserves", "ml", 2.2, 400),
  ing("Thon en boîte", "conserves", "boîte", 2.4, 1),
  ing("Olives noires", "conserves", "g", 2.9, 200),
  ing("Cornichons", "conserves", "g", 2.7, 230),
  ing("Petits oignons au vinaigre", "conserves", "g", 2.7, 230),
  ing("Compote de pommes", "conserves", "g", 2.4, 700),
  ing("Pesto vert", "conserves", "g", 3.5, 190),
  ing("Sauce salsa", "conserves", "g", 3.2, 300),
  ing("Coques à tacos", "conserves", "pc", 0.3, 1),
  ing("Rösti prêt à cuire", "conserves", "paquet", 3.4, 1),
  ing("Choucroute", "conserves", "g", 4.5, 1000),
  ing("Bouillon de légumes", "conserves", "ml", 2.6, 4000),
  ing("Bouillon de bœuf", "conserves", "ml", 2.6, 4000),

  // Épices et condiments
  ing("Sel", "epices", "pincée", 1, 2000),
  ing("Poivre noir", "epices", "pincée", 3.5, 150),
  ing("Noix de muscade", "epices", "pincée", 3.2, 100),
  ing("Paprika doux", "epices", "cc", 2.9, 16),
  ing("Cumin moulu", "epices", "cc", 2.9, 16),
  ing("Curry en poudre", "epices", "cc", 2.9, 16),
  ing("Piment en poudre", "epices", "pincée", 2.9, 100),
  ing("Origan séché", "epices", "cc", 2.5, 20),
  ing("Thym séché", "epices", "cc", 2.5, 20),
  ing("Herbes de Provence", "epices", "cc", 2.5, 20),
  ing("Feuille de laurier", "epices", "pc", 0.1, 1),
  ing("Moutarde mi-forte", "epices", "cc", 1.9, 40),
  ing("Arôme Maggi", "epices", "cc", 4.5, 50),
  ing("Sauce soja", "epices", "cs", 3.5, 16),
  ing("Mayonnaise", "epices", "cs", 2.9, 17),
  ing("Ketchup", "epices", "cs", 2.9, 30),

  // Huiles et vinaigres
  ing("Huile d'olive", "huiles", "cs", 9.9, 66),
  ing("Huile de colza", "huiles", "cs", 4.5, 66),
  ing("Huile de sésame", "huiles", "cs", 4.5, 16),
  ing("Vinaigre balsamique", "huiles", "cs", 3.9, 33),
  ing("Vinaigre de vin", "huiles", "cs", 2.2, 66),

  // Petit-déjeuner et pâtisserie
  ing("Farine blanche", "petit-dej", "g", 1.8, 1000),
  ing("Sucre", "petit-dej", "g", 1.4, 1000),
  ing("Fécule de maïs", "petit-dej", "cs", 2.5, 25),
  ing("Chapelure", "petit-dej", "g", 1.6, 200),
  ing("Flocons d'avoine", "petit-dej", "g", 1.9, 500),
  ing("Noisettes moulues", "petit-dej", "g", 3.5, 200),
  ing("Miel", "petit-dej", "cs", 7, 25),
  ing("Cerneaux de noix", "petit-dej", "g", 3.9, 150),

  // Boissons
  ing("Vin blanc sec", "boissons", "ml", 9.9, 700),
  ing("Vin rouge", "boissons", "ml", 9.9, 750),
  ing("Kirsch", "boissons", "ml", 22, 350),

  // Ménage et hygiène
  ing("Papier cuisson", "menage", "pc", 2.9, 1),
];

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

export { TAGS };

// ---------------------------------------------------------------------------
// Recipes (quantities are per person)
// ---------------------------------------------------------------------------

function it(
  ingredient: string,
  qtyPerPerson: number,
  unit: Unit,
): SeedRecipeItem {
  return { ingredient, qtyPerPerson, unit };
}

export const RECIPES: SeedRecipe[] = [
  // --- Classiques suisses ---------------------------------------------------
  {
    name: "Papet vaudois",
    emoji: "🥬",
    description:
      "Poireaux et pommes de terre fondants, avec un saucisson vaudois posé dessus.",
    tags: ["Suisse", "Hiver", "Mijoté", "Réconfort"],
    prepMinutes: 60,
    fridgeDays: 3,
    items: [
      it("Poireaux", 250, "g"),
      it("Pommes de terre", 200, "g"),
      it("Saucisson vaudois IGP", 150, "g"),
      it("Oignon", 0.25, "pc"),
      it("Beurre", 10, "g"),
      it("Vin blanc sec", 30, "ml"),
      it("Bouillon de légumes", 100, "ml"),
      it("Demi-crème", 25, "ml"),
      it("Poivre noir", 1, "pincée"),
    ],
    steps: [
      "Émincez l'oignon et faites-le revenir dans le beurre.",
      "Ajoutez les poireaux coupés en tronçons et laissez-les fondre 5 minutes.",
      "Versez le vin blanc et le bouillon, puis ajoutez les pommes de terre en dés.",
      "Posez le saucisson entier sur les légumes, couvrez et laissez mijoter 40 minutes à feu doux.",
      "Incorporez la crème, poivrez et servez avec le saucisson coupé en tranches épaisses.",
    ],
  },
  {
    name: "Saucisse aux choux et lentilles",
    emoji: "🌭",
    description:
      "Une saucisse aux choux qui mijote doucement sur un lit de lentilles et de carottes.",
    tags: ["Suisse", "Hiver", "Mijoté"],
    prepMinutes: 75,
    fridgeDays: 3,
    items: [
      it("Saucisse aux choux", 150, "g"),
      it("Lentilles vertes", 70, "g"),
      it("Carottes", 60, "g"),
      it("Oignon", 0.25, "pc"),
      it("Feuille de laurier", 0.25, "pc"),
      it("Bouillon de légumes", 200, "ml"),
      it("Moutarde mi-forte", 1, "cc"),
      it("Vinaigre de vin", 0.5, "cs"),
    ],
    steps: [
      "Faites pocher la saucisse 40 minutes dans une eau frémissante, sans la piquer.",
      "Pendant ce temps, faites revenir l'oignon émincé et les carottes en rondelles.",
      "Ajoutez les lentilles rincées, le laurier et le bouillon, puis laissez cuire 25 minutes.",
      "Assaisonnez les lentilles avec la moutarde et le vinaigre.",
      "Servez la saucisse coupée en tranches sur les lentilles chaudes.",
    ],
  },
  {
    name: "Émincé de veau à la zurichoise et rösti",
    emoji: "🍄",
    description:
      "Du veau en lamelles dans une sauce crémeuse aux champignons, avec un rösti bien doré.",
    tags: ["Suisse", "Réconfort"],
    prepMinutes: 35,
    fridgeDays: 2,
    items: [
      it("Émincé de veau", 150, "g"),
      it("Champignons de Paris", 80, "g"),
      it("Échalote", 0.5, "pc"),
      it("Beurre", 15, "g"),
      it("Farine blanche", 5, "g"),
      it("Vin blanc sec", 30, "ml"),
      it("Bouillon de bœuf", 40, "ml"),
      it("Crème entière", 60, "ml"),
      it("Persil", 0.1, "botte"),
      it("Rösti prêt à cuire", 0.5, "paquet"),
      it("Huile de colza", 0.5, "cs"),
      it("Sel", 1, "pincée"),
    ],
    steps: [
      "Faites dorer le rösti à la poêle dans l'huile, 10 minutes de chaque côté.",
      "Saisissez la viande farinée par petites portions dans le beurre, puis réservez-la.",
      "Faites revenir l'échalote et les champignons émincés dans la même poêle.",
      "Déglacez avec le vin blanc, ajoutez le bouillon et la crème, puis laissez réduire 3 minutes.",
      "Remettez la viande dans la sauce juste pour la réchauffer, sans la faire bouillir.",
      "Parsemez de persil et servez avec le rösti.",
    ],
  },
  {
    name: "Croûte au fromage",
    emoji: "🧀",
    description:
      "Des tranches de pain arrosées de vin blanc, couvertes de jambon et de gruyère fondu.",
    tags: ["Suisse", "Four", "Réconfort"],
    prepMinutes: 25,
    fridgeDays: 1,
    items: [
      it("Pain mi-blanc", 120, "g"),
      it("Vin blanc sec", 40, "ml"),
      it("Gousse d'ail", 0.5, "pc"),
      it("Jambon cuit", 40, "g"),
      it("Gruyère AOP", 80, "g"),
      it("Œufs", 1, "pc"),
      it("Poivre noir", 1, "pincée"),
    ],
    steps: [
      "Préchauffez le four à 220 degrés.",
      "Frottez les tranches de pain avec l'ail et posez-les dans un plat à gratin.",
      "Arrosez-les de vin blanc, puis couvrez de jambon et de gruyère râpé.",
      "Enfournez 12 minutes, jusqu'à ce que le fromage soit doré.",
      "Pendant ce temps, faites cuire les œufs au plat et posez-les sur les croûtes avant de servir.",
    ],
  },
  {
    name: "Macaronis du chalet",
    emoji: "🏔️",
    description:
      "Pâtes, pommes de terre et fromage fondu, servis avec une compote de pommes comme à l'alpage.",
    tags: ["Suisse", "Réconfort", "Familial"],
    prepMinutes: 35,
    fridgeDays: 2,
    items: [
      it("Macaronis", 100, "g"),
      it("Pommes de terre", 120, "g"),
      it("Gruyère AOP", 60, "g"),
      it("Oignon", 0.5, "pc"),
      it("Beurre", 10, "g"),
      it("Demi-crème", 50, "ml"),
      it("Lait", 50, "ml"),
      it("Compote de pommes", 100, "g"),
    ],
    steps: [
      "Épluchez les pommes de terre et coupez-les en dés.",
      "Faites cuire les pommes de terre et les macaronis ensemble dans l'eau salée, environ 12 minutes.",
      "Pendant ce temps, faites dorer l'oignon en rondelles dans le beurre.",
      "Égouttez, remettez dans la casserole avec la crème, le lait et le fromage râpé, et mélangez sur feu doux.",
      "Servez avec les oignons dorés par-dessus et la compote de pommes à côté.",
    ],
  },
  {
    name: "Soupe de chalet",
    emoji: "🥣",
    description:
      "La soupe fribourgeoise des alpages, avec légumes, cornettes, lait et vacherin.",
    tags: ["Suisse", "Soupe", "Hiver"],
    prepMinutes: 45,
    fridgeDays: 2,
    items: [
      it("Pommes de terre", 100, "g"),
      it("Carottes", 60, "g"),
      it("Poireaux", 80, "g"),
      it("Céleri-rave", 40, "g"),
      it("Épinards frais", 40, "g"),
      it("Oignon", 0.25, "pc"),
      it("Beurre", 10, "g"),
      it("Cornettes", 30, "g"),
      it("Bouillon de légumes", 200, "ml"),
      it("Lait", 150, "ml"),
      it("Demi-crème", 40, "ml"),
      it("Vacherin fribourgeois AOP", 40, "g"),
      it("Gruyère AOP", 20, "g"),
    ],
    steps: [
      "Coupez tous les légumes en petits dés et faites-les revenir dans le beurre avec l'oignon.",
      "Versez le bouillon et laissez cuire 15 minutes.",
      "Ajoutez le lait et les cornettes, puis prolongez la cuisson 10 minutes.",
      "Incorporez les épinards et la crème en fin de cuisson.",
      "Servez dans des assiettes creuses avec les fromages coupés en cubes au fond.",
    ],
  },
  {
    name: "Malakoffs",
    emoji: "🧀",
    description:
      "Des boules de fromage dorées sur une tranche de pain, avec cornichons et salade.",
    tags: ["Suisse", "Réconfort"],
    prepMinutes: 40,
    fridgeDays: 1,
    items: [
      it("Gruyère AOP", 120, "g"),
      it("Pain mi-blanc", 60, "g"),
      it("Œufs", 0.5, "pc"),
      it("Farine blanche", 15, "g"),
      it("Vin blanc sec", 20, "ml"),
      it("Kirsch", 5, "ml"),
      it("Gousse d'ail", 0.25, "pc"),
      it("Huile de colza", 4, "cs"),
      it("Laitue", 0.25, "pc"),
      it("Cornichons", 30, "g"),
    ],
    steps: [
      "Râpez le gruyère et mélangez-le avec l'œuf, la farine, le vin blanc, le kirsch et l'ail pressé.",
      "Coupez le pain en tranches épaisses et façonnez une boule de pâte au fromage sur chacune.",
      "Faites chauffer l'huile dans une poêle profonde.",
      "Faites frire les malakoffs côté fromage, environ 3 minutes, jusqu'à ce qu'ils soient bien gonflés.",
      "Égouttez sur du papier absorbant et servez aussitôt avec la salade et les cornichons.",
    ],
  },
  {
    name: "Fondue moitié-moitié",
    emoji: "🫕",
    description:
      "Gruyère et vacherin fribourgeois à parts égales, pour une soirée autour du caquelon.",
    tags: ["Suisse", "Hiver", "Réconfort"],
    prepMinutes: 25,
    fridgeDays: 0,
    items: [
      it("Gruyère AOP", 100, "g"),
      it("Vacherin fribourgeois AOP", 100, "g"),
      it("Vin blanc sec", 80, "ml"),
      it("Kirsch", 15, "ml"),
      it("Fécule de maïs", 0.5, "cs"),
      it("Gousse d'ail", 0.5, "pc"),
      it("Pain mi-blanc", 200, "g"),
      it("Poivre noir", 1, "pincée"),
    ],
    steps: [
      "Coupez le pain en cubes la veille ou quelques heures avant pour qu'il sèche un peu.",
      "Frottez le caquelon avec l'ail, puis faites chauffer le vin blanc.",
      "Ajoutez le gruyère râpé petit à petit en remuant en huit.",
      "Délayez la fécule dans le kirsch et incorporez-la quand le fromage est fondu.",
      "Retirez du feu, ajoutez le vacherin en morceaux et remuez jusqu'à ce qu'il soit lisse.",
      "Poivrez et posez le caquelon sur le réchaud.",
    ],
  },
  {
    name: "Raclette",
    emoji: "🫕",
    description:
      "Fromage fondu sur des pommes de terre en robe des champs, avec les petits condiments.",
    tags: ["Suisse", "Hiver", "Familial"],
    prepMinutes: 20,
    fridgeDays: 0,
    items: [
      it("Fromage à raclette", 200, "g"),
      it("Pommes de terre", 250, "g"),
      it("Cornichons", 40, "g"),
      it("Petits oignons au vinaigre", 30, "g"),
      it("Viande séchée", 30, "g"),
      it("Paprika doux", 0.25, "cc"),
      it("Poivre noir", 1, "pincée"),
    ],
    steps: [
      "Faites cuire les pommes de terre entières à l'eau salée, environ 25 minutes.",
      "Coupez le fromage en tranches si ce n'est pas déjà fait.",
      "Disposez cornichons, oignons et viande séchée sur la table.",
      "Allumez l'appareil à raclette et gardez les pommes de terre au chaud dans un panier couvert.",
      "Chacun fait fondre son fromage et l'assaisonne de poivre et de paprika.",
    ],
  },
  {
    name: "Cordons-bleus et frites au four",
    emoji: "🍖",
    description:
      "Escalopes farcies au jambon et au fromage, panées et dorées, avec des frites.",
    tags: ["Suisse", "Familial", "Réconfort"],
    prepMinutes: 40,
    fridgeDays: 2,
    items: [
      it("Escalopes de porc", 150, "g"),
      it("Jambon cuit", 30, "g"),
      it("Gruyère AOP", 30, "g"),
      it("Œufs", 0.5, "pc"),
      it("Farine blanche", 15, "g"),
      it("Chapelure", 30, "g"),
      it("Huile de colza", 2, "cs"),
      it("Frites au four", 200, "g"),
      it("Citron", 0.25, "pc"),
      it("Sel", 1, "pincée"),
    ],
    steps: [
      "Enfournez les frites selon les indications du paquet.",
      "Aplatissez les escalopes, garnissez une moitié de jambon et de fromage, puis refermez.",
      "Passez-les dans la farine, puis dans l'œuf battu et enfin dans la chapelure.",
      "Faites-les dorer à la poêle dans l'huile, 5 à 6 minutes de chaque côté à feu moyen.",
      "Servez avec les frites et un quartier de citron.",
    ],
  },
  {
    name: "Cornettes à la viande hachée",
    emoji: "🍝",
    description:
      "Le plat de semaine que tout le monde connaît, avec sa compote de pommes.",
    tags: ["Suisse", "Familial", "Réconfort"],
    prepMinutes: 25,
    fridgeDays: 3,
    items: [
      it("Cornettes", 110, "g"),
      it("Viande hachée de bœuf", 120, "g"),
      it("Oignon", 0.5, "pc"),
      it("Concentré de tomates", 10, "g"),
      it("Bouillon de bœuf", 50, "ml"),
      it("Arôme Maggi", 0.5, "cc"),
      it("Fromage râpé", 25, "g"),
      it("Compote de pommes", 80, "g"),
    ],
    steps: [
      "Faites cuire les cornettes dans l'eau salée.",
      "Faites revenir l'oignon haché, puis ajoutez la viande et laissez-la bien colorer.",
      "Ajoutez le concentré de tomates, le bouillon et le Maggi, puis laissez réduire 5 minutes.",
      "Mélangez les cornettes égouttées avec la viande.",
      "Servez avec le fromage râpé et la compote de pommes.",
    ],
  },
  {
    name: "Choucroute garnie",
    emoji: "🥓",
    description:
      "Choucroute au vin blanc, lard fumé, saucisses et pommes de terre vapeur.",
    tags: ["Suisse", "Hiver", "Mijoté"],
    prepMinutes: 60,
    fridgeDays: 3,
    items: [
      it("Choucroute", 200, "g"),
      it("Lard fumé", 80, "g"),
      it("Saucisses de Vienne", 1, "pc"),
      it("Pommes de terre", 200, "g"),
      it("Oignon", 0.25, "pc"),
      it("Beurre", 5, "g"),
      it("Vin blanc sec", 50, "ml"),
      it("Feuille de laurier", 0.25, "pc"),
    ],
    steps: [
      "Faites fondre l'oignon émincé dans le beurre au fond d'une cocotte.",
      "Ajoutez la choucroute, le vin blanc, le laurier et un peu d'eau.",
      "Posez le lard dessus, couvrez et laissez mijoter 40 minutes.",
      "Faites cuire les pommes de terre à la vapeur.",
      "Ajoutez les saucisses 10 minutes avant la fin pour les réchauffer, puis servez.",
    ],
  },
  {
    name: "Filets de perche meunière",
    emoji: "🐟",
    description:
      "Des filets de perche dorés au beurre, avec citron, persil et pommes vapeur.",
    tags: ["Suisse", "Poisson"],
    prepMinutes: 30,
    fridgeDays: 1,
    items: [
      it("Filets de perche", 150, "g"),
      it("Farine blanche", 10, "g"),
      it("Beurre", 20, "g"),
      it("Citron", 0.25, "pc"),
      it("Persil", 0.1, "botte"),
      it("Pommes de terre", 200, "g"),
      it("Sel", 1, "pincée"),
    ],
    steps: [
      "Faites cuire les pommes de terre à la vapeur, environ 20 minutes.",
      "Salez les filets et passez-les légèrement dans la farine.",
      "Faites-les dorer dans le beurre mousseux, 1 à 2 minutes de chaque côté.",
      "Arrosez de jus de citron et parsemez de persil haché.",
      "Servez aussitôt avec les pommes de terre.",
    ],
  },
  {
    name: "Rösti au lard et œuf au plat",
    emoji: "🍳",
    description:
      "Un rösti croustillant, quelques lardons et un œuf au plat pour les soirs pressés.",
    tags: ["Suisse", "Express", "Réconfort"],
    prepMinutes: 20,
    fridgeDays: 1,
    items: [
      it("Rösti prêt à cuire", 0.5, "paquet"),
      it("Lardons fumés", 40, "g"),
      it("Beurre", 10, "g"),
      it("Œufs", 1, "pc"),
      it("Ciboulette", 0.1, "botte"),
    ],
    steps: [
      "Faites griller les lardons dans une grande poêle sans matière grasse.",
      "Ajoutez le beurre et le rösti, mélangez, puis tassez en galette.",
      "Laissez dorer 7 minutes, retournez à l'aide d'une assiette et dorez l'autre face.",
      "Faites cuire les œufs au plat dans une autre poêle.",
      "Servez le rösti avec l'œuf posé dessus et la ciboulette ciselée.",
    ],
  },
  {
    name: "Gâteau au fromage",
    emoji: "🥧",
    description:
      "Une tarte au gruyère et à l'emmental, simple et généreuse, avec une salade verte.",
    tags: ["Suisse", "Four", "Familial"],
    prepMinutes: 50,
    fridgeDays: 2,
    items: [
      it("Pâte brisée abaissée", 0.25, "paquet"),
      it("Gruyère AOP", 50, "g"),
      it("Emmental AOP", 30, "g"),
      it("Œufs", 0.75, "pc"),
      it("Lait", 50, "ml"),
      it("Crème entière", 40, "ml"),
      it("Farine blanche", 5, "g"),
      it("Noix de muscade", 1, "pincée"),
      it("Laitue", 0.2, "pc"),
    ],
    steps: [
      "Préchauffez le four à 200 degrés et foncez un moule avec la pâte.",
      "Piquez le fond avec une fourchette et répartissez les fromages râpés dessus.",
      "Battez les œufs avec le lait, la crème, la farine et la muscade.",
      "Versez sur le fromage et enfournez 30 minutes dans le bas du four.",
      "Laissez tiédir 5 minutes et servez avec la salade.",
    ],
  },
  {
    name: "Saucisse de veau, rösti et sauce aux oignons",
    emoji: "🌭",
    description:
      "Une saucisse de veau grillée, un rösti et une sauce aux oignons bien brune.",
    tags: ["Suisse", "Familial"],
    prepMinutes: 35,
    fridgeDays: 2,
    items: [
      it("Saucisse de veau", 1, "pc"),
      it("Rösti prêt à cuire", 0.5, "paquet"),
      it("Oignon", 0.5, "pc"),
      it("Beurre", 10, "g"),
      it("Bouillon de bœuf", 60, "ml"),
      it("Fécule de maïs", 0.25, "cs"),
      it("Huile de colza", 0.5, "cs"),
    ],
    steps: [
      "Faites dorer le rösti à la poêle dans l'huile, 10 minutes de chaque côté.",
      "Faites griller les saucisses à feu moyen en les retournant souvent.",
      "Faites fondre les oignons émincés dans le beurre jusqu'à ce qu'ils soient bien dorés.",
      "Ajoutez le bouillon et la fécule délayée dans un peu d'eau froide, puis laissez épaissir.",
      "Servez les saucisses nappées de sauce, avec le rösti.",
    ],
  },
  {
    name: "Cervelas grillés et salade de pommes de terre",
    emoji: "🔥",
    description:
      "Le repas des soirs d'été, au gril ou à la poêle, avec une salade de pommes de terre tiède.",
    tags: ["Suisse", "Été", "Familial"],
    prepMinutes: 40,
    fridgeDays: 2,
    items: [
      it("Cervelas", 1, "pc"),
      it("Pommes de terre", 200, "g"),
      it("Oignon rouge", 0.15, "pc"),
      it("Ciboulette", 0.1, "botte"),
      it("Bouillon de légumes", 40, "ml"),
      it("Vinaigre de vin", 1, "cs"),
      it("Huile de colza", 1, "cs"),
      it("Moutarde mi-forte", 0.5, "cc"),
      it("Cornichons", 20, "g"),
    ],
    steps: [
      "Faites cuire les pommes de terre avec la peau, environ 20 minutes.",
      "Épluchez-les encore chaudes et coupez-les en rondelles.",
      "Arrosez-les de bouillon chaud, puis ajoutez l'oignon, les cornichons, le vinaigre, l'huile et la moutarde.",
      "Incisez les cervelas aux deux bouts et faites-les griller.",
      "Parsemez la salade de ciboulette et servez avec les cervelas.",
    ],
  },
  {
    name: "Birchermüesli du soir",
    emoji: "🍎",
    description:
      "Flocons d'avoine, yogourt, pomme râpée et petits fruits, pour un souper léger quand il fait chaud.",
    tags: ["Suisse", "Été", "Express", "Healthy"],
    prepMinutes: 15,
    fridgeDays: 1,
    items: [
      it("Flocons d'avoine", 50, "g"),
      it("Yogourt nature", 120, "g"),
      it("Lait", 60, "ml"),
      it("Pomme", 0.5, "pc"),
      it("Petits fruits rouges", 60, "g"),
      it("Noisettes moulues", 15, "g"),
      it("Citron", 0.1, "pc"),
      it("Miel", 0.5, "cs"),
    ],
    steps: [
      "Mélangez les flocons d'avoine avec le lait et laissez gonfler 10 minutes.",
      "Râpez la pomme avec la peau et arrosez-la de jus de citron.",
      "Ajoutez la pomme, le yogourt, les noisettes et le miel aux flocons.",
      "Garnissez de petits fruits et servez bien frais.",
    ],
  },
  {
    name: "Velouté de poireaux à la crème double",
    emoji: "🥣",
    description:
      "Une soupe douce de poireaux et pommes de terre, avec une cuillerée de crème double.",
    tags: ["Suisse", "Soupe", "Végé", "Hiver"],
    prepMinutes: 35,
    fridgeDays: 3,
    items: [
      it("Poireaux", 150, "g"),
      it("Pommes de terre", 120, "g"),
      it("Beurre", 10, "g"),
      it("Bouillon de légumes", 300, "ml"),
      it("Crème double de la Gruyère", 20, "ml"),
      it("Ciboulette", 0.1, "botte"),
      it("Poivre noir", 1, "pincée"),
    ],
    steps: [
      "Lavez les poireaux et émincez-les finement.",
      "Faites-les fondre 5 minutes dans le beurre sans les colorer.",
      "Ajoutez les pommes de terre en dés et le bouillon, puis laissez cuire 20 minutes.",
      "Mixez jusqu'à obtenir un velouté lisse et poivrez.",
      "Servez avec une cuillerée de crème double et la ciboulette ciselée.",
    ],
  },

  // --- Plats familiaux -------------------------------------------------------
  {
    name: "Gratin dauphinois",
    emoji: "🥔",
    description:
      "Des pommes de terre fines cuites lentement dans le lait et la crème.",
    tags: ["Four", "Familial", "Végé", "Réconfort"],
    prepMinutes: 75,
    fridgeDays: 3,
    items: [
      it("Pommes de terre", 250, "g"),
      it("Lait", 80, "ml"),
      it("Crème entière", 80, "ml"),
      it("Gousse d'ail", 0.5, "pc"),
      it("Beurre", 5, "g"),
      it("Noix de muscade", 1, "pincée"),
      it("Sel", 1, "pincée"),
    ],
    steps: [
      "Préchauffez le four à 180 degrés.",
      "Épluchez les pommes de terre et coupez-les en rondelles fines, sans les rincer.",
      "Frottez le plat avec l'ail, puis beurrez-le.",
      "Rangez les rondelles en couches et salez légèrement.",
      "Faites chauffer le lait et la crème avec la muscade, puis versez sur les pommes de terre.",
      "Enfournez 1 heure, jusqu'à ce que la pointe d'un couteau s'enfonce sans résistance.",
    ],
  },
  {
    name: "Hachis parmentier",
    emoji: "🥧",
    description:
      "Une purée maison sur une viande hachée mijotée, gratinée au four.",
    tags: ["Four", "Familial", "Réconfort"],
    prepMinutes: 60,
    fridgeDays: 3,
    items: [
      it("Viande hachée mixte", 120, "g"),
      it("Pommes de terre", 250, "g"),
      it("Lait", 60, "ml"),
      it("Beurre", 15, "g"),
      it("Oignon", 0.5, "pc"),
      it("Carottes", 50, "g"),
      it("Concentré de tomates", 10, "g"),
      it("Fromage râpé", 25, "g"),
      it("Noix de muscade", 1, "pincée"),
    ],
    steps: [
      "Faites cuire les pommes de terre épluchées à l'eau salée, environ 20 minutes.",
      "Faites revenir l'oignon et les carottes râpées, puis ajoutez la viande et le concentré.",
      "Écrasez les pommes de terre avec le lait chaud, le beurre et la muscade.",
      "Étalez la viande dans un plat, couvrez de purée et parsemez de fromage.",
      "Gratinez 20 minutes au four à 200 degrés.",
    ],
  },
  {
    name: "Lasagnes bolognaise",
    emoji: "🍝",
    description:
      "Des couches de pâtes, de sauce à la viande et de béchamel, à préparer le dimanche.",
    tags: ["Italien", "Four", "Familial"],
    prepMinutes: 90,
    fridgeDays: 3,
    items: [
      it("Feuilles de lasagne", 70, "g"),
      it("Viande hachée mixte", 120, "g"),
      it("Passata de tomates", 120, "ml"),
      it("Oignon", 0.25, "pc"),
      it("Carottes", 40, "g"),
      it("Céleri branche", 20, "g"),
      it("Huile d'olive", 0.5, "cs"),
      it("Lait", 150, "ml"),
      it("Beurre", 15, "g"),
      it("Farine blanche", 15, "g"),
      it("Parmesan", 20, "g"),
      it("Noix de muscade", 1, "pincée"),
    ],
    steps: [
      "Faites revenir l'oignon, la carotte et le céleri hachés dans l'huile, puis ajoutez la viande.",
      "Versez la passata et laissez mijoter 30 minutes à couvert.",
      "Pour la béchamel, faites fondre le beurre, ajoutez la farine, puis le lait en fouettant jusqu'à épaississement.",
      "Alternez dans un plat feuilles de lasagne, sauce à la viande et béchamel.",
      "Terminez par la béchamel et le parmesan, puis enfournez 35 minutes à 190 degrés.",
    ],
  },
  {
    name: "Spaghetti bolognaise",
    emoji: "🍝",
    description:
      "Une sauce tomate à la viande qui mijote tranquillement pendant qu'on met la table.",
    tags: ["Italien", "Familial", "Mijoté"],
    prepMinutes: 50,
    fridgeDays: 3,
    items: [
      it("Spaghetti", 120, "g"),
      it("Viande hachée de bœuf", 120, "g"),
      it("Tomates concassées", 0.5, "boîte"),
      it("Concentré de tomates", 10, "g"),
      it("Oignon", 0.25, "pc"),
      it("Carottes", 40, "g"),
      it("Gousse d'ail", 0.5, "pc"),
      it("Origan séché", 0.25, "cc"),
      it("Huile d'olive", 0.5, "cs"),
      it("Parmesan", 15, "g"),
    ],
    steps: [
      "Faites revenir l'oignon, l'ail et la carotte hachés dans l'huile d'olive.",
      "Ajoutez la viande et laissez-la colorer en l'émiettant.",
      "Ajoutez les tomates, le concentré et l'origan, puis laissez mijoter 30 minutes.",
      "Faites cuire les spaghetti al dente.",
      "Servez la sauce sur les pâtes avec le parmesan râpé.",
    ],
  },
  {
    name: "Poulet rôti et légumes du four",
    emoji: "🍗",
    description:
      "Un poulet doré entouré de pommes de terre et de carottes qui cuisent dans son jus.",
    tags: ["Four", "Familial"],
    prepMinutes: 90,
    fridgeDays: 3,
    items: [
      it("Poulet entier", 350, "g"),
      it("Pommes de terre", 200, "g"),
      it("Carottes", 100, "g"),
      it("Oignon", 0.5, "pc"),
      it("Gousse d'ail", 1, "pc"),
      it("Citron", 0.25, "pc"),
      it("Thym séché", 0.5, "cc"),
      it("Huile d'olive", 1, "cs"),
      it("Beurre", 10, "g"),
      it("Sel", 1, "pincée"),
    ],
    steps: [
      "Préchauffez le four à 200 degrés.",
      "Glissez le citron et l'ail dans le poulet, puis badigeonnez-le de beurre et de thym.",
      "Disposez autour les pommes de terre, les carottes et l'oignon en morceaux, arrosés d'huile.",
      "Enfournez 1 heure 15 en arrosant le poulet de son jus toutes les 20 minutes.",
      "Laissez reposer 10 minutes avant de découper.",
    ],
  },
  {
    name: "Quiche lorraine",
    emoji: "🥧",
    description:
      "Lardons, œufs et crème dans une pâte brisée, à servir avec une salade.",
    tags: ["Four", "Familial"],
    prepMinutes: 50,
    fridgeDays: 3,
    items: [
      it("Pâte brisée abaissée", 0.25, "paquet"),
      it("Lardons fumés", 40, "g"),
      it("Œufs", 1, "pc"),
      it("Crème entière", 60, "ml"),
      it("Lait", 40, "ml"),
      it("Gruyère AOP", 30, "g"),
      it("Noix de muscade", 1, "pincée"),
      it("Laitue", 0.2, "pc"),
    ],
    steps: [
      "Préchauffez le four à 200 degrés et foncez un moule avec la pâte.",
      "Faites dorer les lardons à la poêle et répartissez-les sur le fond.",
      "Battez les œufs avec la crème, le lait, le gruyère râpé et la muscade.",
      "Versez sur les lardons et enfournez 30 minutes.",
      "Servez tiède avec la salade.",
    ],
  },
  {
    name: "Pizza maison",
    emoji: "🍕",
    description:
      "Une pâte abaissée, une sauce tomate et chacun garnit sa part comme il l'aime.",
    tags: ["Italien", "Familial", "Four"],
    prepMinutes: 30,
    fridgeDays: 2,
    items: [
      it("Pâte à pizza abaissée", 0.5, "paquet"),
      it("Passata de tomates", 60, "ml"),
      it("Mozzarella", 70, "g"),
      it("Jambon cuit", 40, "g"),
      it("Champignons de Paris", 40, "g"),
      it("Olives noires", 15, "g"),
      it("Origan séché", 0.25, "cc"),
      it("Huile d'olive", 0.5, "cs"),
    ],
    steps: [
      "Préchauffez le four à 240 degrés avec la plaque à l'intérieur.",
      "Déroulez la pâte sur le papier de cuisson et étalez la passata.",
      "Garnissez de jambon, de champignons émincés, d'olives et de mozzarella en morceaux.",
      "Saupoudrez d'origan et arrosez d'un filet d'huile.",
      "Glissez sur la plaque chaude et faites cuire 12 à 15 minutes.",
    ],
  },
  {
    name: "Burgers maison",
    emoji: "🍔",
    description:
      "Des steaks hachés grillés, du fromage fondu et des frites au four pour un soir de fête.",
    tags: ["Familial", "Été"],
    prepMinutes: 35,
    fridgeDays: 1,
    items: [
      it("Pains à burger", 1, "pc"),
      it("Viande hachée de bœuf", 140, "g"),
      it("Emmental AOP", 25, "g"),
      it("Tomates", 50, "g"),
      it("Laitue", 0.1, "pc"),
      it("Oignon rouge", 0.15, "pc"),
      it("Cornichons", 15, "g"),
      it("Mayonnaise", 0.5, "cs"),
      it("Ketchup", 0.5, "cs"),
      it("Frites au four", 150, "g"),
      it("Sel", 1, "pincée"),
    ],
    steps: [
      "Enfournez les frites selon les indications du paquet.",
      "Façonnez des steaks un peu plus larges que les pains et salez-les.",
      "Faites-les griller 3 minutes de chaque côté et posez le fromage dessus à la fin.",
      "Toastez les pains coupés en deux.",
      "Montez les burgers avec les sauces, la salade, la tomate, l'oignon et les cornichons.",
    ],
  },
  {
    name: "Escalopes de dinde aux champignons",
    emoji: "🍄",
    description:
      "De la dinde tendre dans une sauce à la crème et aux champignons, avec des tagliatelles.",
    tags: ["Familial", "Réconfort"],
    prepMinutes: 25,
    fridgeDays: 2,
    items: [
      it("Escalopes de dinde", 130, "g"),
      it("Champignons de Paris", 80, "g"),
      it("Échalote", 0.25, "pc"),
      it("Demi-crème", 50, "ml"),
      it("Tagliatelles", 90, "g"),
      it("Persil", 0.1, "botte"),
      it("Huile de colza", 0.5, "cs"),
      it("Sel", 1, "pincée"),
    ],
    steps: [
      "Faites cuire les tagliatelles dans l'eau salée.",
      "Faites dorer les escalopes salées dans l'huile, 3 minutes de chaque côté, puis réservez.",
      "Faites revenir l'échalote et les champignons émincés dans la même poêle.",
      "Ajoutez la crème, remettez la dinde et laissez mijoter 3 minutes.",
      "Parsemez de persil et servez avec les pâtes.",
    ],
  },
  {
    name: "Ragoût de bœuf et polenta",
    emoji: "🍲",
    description:
      "Un bœuf qui mijote longtemps au vin rouge, servi sur une polenta crémeuse.",
    tags: ["Mijoté", "Hiver", "Réconfort"],
    prepMinutes: 150,
    fridgeDays: 4,
    items: [
      it("Ragoût de bœuf", 150, "g"),
      it("Oignon", 0.25, "pc"),
      it("Carottes", 60, "g"),
      it("Concentré de tomates", 10, "g"),
      it("Vin rouge", 60, "ml"),
      it("Bouillon de bœuf", 150, "ml"),
      it("Feuille de laurier", 0.25, "pc"),
      it("Thym séché", 0.25, "cc"),
      it("Huile de colza", 0.5, "cs"),
      it("Polenta", 70, "g"),
      it("Lait", 100, "ml"),
      it("Parmesan", 15, "g"),
      it("Beurre", 10, "g"),
    ],
    steps: [
      "Faites dorer la viande dans l'huile en plusieurs fois, puis réservez-la.",
      "Faites revenir l'oignon et les carottes, puis ajoutez le concentré de tomates.",
      "Remettez la viande, versez le vin rouge et le bouillon, ajoutez le laurier et le thym.",
      "Couvrez et laissez mijoter 2 heures à feu très doux.",
      "Pour la polenta, faites chauffer le lait avec la même quantité d'eau, versez la semoule en pluie et remuez 10 minutes.",
      "Ajoutez le beurre et le parmesan à la polenta et servez avec le ragoût.",
    ],
  },
  {
    name: "Gratin de chou-fleur",
    emoji: "🥦",
    description:
      "Du chou-fleur et des pommes de terre sous une béchamel au gruyère.",
    tags: ["Four", "Végé", "Hiver"],
    prepMinutes: 50,
    fridgeDays: 3,
    items: [
      it("Chou-fleur", 0.3, "pc"),
      it("Pommes de terre", 150, "g"),
      it("Lait", 120, "ml"),
      it("Beurre", 10, "g"),
      it("Farine blanche", 10, "g"),
      it("Gruyère AOP", 40, "g"),
      it("Noix de muscade", 1, "pincée"),
    ],
    steps: [
      "Détaillez le chou-fleur en bouquets et coupez les pommes de terre en rondelles.",
      "Faites-les précuire 8 minutes à l'eau salée, puis égouttez.",
      "Préparez une béchamel avec le beurre, la farine et le lait, puis ajoutez la muscade et la moitié du fromage.",
      "Versez sur les légumes dans un plat et parsemez du reste de fromage.",
      "Gratinez 25 minutes au four à 200 degrés.",
    ],
  },
  {
    name: "Couscous aux légumes et merguez",
    emoji: "🍲",
    description:
      "Une semoule légère, des légumes en bouillon épicé et des merguez grillées.",
    tags: ["Mijoté", "Familial"],
    prepMinutes: 60,
    fridgeDays: 3,
    items: [
      it("Semoule de couscous", 80, "g"),
      it("Merguez", 120, "g"),
      it("Pois chiches", 0.25, "boîte"),
      it("Courgettes", 80, "g"),
      it("Carottes", 60, "g"),
      it("Poivron rouge", 0.25, "pc"),
      it("Oignon", 0.25, "pc"),
      it("Tomates concassées", 0.25, "boîte"),
      it("Cumin moulu", 0.5, "cc"),
      it("Bouillon de légumes", 200, "ml"),
      it("Huile d'olive", 0.5, "cs"),
    ],
    steps: [
      "Faites revenir l'oignon et le cumin dans l'huile d'olive.",
      "Ajoutez les carottes, le poivron, les tomates et le bouillon, puis laissez cuire 20 minutes.",
      "Ajoutez les courgettes et les pois chiches égouttés, et prolongez de 10 minutes.",
      "Versez la même quantité d'eau bouillante salée sur la semoule et laissez gonfler 5 minutes à couvert.",
      "Faites griller les merguez et servez le tout ensemble.",
    ],
  },
  {
    name: "Émincé de poulet au curry",
    emoji: "🍛",
    description:
      "Du poulet dans une sauce douce au curry et à la pomme, avec du riz basmati.",
    tags: ["Familial", "Asiatique"],
    prepMinutes: 25,
    fridgeDays: 3,
    items: [
      it("Émincé de poulet", 130, "g"),
      it("Lait de coco", 80, "ml"),
      it("Curry en poudre", 1, "cc"),
      it("Oignon", 0.25, "pc"),
      it("Pomme", 0.25, "pc"),
      it("Poivron jaune", 0.25, "pc"),
      it("Huile de colza", 0.5, "cs"),
      it("Riz basmati", 70, "g"),
    ],
    steps: [
      "Faites cuire le riz.",
      "Faites dorer le poulet dans l'huile, puis réservez-le.",
      "Faites revenir l'oignon, le poivron et la pomme en dés avec le curry.",
      "Versez le lait de coco, remettez le poulet et laissez mijoter 8 minutes.",
      "Servez avec le riz.",
    ],
  },
  {
    name: "Chili con carne",
    emoji: "🌶️",
    description:
      "Viande hachée, haricots rouges et épices, encore meilleur réchauffé le lendemain.",
    tags: ["Mexicain", "Mijoté", "Familial"],
    prepMinutes: 60,
    fridgeDays: 4,
    items: [
      it("Viande hachée de bœuf", 120, "g"),
      it("Haricots rouges", 0.33, "boîte"),
      it("Tomates concassées", 0.5, "boîte"),
      it("Maïs doux", 0.25, "boîte"),
      it("Oignon", 0.5, "pc"),
      it("Poivron rouge", 0.33, "pc"),
      it("Gousse d'ail", 0.5, "pc"),
      it("Cumin moulu", 0.5, "cc"),
      it("Paprika doux", 0.5, "cc"),
      it("Piment en poudre", 1, "pincée"),
      it("Huile de colza", 0.5, "cs"),
      it("Riz basmati", 70, "g"),
      it("Crème acidulée", 30, "g"),
    ],
    steps: [
      "Faites revenir l'oignon, l'ail et le poivron dans l'huile.",
      "Ajoutez la viande et les épices, et laissez colorer.",
      "Versez les tomates, couvrez et laissez mijoter 30 minutes.",
      "Ajoutez les haricots et le maïs égouttés, puis prolongez de 10 minutes.",
      "Servez avec le riz et une cuillerée de crème acidulée.",
    ],
  },
  {
    name: "Tacos au poulet",
    emoji: "🌮",
    description:
      "Des coques croustillantes que chacun garnit à table de poulet épicé et de crudités.",
    tags: ["Mexicain", "Familial"],
    prepMinutes: 25,
    fridgeDays: 1,
    items: [
      it("Coques à tacos", 3, "pc"),
      it("Émincé de poulet", 120, "g"),
      it("Paprika doux", 0.5, "cc"),
      it("Cumin moulu", 0.25, "cc"),
      it("Poivron rouge", 0.25, "pc"),
      it("Oignon rouge", 0.25, "pc"),
      it("Laitue", 0.15, "pc"),
      it("Tomates", 60, "g"),
      it("Avocat", 0.5, "pc"),
      it("Citron vert", 0.25, "pc"),
      it("Fromage râpé", 25, "g"),
      it("Crème acidulée", 30, "g"),
      it("Sauce salsa", 40, "g"),
    ],
    steps: [
      "Faites sauter le poulet avec le poivron, l'oignon et les épices, environ 8 minutes.",
      "Écrasez l'avocat avec le jus de citron vert.",
      "Coupez la salade en lanières et les tomates en dés.",
      "Réchauffez les coques 3 minutes au four.",
      "Posez tout sur la table et laissez chacun garnir ses tacos.",
    ],
  },
  {
    name: "Quesadillas aux haricots",
    emoji: "🫓",
    description:
      "Des tortillas dorées à la poêle, fourrées de haricots, de maïs et de fromage fondant.",
    tags: ["Mexicain", "Végé", "Express"],
    prepMinutes: 20,
    fridgeDays: 2,
    items: [
      it("Tortillas de blé", 2, "pc"),
      it("Haricots rouges", 0.25, "boîte"),
      it("Maïs doux", 0.15, "boîte"),
      it("Fromage râpé", 50, "g"),
      it("Poivron rouge", 0.25, "pc"),
      it("Oignons nouveaux", 0.15, "botte"),
      it("Coriandre", 0.1, "botte"),
      it("Sauce salsa", 30, "g"),
    ],
    steps: [
      "Écrasez grossièrement les haricots égouttés à la fourchette.",
      "Étalez-les sur une moitié de chaque tortilla.",
      "Ajoutez le maïs, le poivron en dés, les oignons nouveaux et le fromage, puis repliez.",
      "Faites dorer à sec dans une poêle, 2 minutes de chaque côté.",
      "Coupez en triangles et servez avec la salsa et la coriandre.",
    ],
  },
  {
    name: "Curry de pois chiches",
    emoji: "🍛",
    description:
      "Pois chiches et épinards dans une sauce coco parfumée, avec du riz basmati.",
    tags: ["Végé", "Asiatique", "Healthy"],
    prepMinutes: 35,
    fridgeDays: 4,
    items: [
      it("Pois chiches", 0.5, "boîte"),
      it("Lait de coco", 100, "ml"),
      it("Tomates concassées", 0.25, "boîte"),
      it("Épinards frais", 50, "g"),
      it("Oignon", 0.25, "pc"),
      it("Gousse d'ail", 0.5, "pc"),
      it("Gingembre", 5, "g"),
      it("Curry en poudre", 1, "cc"),
      it("Huile de colza", 0.5, "cs"),
      it("Riz basmati", 70, "g"),
      it("Coriandre", 0.1, "botte"),
    ],
    steps: [
      "Faites cuire le riz.",
      "Faites revenir l'oignon, l'ail et le gingembre hachés dans l'huile avec le curry.",
      "Ajoutez les tomates, le lait de coco et les pois chiches égouttés.",
      "Laissez mijoter 15 minutes, puis ajoutez les épinards jusqu'à ce qu'ils tombent.",
      "Servez avec le riz et la coriandre.",
    ],
  },
  {
    name: "Wok de légumes au tofu",
    emoji: "🥢",
    description:
      "Des nouilles sautées avec des légumes croquants et du tofu doré.",
    tags: ["Asiatique", "Végé", "Healthy", "Express"],
    prepMinutes: 20,
    fridgeDays: 2,
    items: [
      it("Tofu nature", 100, "g"),
      it("Légumes pour wok surgelés", 200, "g"),
      it("Nouilles asiatiques", 80, "g"),
      it("Sauce soja", 1, "cs"),
      it("Gingembre", 5, "g"),
      it("Gousse d'ail", 0.5, "pc"),
      it("Huile de sésame", 0.5, "cs"),
      it("Oignons nouveaux", 0.15, "botte"),
    ],
    steps: [
      "Faites cuire les nouilles selon le paquet et égouttez-les.",
      "Coupez le tofu en cubes et faites-le dorer dans l'huile bien chaude.",
      "Ajoutez l'ail, le gingembre et les légumes, puis faites sauter 5 minutes à feu vif.",
      "Ajoutez les nouilles et la sauce soja, et mélangez 1 minute.",
      "Servez parsemé d'oignons nouveaux émincés.",
    ],
  },
  {
    name: "Nouilles sautées au bœuf et brocoli",
    emoji: "🥡",
    description:
      "Du bœuf saisi, du brocoli et une sauce soja légèrement sucrée.",
    tags: ["Asiatique", "Familial"],
    prepMinutes: 25,
    fridgeDays: 2,
    items: [
      it("Émincé de bœuf", 110, "g"),
      it("Nouilles asiatiques", 80, "g"),
      it("Brocoli", 100, "g"),
      it("Sauce soja", 1.5, "cs"),
      it("Miel", 0.25, "cs"),
      it("Fécule de maïs", 0.25, "cs"),
      it("Gingembre", 5, "g"),
      it("Gousse d'ail", 0.5, "pc"),
      it("Huile de sésame", 0.5, "cs"),
    ],
    steps: [
      "Mélangez la viande avec la fécule et la moitié de la sauce soja.",
      "Faites cuire les nouilles et blanchissez le brocoli 3 minutes.",
      "Saisissez la viande à feu vif dans l'huile, puis réservez-la.",
      "Faites sauter l'ail, le gingembre et le brocoli, puis ajoutez les nouilles, la viande, le miel et le reste de sauce soja.",
      "Mélangez 1 minute et servez aussitôt.",
    ],
  },
  {
    name: "Riz cantonais aux crevettes",
    emoji: "🍚",
    description:
      "Une bonne façon d'utiliser le riz de la veille, avec œufs, petits pois et crevettes.",
    tags: ["Asiatique", "Familial"],
    prepMinutes: 25,
    fridgeDays: 2,
    items: [
      it("Riz basmati", 70, "g"),
      it("Crevettes décortiquées", 60, "g"),
      it("Œufs", 1, "pc"),
      it("Petits pois surgelés", 40, "g"),
      it("Jambon cuit", 30, "g"),
      it("Oignons nouveaux", 0.15, "botte"),
      it("Sauce soja", 1, "cs"),
      it("Huile de colza", 1, "cs"),
    ],
    steps: [
      "Faites cuire le riz la veille ou laissez-le bien refroidir.",
      "Faites cuire les œufs battus en omelette fine, puis coupez-la en lanières.",
      "Faites sauter les crevettes et le jambon en dés dans l'huile chaude.",
      "Ajoutez le riz et les petits pois, et faites sauter 5 minutes à feu vif.",
      "Ajoutez la sauce soja, l'omelette et les oignons nouveaux, puis servez.",
    ],
  },
  {
    name: "Bowl au saumon façon poké",
    emoji: "🍣",
    description:
      "Riz, saumon cru mariné, avocat et crudités, pour une soirée fraîche.",
    tags: ["Asiatique", "Poisson", "Healthy", "Été"],
    prepMinutes: 30,
    fridgeDays: 1,
    items: [
      it("Filet de saumon", 120, "g"),
      it("Riz basmati", 70, "g"),
      it("Avocat", 0.5, "pc"),
      it("Concombre", 0.25, "pc"),
      it("Carottes", 40, "g"),
      it("Sauce soja", 1.5, "cs"),
      it("Huile de sésame", 0.5, "cs"),
      it("Citron vert", 0.25, "pc"),
      it("Oignons nouveaux", 0.1, "botte"),
    ],
    steps: [
      "Faites cuire le riz et laissez-le tiédir.",
      "Coupez le saumon très frais en cubes et faites-le mariner 10 minutes dans la sauce soja, l'huile et le citron vert.",
      "Taillez l'avocat, le concombre et la carotte en fines tranches.",
      "Répartissez le riz dans des bols et disposez le saumon et les légumes par-dessus.",
      "Parsemez d'oignons nouveaux et servez aussitôt.",
    ],
  },

  // --- Poisson ----------------------------------------------------------------
  {
    name: "Saumon au four, citron et brocoli",
    emoji: "🐟",
    description:
      "Un pavé de saumon cuit au four avec du brocoli et du riz, sans rien à surveiller.",
    tags: ["Poisson", "Four", "Healthy"],
    prepMinutes: 25,
    fridgeDays: 2,
    items: [
      it("Filet de saumon", 140, "g"),
      it("Brocoli", 150, "g"),
      it("Citron", 0.25, "pc"),
      it("Aneth", 0.1, "botte"),
      it("Huile d'olive", 0.5, "cs"),
      it("Riz basmati", 60, "g"),
      it("Sel", 1, "pincée"),
    ],
    steps: [
      "Préchauffez le four à 200 degrés et lancez la cuisson du riz.",
      "Posez le saumon et les bouquets de brocoli sur une plaque, arrosez d'huile et salez.",
      "Ajoutez des rondelles de citron sur le poisson.",
      "Enfournez 15 minutes.",
      "Parsemez d'aneth et servez avec le riz.",
    ],
  },
  {
    name: "Cabillaud en papillote",
    emoji: "🐠",
    description:
      "Du poisson blanc cuit en papillote avec courgettes et tomates cerises.",
    tags: ["Poisson", "Healthy", "Four"],
    prepMinutes: 35,
    fridgeDays: 2,
    items: [
      it("Filet de cabillaud", 150, "g"),
      it("Courgettes", 100, "g"),
      it("Tomates cerises", 60, "g"),
      it("Citron", 0.25, "pc"),
      it("Herbes de Provence", 0.25, "cc"),
      it("Huile d'olive", 0.5, "cs"),
      it("Pommes de terre", 150, "g"),
    ],
    steps: [
      "Faites cuire les pommes de terre à la vapeur.",
      "Préchauffez le four à 200 degrés.",
      "Posez sur une feuille de papier cuisson les courgettes en rondelles, les tomates et le poisson.",
      "Ajoutez le citron, les herbes et l'huile, puis refermez bien la papillote.",
      "Enfournez 18 minutes et servez avec les pommes de terre.",
    ],
  },
  {
    name: "Tagliatelles au saumon fumé",
    emoji: "🍝",
    description:
      "Des pâtes dans une sauce légère à la crème, au citron et à l'aneth.",
    tags: ["Poisson", "Italien", "Express"],
    prepMinutes: 20,
    fridgeDays: 1,
    items: [
      it("Tagliatelles", 110, "g"),
      it("Saumon fumé", 50, "g"),
      it("Demi-crème", 60, "ml"),
      it("Échalote", 0.25, "pc"),
      it("Citron", 0.15, "pc"),
      it("Aneth", 0.1, "botte"),
      it("Poivre noir", 1, "pincée"),
    ],
    steps: [
      "Faites cuire les tagliatelles dans l'eau salée.",
      "Faites suer l'échalote hachée dans une poêle.",
      "Ajoutez la crème et le zeste de citron, puis laissez frémir 2 minutes.",
      "Ajoutez les pâtes égouttées et le saumon en lanières hors du feu.",
      "Poivrez, parsemez d'aneth et servez.",
    ],
  },
  {
    name: "Salade niçoise",
    emoji: "🥗",
    description:
      "Thon, œufs durs, haricots verts et tomates, une grande salade pour les soirs d'été.",
    tags: ["Été", "Poisson", "Healthy"],
    prepMinutes: 30,
    fridgeDays: 1,
    items: [
      it("Thon en boîte", 0.5, "boîte"),
      it("Œufs", 1, "pc"),
      it("Haricots verts", 80, "g"),
      it("Tomates", 100, "g"),
      it("Pommes de terre", 100, "g"),
      it("Olives noires", 15, "g"),
      it("Laitue", 0.2, "pc"),
      it("Oignon rouge", 0.15, "pc"),
      it("Huile d'olive", 1, "cs"),
      it("Vinaigre de vin", 0.5, "cs"),
      it("Moutarde mi-forte", 0.25, "cc"),
    ],
    steps: [
      "Faites cuire les pommes de terre et les œufs durs, puis laissez refroidir.",
      "Faites cuire les haricots verts 6 minutes et plongez-les dans l'eau froide.",
      "Préparez la vinaigrette avec l'huile, le vinaigre et la moutarde.",
      "Disposez la salade, les légumes, les œufs en quartiers, le thon et les olives.",
      "Arrosez de vinaigrette au moment de servir.",
    ],
  },

  // --- Végé et légers --------------------------------------------------------
  {
    name: "Risotto aux champignons",
    emoji: "🍄",
    description:
      "Un risotto crémeux aux champignons de Paris, à remuer tranquillement.",
    tags: ["Italien", "Végé", "Réconfort"],
    prepMinutes: 35,
    fridgeDays: 2,
    items: [
      it("Riz arborio", 80, "g"),
      it("Champignons de Paris", 100, "g"),
      it("Échalote", 0.5, "pc"),
      it("Vin blanc sec", 40, "ml"),
      it("Bouillon de légumes", 300, "ml"),
      it("Parmesan", 25, "g"),
      it("Beurre", 15, "g"),
      it("Persil", 0.1, "botte"),
    ],
    steps: [
      "Faites chauffer le bouillon et gardez-le frémissant.",
      "Faites revenir l'échalote et les champignons émincés dans la moitié du beurre.",
      "Ajoutez le riz et remuez jusqu'à ce qu'il devienne nacré, puis versez le vin blanc.",
      "Ajoutez le bouillon louche par louche en remuant, pendant 18 minutes.",
      "Hors du feu, incorporez le reste du beurre et le parmesan, puis parsemez de persil.",
    ],
  },
  {
    name: "Soupe à la courge",
    emoji: "🎃",
    description:
      "Un velouté orange tout doux, avec une pointe de gingembre et du pain grillé.",
    tags: ["Soupe", "Végé", "Hiver", "Healthy"],
    prepMinutes: 40,
    fridgeDays: 4,
    items: [
      it("Courge butternut", 250, "g"),
      it("Carottes", 50, "g"),
      it("Oignon", 0.25, "pc"),
      it("Gingembre", 3, "g"),
      it("Bouillon de légumes", 250, "ml"),
      it("Demi-crème", 30, "ml"),
      it("Noix de muscade", 1, "pincée"),
      it("Pain mi-blanc", 50, "g"),
    ],
    steps: [
      "Épluchez la courge et les carottes, puis coupez-les en cubes.",
      "Faites revenir l'oignon et le gingembre, puis ajoutez les légumes.",
      "Versez le bouillon et laissez cuire 25 minutes.",
      "Mixez avec la crème et la muscade.",
      "Servez avec le pain grillé.",
    ],
  },
  {
    name: "Soupe de lentilles corail",
    emoji: "🥣",
    description:
      "Une soupe épaisse et épicée, prête en peu de temps et qui tient au corps.",
    tags: ["Soupe", "Végé", "Healthy", "Hiver"],
    prepMinutes: 35,
    fridgeDays: 4,
    items: [
      it("Lentilles corail", 60, "g"),
      it("Carottes", 60, "g"),
      it("Oignon", 0.25, "pc"),
      it("Tomates concassées", 0.25, "boîte"),
      it("Lait de coco", 50, "ml"),
      it("Cumin moulu", 0.5, "cc"),
      it("Bouillon de légumes", 250, "ml"),
      it("Citron", 0.15, "pc"),
    ],
    steps: [
      "Faites revenir l'oignon et les carottes en dés avec le cumin.",
      "Ajoutez les lentilles rincées, les tomates et le bouillon.",
      "Laissez cuire 20 minutes, jusqu'à ce que les lentilles se défassent.",
      "Ajoutez le lait de coco et mixez à moitié.",
      "Servez avec un filet de jus de citron.",
    ],
  },
  {
    name: "Minestrone",
    emoji: "🍲",
    description:
      "Une soupe de légumes, de haricots et de petites pâtes, avec une touche de pesto.",
    tags: ["Soupe", "Italien", "Végé"],
    prepMinutes: 50,
    fridgeDays: 4,
    items: [
      it("Courgettes", 60, "g"),
      it("Carottes", 50, "g"),
      it("Poireaux", 50, "g"),
      it("Céleri branche", 30, "g"),
      it("Haricots blancs", 0.25, "boîte"),
      it("Tomates concassées", 0.25, "boîte"),
      it("Cornettes", 30, "g"),
      it("Bouillon de légumes", 300, "ml"),
      it("Huile d'olive", 0.5, "cs"),
      it("Parmesan", 15, "g"),
      it("Pesto vert", 10, "g"),
    ],
    steps: [
      "Coupez tous les légumes en petits dés.",
      "Faites-les revenir 5 minutes dans l'huile d'olive.",
      "Ajoutez les tomates et le bouillon, puis laissez cuire 20 minutes.",
      "Ajoutez les haricots égouttés et les pâtes, et prolongez de 10 minutes.",
      "Servez avec une cuillerée de pesto et du parmesan râpé.",
    ],
  },
  {
    name: "Bowl de quinoa et légumes rôtis",
    emoji: "🥙",
    description:
      "Quinoa, patate douce rôtie, pois chiches et feta, avec un filet de citron.",
    tags: ["Healthy", "Végé", "Four"],
    prepMinutes: 40,
    fridgeDays: 2,
    items: [
      it("Quinoa", 60, "g"),
      it("Patate douce", 120, "g"),
      it("Pois chiches", 0.25, "boîte"),
      it("Épinards frais", 30, "g"),
      it("Avocat", 0.5, "pc"),
      it("Feta", 40, "g"),
      it("Cumin moulu", 0.25, "cc"),
      it("Huile d'olive", 1, "cs"),
      it("Citron", 0.25, "pc"),
    ],
    steps: [
      "Préchauffez le four à 200 degrés.",
      "Coupez la patate douce en cubes, mélangez avec les pois chiches, le cumin et la moitié de l'huile.",
      "Enfournez 25 minutes en remuant à mi-cuisson.",
      "Faites cuire le quinoa 15 minutes dans l'eau salée.",
      "Répartissez quinoa, épinards, légumes rôtis, avocat et feta dans les bols, puis arrosez de citron et d'huile.",
    ],
  },
  {
    name: "Taboulé aux herbes",
    emoji: "🌿",
    description:
      "Beaucoup d'herbes, de la semoule, des tomates et du citron, très frais.",
    tags: ["Été", "Végé", "Healthy", "Express"],
    prepMinutes: 20,
    fridgeDays: 1,
    items: [
      it("Semoule de couscous", 60, "g"),
      it("Tomates", 80, "g"),
      it("Concombre", 0.25, "pc"),
      it("Persil", 0.25, "botte"),
      it("Menthe", 0.15, "botte"),
      it("Oignons nouveaux", 0.1, "botte"),
      it("Citron", 0.5, "pc"),
      it("Huile d'olive", 1, "cs"),
    ],
    steps: [
      "Versez la même quantité d'eau bouillante salée sur la semoule et laissez gonfler 5 minutes.",
      "Égrainez-la à la fourchette et laissez refroidir.",
      "Coupez les tomates et le concombre en petits dés, puis hachez les herbes.",
      "Mélangez le tout avec le jus de citron et l'huile d'olive.",
      "Réservez au frais jusqu'au moment de servir.",
    ],
  },
  {
    name: "Salade de pâtes d'été",
    emoji: "🥗",
    description:
      "Des penne, des tomates cerises, de la mozzarella et du basilic, à emporter partout.",
    tags: ["Été", "Végé", "Italien"],
    prepMinutes: 20,
    fridgeDays: 1,
    items: [
      it("Penne", 90, "g"),
      it("Tomates cerises", 80, "g"),
      it("Mozzarella", 50, "g"),
      it("Olives noires", 15, "g"),
      it("Basilic", 0.1, "botte"),
      it("Huile d'olive", 1, "cs"),
      it("Vinaigre balsamique", 0.5, "cs"),
    ],
    steps: [
      "Faites cuire les penne, puis rincez-les à l'eau froide.",
      "Coupez les tomates cerises en deux et la mozzarella en dés.",
      "Mélangez les pâtes avec les tomates, la mozzarella et les olives.",
      "Assaisonnez avec l'huile, le vinaigre et le basilic ciselé.",
    ],
  },

  // --- Express (20 minutes ou moins) --------------------------------------------
  {
    name: "Gnocchi tomate et mozzarella",
    emoji: "🍅",
    description:
      "Des gnocchi poêlés dans une sauce tomate, avec de la mozzarella qui file.",
    tags: ["Italien", "Express", "Végé"],
    prepMinutes: 15,
    fridgeDays: 2,
    items: [
      it("Gnocchi", 200, "g"),
      it("Passata de tomates", 100, "ml"),
      it("Mozzarella", 50, "g"),
      it("Gousse d'ail", 0.25, "pc"),
      it("Basilic", 0.1, "botte"),
      it("Huile d'olive", 0.5, "cs"),
    ],
    steps: [
      "Faites dorer les gnocchi dans l'huile d'olive, environ 5 minutes.",
      "Ajoutez l'ail haché et la passata, puis laissez frémir 5 minutes.",
      "Répartissez la mozzarella en morceaux et couvrez 2 minutes pour qu'elle fonde.",
      "Parsemez de basilic et servez.",
    ],
  },
  {
    name: "Penne au pesto et tomates cerises",
    emoji: "🌿",
    description:
      "Des pâtes, du pesto et des tomates cerises, prêtes le temps de cuire les penne.",
    tags: ["Express", "Végé", "Italien", "Été"],
    prepMinutes: 15,
    fridgeDays: 2,
    items: [
      it("Penne", 110, "g"),
      it("Pesto vert", 30, "g"),
      it("Tomates cerises", 80, "g"),
      it("Parmesan", 15, "g"),
      it("Basilic", 0.05, "botte"),
    ],
    steps: [
      "Faites cuire les penne dans l'eau salée.",
      "Coupez les tomates cerises en deux.",
      "Égouttez les pâtes en gardant un peu d'eau de cuisson.",
      "Mélangez avec le pesto, un peu d'eau de cuisson et les tomates.",
      "Servez avec le parmesan et quelques feuilles de basilic.",
    ],
  },
  {
    name: "Spaghetti carbonara",
    emoji: "🥓",
    description:
      "Lardons, œufs et parmesan, sans crème, pour un souper vite fait.",
    tags: ["Italien", "Express"],
    prepMinutes: 20,
    fridgeDays: 1,
    items: [
      it("Spaghetti", 120, "g"),
      it("Lardons fumés", 50, "g"),
      it("Œufs", 1, "pc"),
      it("Parmesan", 25, "g"),
      it("Poivre noir", 2, "pincée"),
    ],
    steps: [
      "Faites cuire les spaghetti dans l'eau salée.",
      "Faites dorer les lardons à la poêle sans matière grasse.",
      "Battez les œufs avec le parmesan et beaucoup de poivre.",
      "Hors du feu, mélangez les pâtes égouttées avec les lardons, puis avec les œufs et un peu d'eau de cuisson.",
      "Remuez jusqu'à obtenir une sauce crémeuse et servez aussitôt.",
    ],
  },
  {
    name: "Croque-monsieur et salade",
    emoji: "🥪",
    description:
      "Pain toast, jambon et gruyère dorés au four, avec une salade verte.",
    tags: ["Express", "Familial"],
    prepMinutes: 20,
    fridgeDays: 1,
    items: [
      it("Pain toast", 80, "g"),
      it("Jambon cuit", 40, "g"),
      it("Gruyère AOP", 40, "g"),
      it("Beurre", 10, "g"),
      it("Laitue", 0.2, "pc"),
      it("Huile d'olive", 0.5, "cs"),
      it("Vinaigre balsamique", 0.5, "cs"),
    ],
    steps: [
      "Préchauffez le four à 220 degrés.",
      "Beurrez les tranches de pain sur une face.",
      "Garnissez de jambon et de gruyère, refermez, puis ajoutez un peu de fromage sur le dessus.",
      "Enfournez 10 minutes, jusqu'à ce que ce soit bien doré.",
      "Servez avec la salade assaisonnée.",
    ],
  },
  {
    name: "Omelette aux fines herbes et rampon",
    emoji: "🍳",
    description:
      "Une omelette baveuse aux herbes, un peu de rampon et une tranche de pain.",
    tags: ["Express", "Végé"],
    prepMinutes: 15,
    fridgeDays: 1,
    items: [
      it("Œufs", 2, "pc"),
      it("Ciboulette", 0.1, "botte"),
      it("Persil", 0.1, "botte"),
      it("Beurre", 5, "g"),
      it("Rampon", 50, "g"),
      it("Huile de colza", 1, "cs"),
      it("Vinaigre de vin", 0.5, "cs"),
      it("Pain mi-blanc", 60, "g"),
      it("Sel", 1, "pincée"),
    ],
    steps: [
      "Lavez et essorez le rampon.",
      "Battez les œufs avec les herbes ciselées et le sel.",
      "Faites cuire l'omelette dans le beurre à feu moyen en ramenant les bords vers le centre.",
      "Pliez-la quand le dessus est encore un peu baveux.",
      "Servez avec le rampon assaisonné et le pain.",
    ],
  },
];

// ---------------------------------------------------------------------------
// Stores around Fribourg
// ---------------------------------------------------------------------------

export const STORES: SeedStore[] = [
  {
    chain: "Aldi",
    name: "Aldi Marly",
    priceFactor: 0.82,
    aisleOrder: [
      "boulangerie",
      "fruits-legumes",
      "petit-dej",
      "pates-riz",
      "conserves",
      "huiles",
      "epices",
      "laitiers",
      "fromages",
      "charcuterie",
      "boucherie",
      "poissonnerie",
      "surgeles",
      "boissons",
      "menage",
    ],
  },
  {
    chain: "Lidl",
    name: "Lidl Villars-sur-Glâne",
    priceFactor: 0.82,
    aisleOrder: [
      "fruits-legumes",
      "boulangerie",
      "laitiers",
      "fromages",
      "charcuterie",
      "boucherie",
      "poissonnerie",
      "pates-riz",
      "conserves",
      "epices",
      "huiles",
      "petit-dej",
      "surgeles",
      "menage",
      "boissons",
    ],
  },
  {
    chain: "Coop",
    name: "Coop Fribourg Centre",
    priceFactor: 1.05,
    aisleOrder: [
      "fruits-legumes",
      "boulangerie",
      "fromages",
      "laitiers",
      "charcuterie",
      "boucherie",
      "poissonnerie",
      "pates-riz",
      "conserves",
      "huiles",
      "epices",
      "petit-dej",
      "surgeles",
      "boissons",
      "menage",
    ],
  },
  {
    chain: "Migros",
    name: "Migros Avry",
    priceFactor: 1.0,
    aisleOrder: [
      "fruits-legumes",
      "laitiers",
      "fromages",
      "charcuterie",
      "boucherie",
      "poissonnerie",
      "boulangerie",
      "petit-dej",
      "pates-riz",
      "conserves",
      "epices",
      "huiles",
      "surgeles",
      "menage",
      "boissons",
    ],
  },
  {
    chain: "Denner",
    name: "Denner Marly",
    priceFactor: 0.88,
    aisleOrder: [
      "boissons",
      "fruits-legumes",
      "boulangerie",
      "pates-riz",
      "conserves",
      "epices",
      "huiles",
      "petit-dej",
      "menage",
      "laitiers",
      "fromages",
      "charcuterie",
      "boucherie",
      "poissonnerie",
      "surgeles",
    ],
  },
];

// ---------------------------------------------------------------------------
// Family members
// ---------------------------------------------------------------------------

export const MEMBERS: SeedMember[] = [
  { name: "Pierre-Alain", emoji: "🐻", color: "#A8C8E8" },
  { name: "Patricia", emoji: "🌻", color: "#F5C6A5" },
  { name: "Clara", emoji: "🦄", color: "#CDB8E6" },
];

// ---------------------------------------------------------------------------
// Usual non-recipe items (household, hygiene, breakfast…)
// ---------------------------------------------------------------------------

export interface SeedStaple {
  name: string;
  aisle: string; // SeedAisle.key
}

export const STAPLES: SeedStaple[] = [
  { name: "Papier toilette", aisle: "menage" },
  { name: "Essuie-tout", aisle: "menage" },
  { name: "Mouchoirs", aisle: "menage" },
  { name: "Lessive", aisle: "menage" },
  { name: "Assouplissant", aisle: "menage" },
  { name: "Liquide vaisselle", aisle: "menage" },
  { name: "Tablettes lave-vaisselle", aisle: "menage" },
  { name: "Éponges", aisle: "menage" },
  { name: "Sacs taxés 35 l", aisle: "menage" },
  { name: "Sacs congélation", aisle: "menage" },
  { name: "Film alimentaire", aisle: "menage" },
  { name: "Papier aluminium", aisle: "menage" },
  { name: "Nettoyant multi-usage", aisle: "menage" },
  { name: "Dentifrice", aisle: "menage" },
  { name: "Brosses à dents", aisle: "menage" },
  { name: "Gel douche", aisle: "menage" },
  { name: "Shampoing", aisle: "menage" },
  { name: "Savon pour les mains", aisle: "menage" },
  { name: "Déodorant", aisle: "menage" },
  { name: "Café en grains", aisle: "petit-dej" },
  { name: "Capsules de café", aisle: "petit-dej" },
  { name: "Thé", aisle: "petit-dej" },
  { name: "Confiture", aisle: "petit-dej" },
  { name: "Céréales", aisle: "petit-dej" },
  { name: "Lait entier", aisle: "laitiers" },
  { name: "Beurre de table", aisle: "laitiers" },
  { name: "Yogourts", aisle: "laitiers" },
  { name: "Pain", aisle: "boulangerie" },
  { name: "Eau minérale", aisle: "boissons" },
  { name: "Jus d'orange", aisle: "boissons" },
  { name: "Fruits pour la semaine", aisle: "fruits-legumes" },
];
