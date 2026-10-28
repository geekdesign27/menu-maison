// The tour, step by step: the screen to show, the element the bubble points at
// (a `data-tour` attribute on the real screen) and the text.

export interface TourStep {
  /** Screen shown behind the bubble. */
  route: string;
  /** Button tapped by the tour first, to open a sheet (nothing is saved). */
  open?: string;
  /** Element the bubble points at; missing or absent = bubble in the middle. */
  target?: string;
  title: string;
  text: string;
}

const MEMBER_STEPS: TourStep[] = [
  {
    route: "/",
    target: '[data-tour="add-meal"]',
    title: "La semaine",
    text: "Ici, les repas de la semaine. Touche « + Ajouter » pour poser un plat.",
  },
  {
    route: "/",
    open: '[data-tour="add-meal"]',
    target: '[data-tour="picker-filters"]',
    title: "Choisir un plat",
    text: "Tes envies et les restes à finir sont en haut.",
  },
  {
    route: "/",
    // First dish of the week (the « Ajouter » buttons carry their own data-tour)
    open: '[data-tour="slot-meals"] > button:not([data-tour])',
    target: '[data-tour="meal-status"]',
    title: "La fiche du plat",
    text: "Après le repas : Mangé, Pas mangé, Il en reste ou Pas cuisiné.",
  },
  {
    route: "/courses",
    target: '[data-tour="stores"]',
    title: "Les courses",
    text: "La liste se fait toute seule, dans l'ordre des rayons de ton magasin.",
  },
  {
    route: "/frigo",
    target: '[data-tour="tab-frigo"]',
    title: "Le frigo",
    text: "Les restes, et ce qu'il faut utiliser avant que ça se perde.",
  },
  {
    route: "/recettes",
    target: '[data-tour="recipes"]',
    title: "Les recettes",
    text: "Dans Découvrir, like ce que tu aimes : ça aide à choisir les plats de la semaine.",
  },
];

const ADMIN_STEPS: TourStep[] = [
  {
    route: "/reglages",
    target: '[data-tour="profiles"]',
    title: "Profils et liens",
    text: "Ajoute les profils de la famille. Dans la fiche de chacun, section Accès : son pseudo, son rôle et son lien d'activation.",
  },
  {
    route: "/reglages",
    target: '[data-tour="shopping-day"]',
    title: "Jour des courses",
    text: "La semaine du planning commence ce jour-là, la liste de courses couvre les sept jours qui suivent.",
  },
];

/** Appearance is in Gestion, on a computer only: on a phone the bubble says where. */
function appearanceStep(wide: boolean): TourStep {
  return wide
    ? {
        route: "/gestion/famille",
        target: '[data-tour="look"]',
        title: "Apparence",
        text: "Trois thèmes et quatre polices, pour toute la famille, appliqués tout de suite sur tous les téléphones.",
      }
    : {
        route: "/plus",
        title: "Apparence",
        text: "Sur ordinateur, onglet Gestion, Famille : trois thèmes et quatre polices, pour toute la famille.",
      };
}

export function tourSteps(isAdmin: boolean, wide: boolean): TourStep[] {
  return isAdmin
    ? [...MEMBER_STEPS, ...ADMIN_STEPS, appearanceStep(wide)]
    : MEMBER_STEPS;
}
