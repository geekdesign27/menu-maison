import { formatDayShort } from "../../../convex/domain/dates";
import { useRef } from "react";
import { Check, MoreHorizontal } from "lucide-react";
import type { ShoppingItem } from "../../../convex/domain/shopping";
import type { Member } from "../../lib/session";
import { Avatar, cx, IconButton } from "../ui";
import { useT } from "../../i18n/useT";

const LONG_PRESS_MS = 500;

/** One big tappable line of the shopping list. */
export function ShoppingRow({
  item,
  checker,
  onToggle,
  onMore,
  onPhoto,
}: {
  item: ShoppingItem;
  checker?: Member;
  onToggle: () => void;
  onMore?: () => void;
  /** Opens the product photo (to buy the right brand or size). */
  onPhoto?: () => void;
}) {
  const { t, lang } = useT();
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
          {item.packDetail && (
            <span className="block text-[15px] font-bold text-carrot-dark">{item.packDetail}</span>
          )}
          {item.recipes.length > 0 && (
            <span className="block truncate text-[15px] text-muted">
              {item.recipes.join(", ")}
            </span>
          )}
          {item.homeStock?.map((h, i) => (
            <span key={i} className="block text-[15px] font-bold text-herb">
              {h.from
                ? t("shopping.maybeHomeFrom", {
                    qty: h.display,
                    from: h.from,
                    date: formatDayShort(h.since, lang),
                  })
                : t("shopping.maybeHome", {
                    qty: h.display,
                    date: formatDayShort(h.since, lang),
                  })}
            </span>
          ))}
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
      {item.imageUrl && (
        <button
          type="button"
          onClick={onPhoto}
          aria-label={t("shopping.seePhoto", { label: item.label })}
          className="my-auto mr-1 shrink-0 overflow-hidden rounded-xl ring-1 ring-line active:scale-95"
        >
          <img src={item.imageUrl} alt="" loading="lazy" className={cx("size-11 object-cover", item.checked && "opacity-50")} />
        </button>
      )}
      {onMore && (
        <IconButton
          label={
            item.extra
              ? t("shopping.qtyOf", { label: item.label })
              : t("shopping.changeAisle", { label: item.label })
          }
          onClick={onMore}
          className="my-auto mr-1 text-muted"
        >
          <MoreHorizontal size={22} />
        </IconButton>
      )}
    </li>
  );
}
