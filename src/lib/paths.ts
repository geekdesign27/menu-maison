// Screens shared by the phone app and the desktop management area (/gestion)
// navigate to the matching path of the area they are shown in.
import { createContext, useContext } from "react";

export const GestionContext = createContext(false);

/** True inside the desktop management area. */
export function useInGestion() {
  return useContext(GestionContext);
}

export function useAppPaths() {
  const gestion = useInGestion();
  return {
    recipes: gestion ? "/gestion/recettes" : "/recettes",
    /** Where to land after saving a recipe: its page on the phone, the table in /gestion. */
    recipeSaved: (id: string) => (gestion ? "/gestion/recettes" : `/recette/${id}`),
    stores: gestion ? "/gestion/magasins" : "/magasins",
    store: (id: string) => (gestion ? `/gestion/magasin/${id}` : `/magasin/${id}`),
  };
}
