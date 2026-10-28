import { LANGS, localeOf } from "../../convex/domain/lang";
import { setDeviceLang, useDeviceLang } from "../lib/deviceLang";
import { cx } from "./ui";

const NAMES = { fr: "Français", de: "Deutsch" } as const;

/** FR | DE before sign-in (landing page, sign-in screens), remembered on this device. */
export function LangSwitch({ className }: { className?: string }) {
  const lang = useDeviceLang();
  return (
    <div
      role="group"
      aria-label="Langue · Sprache"
      className={cx("inline-flex shrink-0 rounded-full bg-paper p-1 ring-1 ring-line", className)}
    >
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          lang={localeOf(l)}
          aria-label={NAMES[l]}
          aria-pressed={lang === l}
          onClick={() => setDeviceLang(l)}
          className={cx(
            "min-h-10 min-w-11 rounded-full px-2.5 text-[15px] font-black transition",
            lang === l ? "bg-carrot text-white" : "text-ink/70 hover:bg-carrot-soft",
          )}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
