import { useNavigate } from "react-router-dom";
import { Button, EmptyState } from "../ui";

/** Shown when a recipe id from the URL matches no live recipe. */
export function RecipeNotFound() {
  const navigate = useNavigate();
  return (
    <EmptyState
      emoji="🍽️"
      title="Recette introuvable"
      text="Elle a peut-être été archivée."
      action={
        <Button onClick={() => navigate("/recettes")}>Voir les recettes</Button>
      }
    />
  );
}
