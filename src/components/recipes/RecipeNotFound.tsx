import { useNavigate } from "react-router-dom";
import { Button, EmptyState } from "../ui";
import { useT } from "../../i18n/useT";

/** Shown when a recipe id from the URL matches no live recipe. */
export function RecipeNotFound() {
  const navigate = useNavigate();
  const { t } = useT();
  return (
    <EmptyState
      emoji="🍽️"
      title={t("recipes.notFoundTitle")}
      text={t("recipes.notFoundText")}
      action={
        <Button onClick={() => navigate("/recettes")}>
          {t("recipes.seeRecipes")}
        </Button>
      }
    />
  );
}
