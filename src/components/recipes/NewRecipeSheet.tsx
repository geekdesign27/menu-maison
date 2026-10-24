import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Card, Sheet } from "../ui";

const CHOICES = [
  {
    to: "/recette/importer",
    emoji: "🎙️",
    title: "Dicter ou importer",
    text: "Raconte la recette, ou colle un lien Fooby, Marmiton… ou un texte",
  },
  {
    to: "/recette/nouvelle",
    emoji: "✍️",
    title: "Écrire la recette",
    text: "Ingrédients et étapes, à la main",
  },
];

/** How to add a recipe: dictate or import it, or write it. */
export function NewRecipeSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  return (
    <Sheet open={open} onClose={onClose} title="Nouvelle recette">
      <div className="space-y-3">
        {CHOICES.map((c) => (
          <button
            key={c.to}
            type="button"
            onClick={() => navigate(c.to)}
            className="block w-full text-left"
          >
            <Card className="flex items-center gap-4 p-4 active:bg-carrot-soft">
              <span
                className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-cream text-2xl"
                aria-hidden
              >
                {c.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-lg font-black">{c.title}</div>
                <div className="text-[15px] text-muted">{c.text}</div>
              </div>
              <ChevronRight
                size={22}
                className="shrink-0 text-muted"
                aria-hidden
              />
            </Card>
          </button>
        ))}
      </div>
    </Sheet>
  );
}
