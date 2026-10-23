import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexProvider } from "convex/react";
import { HashRouter, Route, Routes } from "react-router-dom";
import "@fontsource-variable/nunito";
import "./index.css";
import { convex, convexConfigured } from "./lib/convex";
import { SessionProvider } from "./lib/session";
import { ToastProvider } from "./lib/toast";
import { WeekProvider } from "./lib/week";
import { Gate } from "./components/Gate";
import { Layout } from "./components/Layout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ErrorBox } from "./components/ui";
import { WeekPage } from "./pages/Week";
import { ShoppingPage } from "./pages/Shopping";
import { RecipesPage } from "./pages/Recipes";
import { RecipeDetailPage } from "./pages/RecipeDetail";
import { RecipeEditorPage } from "./pages/RecipeEditor";
import { FridgePage } from "./pages/Fridge";
import { MorePage } from "./pages/More";
import { WishesPage } from "./pages/Wishes";
import { TemplatesPage } from "./pages/Templates";
import { StatsPage } from "./pages/Stats";
import { StoresPage } from "./pages/Stores";
import { StoreEditorPage } from "./pages/StoreEditor";
import { SettingsPage } from "./pages/Settings";

function App() {
  if (!convexConfigured) {
    return (
      <main className="p-4">
        <ErrorBox>
          Configuration manquante : VITE_CONVEX_URL n'est pas défini.
        </ErrorBox>
      </main>
    );
  }
  return (
    <ConvexProvider client={convex}>
      <SessionProvider>
        <ToastProvider>
          <ErrorBoundary>
            <Gate>
              <WeekProvider>
                <HashRouter>
                  <Routes>
                    <Route element={<Layout />}>
                      <Route path="/" element={<WeekPage />} />
                      <Route path="/courses" element={<ShoppingPage />} />
                      <Route path="/recettes" element={<RecipesPage />} />
                      <Route
                        path="/recette/nouvelle"
                        element={<RecipeEditorPage />}
                      />
                      <Route
                        path="/recette/:id"
                        element={<RecipeDetailPage />}
                      />
                      <Route
                        path="/recette/:id/modifier"
                        element={<RecipeEditorPage />}
                      />
                      <Route path="/frigo" element={<FridgePage />} />
                      <Route path="/plus" element={<MorePage />} />
                      <Route path="/envies" element={<WishesPage />} />
                      <Route path="/menus-types" element={<TemplatesPage />} />
                      <Route path="/stats" element={<StatsPage />} />
                      <Route path="/magasins" element={<StoresPage />} />
                      <Route
                        path="/magasin/:id"
                        element={<StoreEditorPage />}
                      />
                      <Route path="/reglages" element={<SettingsPage />} />
                      <Route path="*" element={<WeekPage />} />
                    </Route>
                  </Routes>
                </HashRouter>
              </WeekProvider>
            </Gate>
          </ErrorBoundary>
        </ToastProvider>
      </SessionProvider>
    </ConvexProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
