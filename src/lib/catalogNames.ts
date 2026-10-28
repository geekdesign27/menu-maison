import type { Lang } from "../../convex/domain/lang";

/**
 * A German profile sees the catalogue (products, aisles, usual items) under its
 * German names: `name` becomes the name to show, `nameFr` keeps the family's
 * French name. Editors change the French name with `frenchName`, never `name`.
 */
export type Localized<T> = T & { nameFr?: string };

export function localize<T extends { name: string; nameDe?: string }>(
  items: T[],
  lang: Lang,
): Localized<T>[] {
  // Always a new array: callers sort it, the cached query result stays as is
  if (lang !== "de") return [...items];
  return items.map((i) => (i.nameDe ? { ...i, name: i.nameDe, nameFr: i.name } : i));
}

/** The French name of an item of the catalogue, shown or not. */
export function frenchName(item: { name: string; nameFr?: string }): string {
  return item.nameFr ?? item.name;
}

/** Both names, for searches: « Zwiebel » and « Oignon » find the same product. */
export function searchText(item: {
  name: string;
  nameFr?: string;
  nameDe?: string;
}): string {
  return [item.name, item.nameFr, item.nameDe].filter(Boolean).join(" ");
}

/**
 * Names to save from the two fields of an editor. The French name is the
 * family's name: an item named only in German gets that name in French too.
 */
export function namesToSave(name: string, nameDe: string) {
  const de = nameDe.trim();
  return { name: name.trim() || de, nameDe: de };
}
