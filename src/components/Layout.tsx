import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  BookHeart,
  CalendarDays,
  ChevronLeft,
  LayoutGrid,
  MonitorCog,
  Refrigerator,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";
import type { MessageKey } from "../i18n";
import { useT } from "../i18n/useT";
import { cx, IconButton } from "./ui";
import { SubscriptionBanner } from "./SubscriptionBanner";

// `tour` names the tab for the welcome guide, whatever the language
const TABS: {
  to: string;
  label: MessageKey;
  tour: string;
  icon: LucideIcon;
  end?: boolean;
  desktopOnly?: boolean;
}[] = [
  {
    to: "/",
    label: "nav.week",
    tour: "semaine",
    icon: CalendarDays,
    end: true,
  },
  {
    to: "/courses",
    label: "nav.shopping",
    tour: "courses",
    icon: ShoppingCart,
  },
  { to: "/recettes", label: "nav.recipes", tour: "recettes", icon: BookHeart },
  { to: "/frigo", label: "nav.fridge", tour: "frigo", icon: Refrigerator },
  { to: "/plus", label: "nav.more", tour: "plus", icon: LayoutGrid },
  // Wide screens only: the management area is built for a computer
  {
    to: "/gestion",
    label: "nav.manage",
    tour: "gestion",
    icon: MonitorCog,
    desktopOnly: true,
  },
];

export function Layout() {
  const { t } = useT();
  return (
    <>
      <main>
        <SubscriptionBanner />
        <Outlet />
      </main>
      <nav
        aria-label={t("nav.label")}
        className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 backdrop-blur"
      >
        <ul className="mx-auto flex max-w-2xl">
          {TABS.map(({ to, label, tour, icon: Icon, end, desktopOnly }) => (
            <li
              key={to}
              className={cx("flex-1", desktopOnly && "hidden lg:block")}
            >
              <NavLink
                to={to}
                end={end}
                data-tour={`tab-${tour}`}
                className={({ isActive }) =>
                  cx(
                    "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[12px] font-extrabold transition",
                    isActive ? "text-carrot-dark" : "text-muted",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cx(
                        "flex h-8 w-14 items-center justify-center rounded-full transition",
                        isActive && "bg-carrot-soft",
                      )}
                    >
                      <Icon size={22} strokeWidth={isActive ? 2.6 : 2} />
                    </span>
                    {t(label)}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}

/** Back arrow for sub-screens. Goes to `fallback` when there is no history. */
export function BackButton({ fallback = "/" }: { fallback?: string }) {
  const navigate = useNavigate();
  const { t } = useT();
  return (
    <IconButton
      label={t("nav.back")}
      onClick={() =>
        window.history.length > 1 ? navigate(-1) : navigate(fallback)
      }
      className="-ml-2"
    >
      <ChevronLeft size={26} />
    </IconButton>
  );
}
