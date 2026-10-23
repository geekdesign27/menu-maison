import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  BookHeart,
  CalendarDays,
  ChevronLeft,
  LayoutGrid,
  Refrigerator,
  ShoppingCart,
} from "lucide-react";
import { cx, IconButton } from "./ui";

const TABS = [
  { to: "/", label: "Semaine", icon: CalendarDays, end: true },
  { to: "/courses", label: "Courses", icon: ShoppingCart },
  { to: "/recettes", label: "Recettes", icon: BookHeart },
  { to: "/frigo", label: "Frigo", icon: Refrigerator },
  { to: "/plus", label: "Plus", icon: LayoutGrid },
];

export function Layout() {
  return (
    <>
      <main>
        <Outlet />
      </main>
      <nav
        aria-label="Navigation principale"
        className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 backdrop-blur"
      >
        <ul className="mx-auto flex max-w-2xl">
          {TABS.map(({ to, label, icon: Icon, end }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={end}
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
                    {label}
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
  return (
    <IconButton
      label="Retour"
      onClick={() =>
        window.history.length > 1 ? navigate(-1) : navigate(fallback)
      }
      className="-ml-2"
    >
      <ChevronLeft size={26} />
    </IconButton>
  );
}
