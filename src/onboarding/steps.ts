// The tour, step by step: the screen to show, the element the bubble points at
// (a `data-tour` attribute on the real screen) and the text.
import type { Lang } from "../../convex/domain/lang";
import { translate, type MessageKey } from "../i18n";

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

/** A step before translation: its texts are dictionary keys. */
type StepDef = Omit<TourStep, "title" | "text"> & {
  title: MessageKey;
  text: MessageKey;
};

const MEMBER_STEPS: StepDef[] = [
  {
    route: "/",
    target: '[data-tour="add-meal"]',
    title: "common.tour.weekTitle",
    text: "common.tour.weekText",
  },
  {
    route: "/",
    open: '[data-tour="add-meal"]',
    target: '[data-tour="picker-filters"]',
    title: "common.tour.pickTitle",
    text: "common.tour.pickText",
  },
  {
    route: "/",
    // First dish of the week (the « Ajouter » buttons carry their own data-tour)
    open: '[data-tour="slot-meals"] > button:not([data-tour])',
    target: '[data-tour="meal-status"]',
    title: "common.tour.mealTitle",
    text: "common.tour.mealText",
  },
  {
    route: "/courses",
    target: '[data-tour="stores"]',
    title: "common.tour.shoppingTitle",
    text: "common.tour.shoppingText",
  },
  {
    route: "/frigo",
    target: '[data-tour="tab-frigo"]',
    title: "common.tour.fridgeTitle",
    text: "common.tour.fridgeText",
  },
  {
    route: "/recettes",
    target: '[data-tour="recipes"]',
    title: "common.tour.recipesTitle",
    text: "common.tour.recipesText",
  },
];

const ADMIN_STEPS: StepDef[] = [
  {
    route: "/reglages",
    target: '[data-tour="profiles"]',
    title: "common.tour.profilesTitle",
    text: "common.tour.profilesText",
  },
];

/** Appearance is in Gestion, on a computer only: on a phone the bubble says where. */
function appearanceStep(wide: boolean): StepDef {
  return wide
    ? {
        route: "/gestion/famille",
        target: '[data-tour="look"]',
        title: "common.tour.lookTitle",
        text: "common.tour.lookText",
      }
    : {
        route: "/plus",
        title: "common.tour.lookTitle",
        text: "common.tour.lookPhoneText",
      };
}

export function tourSteps(
  isAdmin: boolean,
  wide: boolean,
  lang: Lang = "fr",
): TourStep[] {
  const steps = isAdmin
    ? [...MEMBER_STEPS, ...ADMIN_STEPS, appearanceStep(wide)]
    : MEMBER_STEPS;
  return steps.map((step) => ({
    ...step,
    title: translate(lang, step.title),
    text: translate(lang, step.text),
  }));
}
