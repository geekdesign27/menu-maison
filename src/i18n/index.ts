import type { Lang } from "../../convex/domain/lang";
import { de } from "./de";
import { fr, type MessageKey, type Messages } from "./fr";

export type { MessageKey };

const MESSAGES: Record<Lang, Messages> = { fr, de };

/** Text of `key` in `lang`, with « {name} » placeholders filled from `vars`. */
export function translate(
  lang: Lang,
  key: MessageKey,
  vars?: Record<string, string | number>,
): string {
  const text = MESSAGES[lang][key];
  return vars
    ? text.replace(/\{(\w+)\}/g, (all, name: string) =>
        name in vars ? String(vars[name]) : all,
      )
    : text;
}

export const DICTIONARIES = MESSAGES;
