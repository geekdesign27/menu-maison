import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { errorMessage } from "./format";
import { useT } from "../i18n/useT";

type Kind = "ok" | "error";
interface Toast {
  id: number;
  text: string;
  kind: Kind;
}

const ToastContext = createContext<(text: string, kind?: Kind) => void>(
  () => {},
);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const next = useRef(1);
  const show = useCallback((text: string, kind: Kind = "ok") => {
    const id = next.current++;
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(
      () => setToasts((t) => t.filter((x) => x.id !== id)),
      kind === "error" ? 5000 : 2500,
    );
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.kind === "error" ? "alert" : "status"}
            className={`pointer-events-auto max-w-md rounded-2xl px-4 py-3 text-[15px] font-bold shadow-lg ${
              t.kind === "error" ? "bg-berry text-white" : "bg-ink text-white"
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

/**
 * Wraps a mutation call: shows the server's message on failure, an optional
 * confirmation on success. Returns undefined when the call failed.
 */
export function useRun() {
  const toast = useToast();
  const { lang } = useT();
  return useCallback(
    async <T,>(
      fn: () => Promise<T>,
      success?: string,
    ): Promise<T | undefined> => {
      try {
        const result = await fn();
        if (success) toast(success);
        return result;
      } catch (e) {
        toast(errorMessage(e, lang), "error");
        return undefined;
      }
    },
    [toast, lang],
  );
}
