import { useEffect, useState } from "react";
import { readStored, writeStored } from "./device";

// Adding the app to the home screen. Chrome and Edge on Android offer their own
// install prompt (kept from `beforeinstallprompt`, which fires once, early: this
// module is imported by main.tsx); Safari on iPhone only through its Share menu.

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: InstallPromptEvent | null = null;
const CHANGE = "mm-install";
/** Opens the install sheet from anywhere (« Premiers pas »). */
export const OPEN_INSTALL = "mm-install-open";
const SEEN_KEY = "mm.install.seen";

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    // Kept for our own button instead of the browser's mini-bar
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    window.dispatchEvent(new Event(CHANGE));
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    window.dispatchEvent(new Event(CHANGE));
  });
}

export type InstallWay = "installed" | "prompt" | "ios" | "manual" | "desktop";

export function isInstalled() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true
  );
}

function isPhone() {
  return window.matchMedia("(pointer: coarse)").matches;
}

function isIos() {
  const ua = navigator.userAgent;
  // iPadOS reports a Mac: a touch screen tells them apart
  return (
    /iPhone|iPad|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  );
}

/** How this device adds the app to its home screen. */
export function installWay(): InstallWay {
  if (isInstalled()) return "installed";
  if (deferred) return "prompt";
  if (!isPhone()) return "desktop";
  return isIos() ? "ios" : "manual";
}

export function useInstallWay(): InstallWay {
  const [way, setWay] = useState(installWay);
  useEffect(() => {
    const onChange = () => setWay(installWay());
    window.addEventListener(CHANGE, onChange);
    return () => window.removeEventListener(CHANGE, onChange);
  }, []);
  return way;
}

/** Chrome's own install dialog; true when the person accepted. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const event = deferred;
  deferred = null;
  await event.prompt();
  const { outcome } = await event.userChoice;
  window.dispatchEvent(new Event(CHANGE));
  return outcome === "accepted";
}

/** The sheet opens by itself once per device, at the first sign-in on a phone. */
export function installSeen() {
  return readStored(SEEN_KEY) !== "";
}

export function markInstallSeen() {
  writeStored(SEEN_KEY, String(Date.now()));
}
