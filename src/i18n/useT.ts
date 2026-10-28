import { useCallback } from "react";
import type { Lang } from "../../convex/domain/lang";
import { useSession } from "../lib/session";
import { useDeviceLang } from "../lib/deviceLang";
import { translate, type MessageKey } from ".";

/** The signed-in member's language (this device's before sign-in) and its `t`. */
export function useT() {
  const { account } = useSession();
  const device = useDeviceLang();
  const lang: Lang = account?.lang ?? device;
  const t = useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) =>
      translate(lang, key, vars),
    [lang],
  );
  return { t, lang };
}
