// Shopping list, usual items, receipts, fridge, stores and aisles.
// Keys start with « shopping. ». German: Swiss spelling (« ss », never « ß »), « du ».

export const fr = {} as const;

export const de: { [K in keyof typeof fr]: string } = {};
