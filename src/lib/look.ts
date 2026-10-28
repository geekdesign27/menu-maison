import type { Doc } from "../../convex/_generated/dataModel";

export type Theme = NonNullable<Doc<"settings">["theme"]>;
export type Font = NonNullable<Doc<"settings">["font"]>;
export interface Look {
  theme: Theme;
  font: Font;
}

/** The family themes, with the colours shown in their preview (see index.css). */
export const THEMES: {
  id: Theme;
  label: string;
  description: string;
  swatch: string[];
}[] = [
  {
    id: "carotte",
    label: "Carotte",
    description: "Orange chaleureux, l'original",
    swatch: ["#fff7ee", "#e8762f", "#fde9da", "#2f8a57"],
  },
  {
    id: "sauge",
    label: "Sauge",
    description: "Vert doux et frais",
    swatch: ["#f4f7f1", "#3f7a52", "#e0eee2", "#2a7a84"],
  },
  {
    id: "myrtille",
    label: "Myrtille",
    description: "Bleu-violet profond",
    swatch: ["#f7f6fd", "#5548c8", "#e8e5fb", "#2f8a57"],
  },
];

/** The family fonts, served by the app itself (Fontsource), never by Google. */
export const FONTS: {
  id: Font;
  label: string;
  description: string;
  family: string;
  load: () => Promise<unknown>;
}[] = [
  {
    id: "nunito",
    label: "Nunito",
    description: "Ronde et douce, l'originale",
    family: "Nunito Variable",
    load: () => Promise.resolve(),
  },
  {
    id: "quicksand",
    label: "Quicksand",
    description: "Légère et arrondie",
    family: "Quicksand Variable",
    load: () => import("@fontsource-variable/quicksand"),
  },
  {
    id: "lexend",
    label: "Lexend",
    description: "Nette, pensée pour la lecture",
    family: "Lexend Variable",
    load: () => import("@fontsource-variable/lexend"),
  },
  {
    id: "atkinson",
    label: "Atkinson Hyperlegible",
    description: "La plus lisible, lettres bien distinctes",
    family: "Atkinson Hyperlegible Next Variable",
    load: () => import("@fontsource-variable/atkinson-hyperlegible-next"),
  },
];

const LOOK_KEY = "mm.look";
const DEFAULT_LOOK: Look = { theme: "carotte", font: "nunito" };

/** Puts the look on the page: colours at once, the font as soon as it is downloaded. */
export function applyLook(look: Look) {
  const root = document.documentElement;
  const font = FONTS.find((f) => f.id === look.font) ?? FONTS[0];
  root.dataset.theme = look.theme;
  // Status bar and browser chrome follow the background of the theme
  const cream = THEMES.find((t) => t.id === look.theme)?.swatch[0];
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", cream ?? "#fff7ee");
  font
    .load()
    .then(() => {
      root.dataset.font = font.id;
    })
    // Offline before the font was ever loaded: keep the default one
    .catch(() => undefined);
}

/** The family look remembered on this phone, applied before the app is drawn (no orange flash). */
export function applyRememberedLook() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(LOOK_KEY) ?? "null",
    ) as Look | null;
    applyLook(
      saved &&
        THEMES.some((t) => t.id === saved.theme) &&
        FONTS.some((f) => f.id === saved.font)
        ? saved
        : DEFAULT_LOOK,
    );
  } catch {
    applyLook(DEFAULT_LOOK);
  }
}

export function rememberLook(look: Look) {
  try {
    localStorage.setItem(LOOK_KEY, JSON.stringify(look));
  } catch {
    // Private mode: the look is applied again at each opening
  }
}
