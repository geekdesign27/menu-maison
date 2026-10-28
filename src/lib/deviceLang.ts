import { useEffect, useState } from "react";
import type { Lang } from "../../convex/domain/lang";
import { readStored, writeStored } from "./device";

// Language of this device before sign-in (landing page, sign-in screens): the
// visitor's choice, else the browser's. Signed in, the profile's language wins
// and is remembered here for the next sign-in screen.
export const LANG_KEY = "mm.lang";
const CHANGE_EVENT = "mm-lang";

/** First French or German language of the browser; French otherwise. */
export function browserLang(languages: readonly string[]): Lang {
  for (const tag of languages) {
    const base = tag.toLowerCase().slice(0, 2);
    if (base === "de" || base === "fr") return base;
  }
  return "fr";
}

export function deviceLang(): Lang {
  const saved = readStored(LANG_KEY);
  if (saved === "fr" || saved === "de") return saved;
  if (typeof navigator === "undefined") return "fr";
  return browserLang(navigator.languages?.length ? navigator.languages : [navigator.language]);
}

export function setDeviceLang(lang: Lang) {
  if (readStored(LANG_KEY) === lang) return;
  writeStored(LANG_KEY, lang);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** The device's language, live: the FR | DE switch changes it everywhere at once. */
export function useDeviceLang(): Lang {
  const [lang, setLang] = useState(deviceLang);
  useEffect(() => {
    const onChange = () => setLang(deviceLang());
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);
  return lang;
}
