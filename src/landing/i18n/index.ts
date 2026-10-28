// Texts of the landing page, apart from the app's dictionaries: the page loads
// on its own. One file per group of sections.
import * as shell from "./shell";
import * as story from "./story";
import * as shop from "./shop";
import * as family from "./family";

export const LANDING_FR = { ...shell.fr, ...story.fr, ...shop.fr, ...family.fr };
export type LandingKey = keyof typeof LANDING_FR;
export const LANDING_DE: Record<LandingKey, string> = { ...shell.de, ...story.de, ...shop.de, ...family.de };
