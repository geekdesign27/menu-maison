// Plays the tour with driver.js: before each bubble, shows the right screen,
// opens the sheet it talks about, and waits for the element to be there.
import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import "./onboarding.css";
import type { TourStep } from "./steps";

const OPEN_SHEETS = '[role="dialog"][aria-modal="true"]';

const nextFrame = () =>
  new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

/** The element, once it is on the screen (data loading, sheet opening), or null. */
async function waitFor(
  selector: string,
  timeoutMs = 2500,
): Promise<Element | null> {
  const end = performance.now() + timeoutMs;
  for (;;) {
    const el = document.querySelector(selector);
    if (el) return el;
    if (performance.now() > end) return null;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

/** Closes the app's sheets the way a user would, through their own Escape handler. */
async function closeSheets() {
  for (let i = 0; i < 4 && document.querySelector(OPEN_SHEETS); i++) {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await nextFrame();
    await nextFrame();
  }
}

/**
 * A real Escape press ends the tour (driver.js listens to keyup); without this,
 * the keydown would also close the sheet under the bubble.
 */
function keepSheetsOnEscape(e: KeyboardEvent) {
  if (e.key === "Escape" && e.isTrusted) e.stopPropagation();
}

export function runTour({
  steps,
  navigate,
  currentPath,
  onEnd,
}: {
  steps: TourStep[];
  navigate: (to: string) => void;
  currentPath: () => string;
  onEnd: () => void;
}): () => void {
  let drv: Driver | null = null;
  let stopped = false;
  // Unmounted by React (not ended by the user): the tour is not counted as done
  let cancelled = false;

  async function prepare(index: number) {
    const step = steps[index];
    await closeSheets();
    if (currentPath() !== step.route) navigate(step.route);
    if (step.open) {
      const button = await waitFor(step.open, 1000);
      // Nothing to open (no dish planned yet): the bubble shows in the middle
      if (!(button instanceof HTMLElement)) return;
      button.click();
    }
    if (step.target) await waitFor(step.target, step.open ? 2500 : 1500);
  }

  // « Suivant » tapped twice while the next screen loads: one move only
  let moving = false;
  async function goTo(index: number) {
    if (!drv || moving) return;
    if (index >= steps.length) {
      drv.destroy();
      return;
    }
    moving = true;
    await prepare(index);
    moving = false;
    if (!stopped) drv.moveTo(index);
  }

  drv = driver({
    steps: steps.map((step) => ({
      // Missing element (no dish planned yet…): driver.js centres the bubble
      element: step.target
        ? () => document.querySelector(step.target!) as Element
        : undefined,
      popover: { title: step.title, description: step.text },
    })),
    popoverClass: "mm-tour",
    showProgress: true,
    progressText: "{{current}} sur {{total}}",
    showButtons: ["next", "close"],
    nextBtnText: "Suivant",
    doneBtnText: "Terminer",
    closeBtnLabel: "Passer le guide",
    // The user reads, the tour taps: no accidental tap on the screen behind
    disableActiveInteraction: true,
    overlayClickBehavior: "none",
    smoothScroll: true,
    stagePadding: 6,
    stageRadius: 16,
    onPopoverRender: (popover) => {
      // « Passer » as a real button in the footer, instead of a small cross
      popover.closeButton.style.display = "none";
      if (popover.footer.querySelector(".mm-tour-skip")) return;
      const skip = document.createElement("button");
      skip.type = "button";
      skip.className = "mm-tour-skip";
      skip.textContent = "Passer";
      skip.addEventListener("click", () => drv?.destroy());
      popover.footer.prepend(skip);
    },
    onNextClick: (_el, _step, { index }) => void goTo((index ?? 0) + 1),
    onDestroyed: () => {
      stopped = true;
      window.removeEventListener("keydown", keepSheetsOnEscape, true);
      void closeSheets();
      if (!cancelled) onEnd();
    },
  });

  window.addEventListener("keydown", keepSheetsOnEscape, true);
  void prepare(0).then(() => !stopped && drv?.drive(0));

  return () => {
    stopped = true;
    cancelled = true;
    if (drv?.isActive()) drv.destroy();
    window.removeEventListener("keydown", keepSheetsOnEscape, true);
  };
}
