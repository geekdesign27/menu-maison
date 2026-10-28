import { useState } from "react";
import { cx, TextInput } from "../ui";
import { useT } from "../../i18n/useT";

/** Emoji suggestions plus a free field for any other emoji. */
export function EmojiField({
  value,
  suggestions,
  onChange,
}: {
  value: string;
  suggestions: string[];
  onChange: (emoji: string) => void;
}) {
  const { t } = useT();
  const [custom, setCustom] = useState(
    suggestions.includes(value) ? "" : value,
  );
  return (
    <div>
      <span className="mb-1 block text-[15px] font-bold">
        {t("common.emoji.label")}
      </span>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((e) => (
          <button
            key={e}
            type="button"
            aria-label={t("common.emoji.option", { emoji: e })}
            aria-pressed={value === e}
            onClick={() => {
              setCustom("");
              onChange(e);
            }}
            className={cx(
              "flex size-12 items-center justify-center rounded-2xl text-2xl transition",
              value === e
                ? "bg-carrot-soft ring-2 ring-carrot"
                : "bg-paper ring-1 ring-line active:bg-carrot-soft",
            )}
          >
            {e}
          </button>
        ))}
      </div>
      <TextInput
        className="mt-2"
        value={custom}
        onChange={(e) => setCustom(e.target.value)}
        onBlur={() => custom.trim() && onChange(custom.trim())}
        placeholder={t("common.emoji.otherPlaceholder")}
        aria-label={t("common.emoji.other")}
      />
    </div>
  );
}
