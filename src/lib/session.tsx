import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  FAMILY_KEY,
  readStored as read,
  TOKEN_KEY,
  writeStored as write,
} from "./device";
import { applyLook, rememberLook } from "./look";
import { localeOf } from "../../convex/domain/lang";

/** Family link name remembered on this phone, so the sign-in screen knows the family. */
export const rememberedFamily = {
  get: () => read(FAMILY_KEY),
  set: (slug: string) => write(FAMILY_KEY, slug),
};

/**
 * Asks the browser to keep this site's storage (device token, chosen profile)
 * instead of clearing it under storage pressure. Best effort: Safari tabs still
 * wipe data of sites unused for 7 days, the home-screen app does not.
 */
function askPersistentStorage() {
  try {
    void navigator.storage?.persist?.().catch(() => undefined);
  } catch {
    // Not supported: nothing more we can do
  }
}

/** The signed-in member, as checked by the server. */
export type Account = NonNullable<FunctionReturnType<typeof api.access.check>>;

interface SessionValue {
  /** Device token, only exposed once the server confirmed it: queries skip until then. */
  token: string;
  /** True while the stored token is being checked. */
  checking: boolean;
  /** True when the stored token was refused (expired, revoked, password changed). */
  expired: boolean;
  setToken: (t: string) => void;
  account: Account | null;
  memberId: Id<"members"> | null;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState(() => read(TOKEN_KEY));
  const [expired, setExpired] = useState(false);
  const account = useQuery(
    api.access.check,
    stored ? { token: stored } : "skip",
  );

  // Phones already signed in before this existed ask too, once per launch
  useEffect(() => {
    if (read(TOKEN_KEY)) askPersistentStorage();
  }, []);

  // A refused token is dropped, so that no screen keeps querying with it
  useEffect(() => {
    if (stored && account === null) {
      write(TOKEN_KEY, "");
      setStored("");
      setExpired(true);
    }
  }, [stored, account]);

  const setToken = useCallback((t: string) => {
    write(TOKEN_KEY, t);
    if (t) askPersistentStorage();
    setStored(t);
    if (t) setExpired(false);
  }, []);
  // The family of a signed-in phone is remembered for its next sign-in
  useEffect(() => {
    if (account) write(FAMILY_KEY, account.family.slug);
  }, [account]);
  // The family look follows the admins' choice, live, and is kept for the next opening
  const theme = account?.look.theme;
  const font = account?.look.font;
  useEffect(() => {
    if (!theme || !font) return;
    applyLook({ theme, font });
    rememberLook({ theme, font });
  }, [theme, font]);

  // Screen readers and the browser's spelling follow the member's language
  const lang = account?.lang ?? "fr";
  useEffect(() => {
    document.documentElement.lang = localeOf(lang);
  }, [lang]);

  const ready = !!stored && !!account;
  const value = useMemo(
    () => ({
      token: ready ? stored : "",
      checking: !!stored && account === undefined,
      expired,
      setToken,
      account: ready ? account : null,
      memberId: ready ? account.memberId : null,
    }),
    [ready, stored, account, expired, setToken],
  );
  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession outside SessionProvider");
  return ctx;
}

/** Shared catalog (members, aisles, ingredients, stores, settings), cached by Convex. */
export function useBase() {
  const { token } = useSession();
  return useQuery(api.catalog.base, token ? { token } : "skip");
}

export type Base = NonNullable<ReturnType<typeof useBase>>;
/** A profile as served to the app (with its photo URL). */
export type Member = Base["members"][number];

/** Current member, or undefined while loading. */
export function useMe(): Member | null | undefined {
  const base = useBase();
  const { memberId } = useSession();
  if (!base) return undefined;
  return base.members.find((m) => m._id === memberId) ?? null;
}
