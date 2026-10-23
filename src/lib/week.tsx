import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { addDays, weekStart, zurichToday } from "../../convex/domain/dates";
import { useBase } from "./session";

interface WeekValue {
  today: string;
  start: string; // first day of the planning week (shopping day)
  end: string;
  isCurrent: boolean;
  prev: () => void;
  next: () => void;
  goToday: () => void;
}

const WeekContext = createContext<WeekValue | null>(null);
const OFFSET_KEY = "mm.weekOffset";

/** Planning week shared by the Week and Shopping screens. */
export function WeekProvider({ children }: { children: ReactNode }) {
  const base = useBase();
  const shoppingDay = base?.settings.shoppingDay ?? 6;
  const [today, setToday] = useState(() => zurichToday());
  const [offset, setOffset] = useState(() => {
    try {
      const raw = Number(sessionStorage.getItem(OFFSET_KEY));
      return Number.isFinite(raw) ? raw : 0;
    } catch {
      return 0;
    }
  });

  // Keep "today" right when the app stays open past midnight
  useEffect(() => {
    const id = setInterval(() => setToday(zurichToday()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(OFFSET_KEY, String(offset));
    } catch {
      // Not critical: the week resets to the current one on reload
    }
  }, [offset]);

  const value = useMemo(() => {
    const start = addDays(weekStart(today, shoppingDay), offset * 7);
    return {
      today,
      start,
      end: addDays(start, 6),
      isCurrent: offset === 0,
      prev: () => setOffset((o) => o - 1),
      next: () => setOffset((o) => o + 1),
      goToday: () => setOffset(0),
    };
  }, [today, shoppingDay, offset]);

  return <WeekContext.Provider value={value}>{children}</WeekContext.Provider>;
}

export function useWeek() {
  const ctx = useContext(WeekContext);
  if (!ctx) throw new Error("useWeek outside WeekProvider");
  return ctx;
}

const STORE_KEY = "mm.store";

/** Store chosen on this phone for the shopping list (falls back to the default store). */
export function useStoreChoice() {
  const base = useBase();
  const [stored, setStored] = useState(() => {
    try {
      return localStorage.getItem(STORE_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const stores = base?.stores ?? [];
  const current =
    stores.find((s) => s._id === stored) ??
    stores.find((s) => s._id === base?.settings.defaultStoreId) ??
    stores[0] ??
    null;
  const choose = (id: string) => {
    try {
      localStorage.setItem(STORE_KEY, id);
    } catch {
      // Private mode: the choice lasts as long as the tab
    }
    setStored(id);
  };
  return { store: current, stores, choose };
}
