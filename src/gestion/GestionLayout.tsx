import type { ReactNode } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import {
  ArrowLeft,
  BookHeart,
  Layers,
  ShoppingBasket,
  Store,
} from "lucide-react";
import { GestionContext } from "../lib/paths";
import { useMe } from "../lib/session";
import { Avatar, cx } from "../components/ui";

const SECTIONS = [
  { to: "/gestion/recettes", label: "Recettes", icon: BookHeart },
  { to: "/gestion/produits", label: "Produits", icon: ShoppingBasket },
  { to: "/gestion/rayons", label: "Rayons", icon: Layers },
  { to: "/gestion/magasins", label: "Magasins", icon: Store },
];

/** Desktop management area: side menu on the left, wide content on the right. */
export function GestionLayout() {
  const me = useMe();
  return (
    <GestionContext.Provider value>
      <div className="flex min-h-dvh flex-col md:flex-row">
        <aside className="z-20 flex shrink-0 flex-col gap-1 border-line bg-paper p-3 md:sticky md:top-0 md:h-dvh md:w-60 md:border-r md:p-4">
          <div className="mb-1 flex items-center gap-2 px-2 md:mb-4">
            <span
              className="flex size-10 items-center justify-center rounded-2xl bg-carrot text-2xl"
              aria-hidden
            >
              🥕
            </span>
            <span className="min-w-0">
              <span className="block text-lg leading-tight font-black">
                Menu Maison
              </span>
              <span className="block text-[13px] font-bold text-muted">
                Gestion
              </span>
            </span>
          </div>
          <nav
            aria-label="Gestion"
            className="flex gap-1 overflow-x-auto md:flex-col"
          >
            {SECTIONS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cx(
                    "flex min-h-11 shrink-0 items-center gap-3 rounded-xl px-3 font-extrabold transition",
                    isActive
                      ? "bg-carrot-soft text-carrot-dark"
                      : "text-ink hover:bg-cream",
                  )
                }
              >
                <Icon size={20} />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto hidden md:block">
            <Link
              to="/"
              className="flex min-h-11 items-center gap-3 rounded-xl px-3 font-bold text-muted hover:bg-cream"
            >
              <ArrowLeft size={20} /> Retour à l'app
            </Link>
            {me && (
              <div className="mt-2 flex items-center gap-2 border-t border-line px-2 pt-3 text-[15px] font-bold">
                <Avatar member={me} size={32} />
                {me.name}
              </div>
            )}
          </div>
        </aside>
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </GestionContext.Provider>
  );
}

/** Title bar of a management screen, with its main actions on the right. */
export function GestionHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end gap-3 px-6 pt-6 pb-4">
      <div className="min-w-0 flex-1">
        <h1 className="text-3xl font-black tracking-tight">{title}</h1>
        {subtitle && (
          <div className="text-[15px] font-semibold text-muted">{subtitle}</div>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
