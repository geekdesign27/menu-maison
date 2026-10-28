import { lazy, StrictMode, Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/nunito";
import "./index.css";
import { hasStoredToken } from "./lib/device";
import { applyLook, applyRememberedLook, DEFAULT_LOOK } from "./lib/look";
import { entryFor, LANDING_TITLE, type Entry } from "./landing/entry";

// Loaded apart: a visitor of the landing page never downloads the app (Convex,
// every screen), and a family phone never downloads the landing page.
const App = lazy(() => import("./App").then((m) => ({ default: m.App })));
const Landing = lazy(() => import("./landing/Landing").then((m) => ({ default: m.Landing })));

function currentEntry(): Entry {
  return entryFor(window.location.hash, hasStoredToken());
}

/** Colours, font and tab title of the surface, before it is drawn. */
function prepare(entry: Entry) {
  if (entry === "landing") {
    // The public face stays Carotte and Nunito, whatever look this phone remembers
    applyLook(DEFAULT_LOOK);
    document.title = LANDING_TITLE;
  } else {
    applyRememberedLook();
    document.title = "Menu Maison";
  }
}

function Root() {
  const [entry, setEntry] = useState(currentEntry);
  const first = useRef(true);

  useEffect(() => {
    const onChange = () => setEntry(currentEntry());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  useLayoutEffect(() => {
    prepare(entry);
    // From the landing page to the sign-in screen (and back): start at the top
    if (!first.current) window.scrollTo(0, 0);
    first.current = false;
  }, [entry]);

  return <Suspense fallback={null}>{entry === "landing" ? <Landing /> : <App />}</Suspense>;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
