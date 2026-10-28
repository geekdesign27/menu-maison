import { useCallback } from "react";
import type { Lang } from "../../convex/domain/lang";
import { useSession } from "../lib/session";
import { translate, type MessageKey } from ".";

/** The signed-in member's language (French before sign-in) and its `t`. */
export function useT() {
  const { account } = useSession();
  const lang: Lang = account?.lang ?? "fr";
  const t = useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) =>
      translate(lang, key, vars),
    [lang],
  );
  return { t, lang };
}
