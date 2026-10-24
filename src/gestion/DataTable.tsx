import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import {
  sortRows,
  type SortDirection,
  type SortValue,
} from "../../convex/domain/sort";
import { cx } from "../components/ui";

export interface Column<T> {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  /** Value used to sort; the column is not sortable without it. */
  sort?: (row: T) => SortValue;
  align?: "right" | "center";
  className?: string;
}

/** Wide table with sortable headers; a click (or Enter) on a row opens it. */
export function DataTable<T>({
  rows,
  columns,
  rowKey,
  onOpen,
  openLabel,
  initialSort,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  onOpen: (row: T) => void;
  /** Accessible name of a row, « Modifier Riz ». */
  openLabel: (row: T) => string;
  initialSort?: { key: string; direction: SortDirection };
}) {
  const [sort, setSort] = useState(
    initialSort ?? { key: columns[0].key, direction: "asc" as SortDirection },
  );
  const column = columns.find((c) => c.key === sort.key);
  const sorted = column?.sort
    ? sortRows(rows, column.sort, sort.direction)
    : rows;

  const toggle = (key: string) =>
    setSort((s) =>
      s.key === key
        ? { key, direction: s.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );

  return (
    <div className="overflow-x-auto rounded-2xl bg-paper ring-1 ring-line">
      <table className="w-full border-collapse text-left text-[15px]">
        <thead className="sticky top-0 z-10 bg-paper">
          <tr className="border-b border-line">
            {columns.map((c) => {
              const active = sort.key === c.key;
              return (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={
                    active
                      ? sort.direction === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                  className={cx(
                    "px-3 py-2 text-[13px] font-extrabold whitespace-nowrap text-muted",
                    c.align === "right" && "text-right",
                    c.align === "center" && "text-center",
                  )}
                >
                  {c.sort ? (
                    <button
                      type="button"
                      onClick={() => toggle(c.key)}
                      className={cx(
                        "inline-flex min-h-9 items-center gap-1 rounded-lg px-1 hover:text-ink",
                        active && "text-ink",
                      )}
                    >
                      {c.label}
                      {active &&
                        (sort.direction === "asc" ? (
                          <ArrowUp size={14} />
                        ) : (
                          <ArrowDown size={14} />
                        ))}
                    </button>
                  ) : (
                    c.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {sorted.map((row) => (
            <tr
              key={rowKey(row)}
              tabIndex={0}
              aria-label={openLabel(row)}
              onClick={() => onOpen(row)}
              onKeyDown={(e) => {
                // Keys pressed on a button inside the row stay with that button
                if (e.target !== e.currentTarget) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onOpen(row);
                }
              }}
              className="cursor-pointer outline-none hover:bg-cream focus-visible:bg-carrot-soft"
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cx(
                    "px-3 py-2 align-middle",
                    c.align && "whitespace-nowrap",
                    c.align === "right" && "text-right tabular-nums",
                    c.align === "center" && "text-center",
                    c.className,
                  )}
                >
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Thumbnail of a photo, or an emoji on a soft background when there is none. */
export function Thumb({ url, emoji }: { url?: string | null; emoji: string }) {
  return url ? (
    <img
      src={url}
      alt=""
      loading="lazy"
      className="size-10 shrink-0 rounded-lg bg-cream object-cover"
    />
  ) : (
    <span
      className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-carrot-soft text-xl"
      aria-hidden
    >
      {emoji}
    </span>
  );
}
