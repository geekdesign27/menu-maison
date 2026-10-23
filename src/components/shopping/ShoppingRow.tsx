import { useRef } from "react";
import { Check, MoreHorizontal, Trash2 } from "lucide-react";
import type { ShoppingItem } from "../../../convex/domain/shopping";
import type { Member } from "../../lib/session";
import { Avatar, cx, IconButton } from "../ui";

const LONG_PRESS_MS = 500;

/** One big tappable line of the shopping list. */
export function ShoppingRow({
  item,
  checker,
  onToggle,
  onMore,
  onRemove,
}: {
  item: ShoppingItem;
  checker?: Member;
  onToggle: () => void;
  onMore?: () => void;
  onRemove?: () => void;
}) {
  const timer = useRef<number | undefined>(undefined);
  const longPressed = useRef(false);

  const startPress = () => {
    longPressed.current = false;
    if (!onMore) return;
    timer.current = window.setTimeout(() => {
      longPressed.current = true;
      navigator.vibrate?.(15);
      onMore();
    }, LONG_PRESS_MS);
  };
  const cancelPress = () => window.clearTimeout(timer.current);

  return (
    <li className="flex items-stretch">
      <button
        type="button"
        role="checkbox"
        aria-checked={item.checked}
        onClick={() => {
          // A long press opened the aisle sheet: do not also toggle
          if (longPressed.current) longPressed.current = false;
          else onToggle();
        }}
        onPointerDown={startPress}
        onPointerUp={cancelPress}
        onPointerLeave={cancelPress}
        onPointerCancel={cancelPress}
        onContextMenu={(e) => onMore && e.preventDefault()}
        className="flex min-h-16 min-w-0 flex-1 items-center gap-3 py-2.5 pr-2 pl-4 text-left transition select-none [-webkit-touch-callout:none] active:bg-cream"
      >
        <span
          aria-hidden
          className={cx(
            "flex size-8 shrink-0 items-center justify-center rounded-full transition",
            item.checked
              ? "animate-pop bg-herb text-white"
              : "bg-paper ring-[2.5px] ring-line ring-inset",
          )}
        >
          {item.checked && <Check size={20} strokeWidth={3.5} />}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={cx(
              "block text-[17px] leading-snug font-extrabold break-words",
              item.checked && "text-muted line-through decoration-2",
            )}
          >
            {item.label}
          </span>
          {item.recipes.length > 0 && (
            <span className="block truncate text-[15px] text-muted">
              {item.recipes.join(", ")}
            </span>
          )}
        </span>
        {item.display && (
          <span
            className={cx(
              "shrink-0 rounded-xl px-2.5 py-1 text-[16px] font-black whitespace-nowrap tabular-nums",
              item.checked
                ? "bg-line/60 text-muted"
                : "bg-carrot-soft text-carrot-dark",
            )}
          >
            {item.display}
          </span>
        )}
        {item.checked && checker && <Avatar member={checker} size={26} />}
      </button>
      {onRemove && (
        <IconButton
          label={`Supprimer ${item.label}`}
          onClick={onRemove}
          className="my-auto mr-1 text-muted"
        >
          <Trash2 size={20} />
        </IconButton>
      )}
      {onMore && (
        <IconButton
          label={`Changer le rayon dans ce magasin : ${item.label}`}
          onClick={onMore}
          className="my-auto mr-1 text-muted"
        >
          <MoreHorizontal size={22} />
        </IconButton>
      )}
    </li>
  );
}
