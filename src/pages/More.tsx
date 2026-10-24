import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useMe, useSession } from "../lib/session";
import { Avatar, Card, Page } from "../components/ui";

const LINKS = [
  {
    to: "/envies",
    emoji: "💭",
    title: "Envies",
    text: "Ce qu'on a envie de manger bientôt",
  },
  {
    to: "/menus-types",
    emoji: "🗂️",
    title: "Menus types",
    text: "Nos semaines habituelles, en un tap",
  },
  {
    to: "/stats",
    emoji: "📊",
    title: "Statistiques",
    text: "Ce qu'on mange, et à quelle fréquence",
  },
  {
    to: "/produits",
    emoji: "🧺",
    title: "Produits",
    text: "Ingrédients et articles hors recette : prix, rayon, photo",
  },
  {
    to: "/magasins",
    emoji: "🏪",
    title: "Magasins",
    text: "L'ordre des rayons de chaque magasin",
  },
  {
    to: "/reglages",
    emoji: "⚙️",
    title: "Réglages",
    text: "Profils, jour des courses, rayons",
  },
];

export function MorePage() {
  const me = useMe();
  const { setMemberId } = useSession();
  return (
    <Page title="Plus">
      {me && (
        <Card className="mb-4 flex items-center gap-3 p-4">
          <Avatar member={me} size={48} />
          <div className="min-w-0 flex-1">
            <div className="text-lg font-black">{me.name}</div>
            <div className="text-[15px] text-muted">
              Profil utilisé sur ce téléphone
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMemberId(null)}
            className="min-h-11 rounded-2xl px-3 font-extrabold text-carrot-dark active:bg-carrot-soft"
          >
            Changer
          </button>
        </Card>
      )}
      <Link to="/gestion" className="mb-3 hidden md:block">
        <Card className="flex items-center gap-4 bg-carrot-soft p-4">
          <span
            className="flex size-12 items-center justify-center rounded-2xl bg-paper text-2xl"
            aria-hidden
          >
            🖥️
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-lg font-black">Gestion sur ordinateur</div>
            <div className="text-[15px] text-muted">
              Tableaux des recettes, produits, rayons et magasins
            </div>
          </div>
          <ChevronRight className="text-muted" />
        </Card>
      </Link>
      <div className="grid gap-3">
        {LINKS.map((l) => (
          <Link key={l.to} to={l.to}>
            <Card className="flex items-center gap-4 p-4">
              <span
                className="flex size-12 items-center justify-center rounded-2xl bg-carrot-soft text-2xl"
                aria-hidden
              >
                {l.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-lg font-black">{l.title}</div>
                <div className="text-[15px] text-muted">{l.text}</div>
              </div>
              <ChevronRight className="text-muted" />
            </Card>
          </Link>
        ))}
      </div>
    </Page>
  );
}
