/** A sortable cell value; null and undefined mean « empty » and always sort last. */
export type SortValue = string | number | boolean | null | undefined;

export type SortDirection = "asc" | "desc";

/** French order for text (accents, case), numeric order otherwise. */
export function compareValues(a: SortValue, b: SortValue): number {
  const emptyA = a === null || a === undefined || a === "";
  const emptyB = b === null || b === undefined || b === "";
  if (emptyA || emptyB) return Number(emptyA) - Number(emptyB);
  if (typeof a === "string" && typeof b === "string")
    return a.localeCompare(b, "fr", { sensitivity: "base", numeric: true });
  return Number(a) - Number(b);
}

/**
 * Stable sort of table rows by one column. Empty cells stay at the bottom in
 * both directions, so « no price » never pushes real prices off screen.
 */
export function sortRows<T>(
  rows: readonly T[],
  value: (row: T) => SortValue,
  direction: SortDirection,
): T[] {
  const sign = direction === "asc" ? 1 : -1;
  return rows
    .map((row, index) => ({ row, index, v: value(row) }))
    .sort((x, y) => {
      const emptyX = x.v === null || x.v === undefined || x.v === "";
      const emptyY = y.v === null || y.v === undefined || y.v === "";
      if (emptyX !== emptyY) return emptyX ? 1 : -1;
      return sign * compareValues(x.v, y.v) || x.index - y.index;
    })
    .map((x) => x.row);
}
