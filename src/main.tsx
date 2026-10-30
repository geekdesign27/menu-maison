import {
  lazy,
  StrictMode,
  Suspense,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/nunito";
import "./index.css";
import { hasStoredToken } from "./lib/device";
import { IS_DEV_SITE, siteTitle } from "./lib/siteEnv";
// Listens for Chrome's install prompt from the start: it fires once, early
import "./lib/install";
import { applyLook, applyRememberedLook, DEFAULT_LOOK } from "./lib/look";
import { entryFor, LANDING_TITLE, type Entry } from "./landing/entry";

// Loaded apart: a visitor of the landing page never downloads the app (Convex,
// every screen), and a family phone never downloads the landing page.
const App = lazy(() => import("./App").then((m) => ({ default: m.App })));
const Landing = lazy(() =>
  import("./landing/Landing").then((m) => ({ default: m.Landing })),
);
// Test site only: never downloaded on menumaison.ch
const DevGate = lazy(() =>
  import("./components/DevGate").then((m) => ({ default: m.DevGate })),
);

function currentEntry(): Entry {
  return entryFor(window.location.hash, hasStoredToken());
}

/** Colours, font and tab title of the surface, before it is drawn. */
function prepare(entry: Entry) {
  if (entry === "landing") {
    // The public face stays Carotte and Nunito, whatever look this phone remembers
    applyLook(DEFAULT_LOOK);
    document.title = siteTitle(LANDING_TITLE);
  } else {
    applyRememberedLook();
    document.title = siteTitle("Menu Maison");
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

  const surface = entry === "landing" ? <Landing /> : <App />;

  return (
    <>
      <Suspense fallback={null}>
        {IS_DEV_SITE ? <DevGate>{surface}</DevGate> : surface}
      </Suspense>
      {/* Test version: a yellow line on top and a badge low on the left, both letting clicks through */}
      {IS_DEV_SITE && (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-[1000]">
          <div className="h-1 bg-sun" />
          <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+6rem)] left-2 rounded-full bg-ink/85 px-3 py-1 text-[16px] font-black text-white">
            DEV · test
          </div>
        </div>
      )}
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
