"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "agent-os-quick-panel";

export type QuickPanelId = "capture" | "meal" | "assistant";
const VALID: QuickPanelId[] = ["capture", "meal", "assistant"];

type QuickPanelContextValue = {
  /** The currently open quick-panel, or null when collapsed to the rail. */
  active: QuickPanelId | null;
  open: (id: QuickPanelId) => void;
  close: () => void;
  /** Open `id`, or collapse if it is already the active panel. */
  toggle: (id: QuickPanelId) => void;
  ready: boolean;
};

const QuickPanelContext = createContext<QuickPanelContextValue | null>(null);

export function QuickPanelProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [active, setActive] = useState<QuickPanelId | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && (VALID as string[]).includes(stored)) {
        setActive(stored as QuickPanelId);
      }
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const persist = useCallback((next: QuickPanelId | null) => {
    try {
      if (next) localStorage.setItem(STORAGE_KEY, next);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const open = useCallback(
    (id: QuickPanelId) => {
      setActive(id);
      persist(id);
    },
    [persist],
  );

  const close = useCallback(() => {
    setActive(null);
    persist(null);
  }, [persist]);

  const toggle = useCallback(
    (id: QuickPanelId) => {
      setActive((prev) => {
        const next = prev === id ? null : id;
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const value = useMemo(
    () => ({ active, open, close, toggle, ready }),
    [active, open, close, toggle, ready],
  );

  return (
    <QuickPanelContext.Provider value={value}>
      {children}
    </QuickPanelContext.Provider>
  );
}

export function useQuickPanel() {
  const ctx = useContext(QuickPanelContext);
  if (!ctx) {
    throw new Error("useQuickPanel must be used within QuickPanelProvider");
  }
  return ctx;
}
