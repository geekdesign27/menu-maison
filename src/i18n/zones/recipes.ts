// Recipes: list, detail, editor, import, dictation, ingredients, products, Open Food Facts.
// Keys start with « recipes. ». German: Swiss spelling (« ss », never « ß »), « du ».

export const fr = {} as const;

export const de: { [K in keyof typeof fr]: string } = {};
