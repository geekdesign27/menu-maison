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
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

const TOKEN_KEY = "mm.token";
const MEMBER_KEY = "mm.member";

function read(key: string) {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}
function write(key: string, value: string) {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    // Private mode: the session simply lasts as long as the tab
  }
}

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

interface SessionValue {
  /** Device token, only exposed once the server confirmed it: queries skip until then. */
  token: string;
  /** True while the stored token is being checked. */
  checking: boolean;
  /** True when the stored token was refused (expired, revoked, code changed). */
  expired: boolean;
  setToken: (t: string) => void;
  memberId: Id<"members"> | null;
  setMemberId: (id: Id<"members"> | null) => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState(() => read(TOKEN_KEY));
  const [expired, setExpired] = useState(false);
  const [memberId, setMemberState] = useState(() => (read(MEMBER_KEY) || null) as Id<"members"> | null);
  const valid = useQuery(api.access.check, stored ? { token: stored } : "skip");

  // Phones already signed in before this existed ask too, once per launch
  useEffect(() => {
    if (read(TOKEN_KEY)) askPersistentStorage();
  }, []);

  // A refused token is dropped, so that no screen keeps querying with it
  useEffect(() => {
    if (stored && valid === false) {
      write(TOKEN_KEY, "");
      setStored("");
      setExpired(true);
    }
  }, [stored, valid]);

  const setToken = useCallback((t: string) => {
    write(TOKEN_KEY, t);
    if (t) askPersistentStorage();
    setStored(t);
    if (t) setExpired(false);
  }, []);
  const setMemberId = useCallback((id: Id<"members"> | null) => {
    write(MEMBER_KEY, id ?? "");
    setMemberState(id);
  }, []);
  const ready = !!stored && valid === true;
  const value = useMemo(
    () => ({ token: ready ? stored : "", checking: !!stored && valid === undefined, expired, setToken, memberId, setMemberId }),
    [ready, stored, valid, expired, setToken, memberId, setMemberId],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
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
