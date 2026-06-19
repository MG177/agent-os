"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import type {
  AssistantMessageRecord,
  AssistantSessionDetail,
  AssistantSessionSummary,
} from "@/lib/assistant/session-client";

const ACTIVE_SESSION_KEY = "assistant:activeSessionId";

export interface AssistantUiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  imagePreview?: string;
  command?: string | null;
}

interface AssistantSessionContextValue {
  ready: boolean;
  sessions: AssistantSessionSummary[];
  activeSessionId: string | null;
  messages: AssistantUiMessage[];
  loading: boolean;
  streaming: boolean;
  error: string | null;
  historyOpen: boolean;
  setHistoryOpen: (open: boolean) => void;
  createSession: () => Promise<string | null>;
  switchSession: (sessionId: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  renameSession: (sessionId: string, title: string) => Promise<void>;
  refreshSessions: () => Promise<void>;
  reloadActiveMessages: () => Promise<void>;
  setStreaming: (streaming: boolean) => void;
  registerStreamAbort: (controller: AbortController | null) => void;
  abortStream: () => void;
}

const AssistantSessionContext =
  createContext<AssistantSessionContextValue | null>(null);

function toUiMessage(record: AssistantMessageRecord): AssistantUiMessage {
  return {
    id: record.id,
    role: record.role,
    content: record.content,
    command: record.command,
    imagePreview: record.image
      ? `data:${record.image.mediaType};base64,${record.image.base64}`
      : undefined,
  };
}

function readStoredSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(ACTIVE_SESSION_KEY);
  } catch {
    return null;
  }
}

function writeStoredSessionId(id: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (id) localStorage.setItem(ACTIVE_SESSION_KEY, id);
    else localStorage.removeItem(ACTIVE_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

async function fetchSessions(): Promise<AssistantSessionSummary[]> {
  const res = await fetch("/api/assistant/sessions");
  if (!res.ok) throw new Error("Failed to load sessions");
  const data = (await res.json()) as { sessions: AssistantSessionSummary[] };
  return data.sessions;
}

async function fetchSessionDetail(
  id: string,
): Promise<AssistantSessionDetail> {
  const res = await fetch(`/api/assistant/sessions/${id}`);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Failed to load session");
  }
  return res.json() as Promise<AssistantSessionDetail>;
}

export function AssistantSessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [sessions, setSessions] = useState<AssistantSessionSummary[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AssistantUiMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const streamAbortRef = useRef<AbortController | null>(null);
  const bootstrapStarted = useRef(false);

  const registerStreamAbort = useCallback(
    (controller: AbortController | null) => {
      streamAbortRef.current = controller;
    },
    [],
  );

  const abortStream = useCallback(() => {
    streamAbortRef.current?.abort();
    streamAbortRef.current = null;
    setStreaming(false);
  }, []);

  const applySessionDetail = useCallback((detail: AssistantSessionDetail) => {
    setActiveSessionId(detail.session.id);
    writeStoredSessionId(detail.session.id);
    setMessages(detail.messages.map(toUiMessage));
    setSessions((prev) => {
      const rest = prev.filter((s) => s.id !== detail.session.id);
      return [detail.session, ...rest].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
    });
  }, []);

  const loadSession = useCallback(
    async (sessionId: string) => {
      setLoading(true);
      setError(null);
      try {
        const detail = await fetchSessionDetail(sessionId);
        applySessionDetail(detail);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load session");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [applySessionDetail],
  );

  const refreshSessions = useCallback(async () => {
    const list = await fetchSessions();
    setSessions(list);
  }, []);

  const reloadActiveMessages = useCallback(async () => {
    if (!activeSessionId) return;
    const detail = await fetchSessionDetail(activeSessionId);
    applySessionDetail(detail);
  }, [activeSessionId, applySessionDetail]);

  const createSession = useCallback(async (): Promise<string | null> => {
    abortStream();
    setError(null);
    try {
      const res = await fetch("/api/assistant/sessions", { method: "POST" });
      if (!res.ok) throw new Error("Failed to create session");
      const data = (await res.json()) as { session: AssistantSessionSummary };
      setSessions((prev) => [data.session, ...prev]);
      setActiveSessionId(data.session.id);
      writeStoredSessionId(data.session.id);
      setMessages([]);
      if (pathname.startsWith("/assistant")) {
        router.replace(`/assistant/${data.session.id}`);
      }
      return data.session.id;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create session");
      return null;
    }
  }, [abortStream, pathname, router]);

  const switchSession = useCallback(
    async (sessionId: string) => {
      if (sessionId === activeSessionId) {
        setHistoryOpen(false);
        return;
      }
      if (streaming) {
        const ok = window.confirm(
          "A reply is still generating. Switch chats anyway?",
        );
        if (!ok) return;
        abortStream();
      }
      setHistoryOpen(false);
      await loadSession(sessionId);
      if (pathname.startsWith("/assistant")) {
        router.replace(`/assistant/${sessionId}`);
      }
    },
    [
      activeSessionId,
      streaming,
      abortStream,
      loadSession,
      pathname,
      router,
    ],
  );

  const deleteSession = useCallback(
    async (sessionId: string) => {
      const res = await fetch(`/api/assistant/sessions/${sessionId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to delete session");
      }
      const list = await fetchSessions();
      setSessions(list);
      if (activeSessionId === sessionId) {
        if (list.length > 0) {
          await loadSession(list[0]!.id);
          if (pathname.startsWith("/assistant")) {
            router.replace(`/assistant/${list[0]!.id}`);
          }
        } else {
          await createSession();
        }
      }
    },
    [
      activeSessionId,
      refreshSessions,
      loadSession,
      createSession,
      pathname,
      router,
    ],
  );

  const renameSession = useCallback(
    async (sessionId: string, title: string) => {
      const res = await fetch(`/api/assistant/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to rename session");
      }
      const data = (await res.json()) as { session: AssistantSessionSummary };
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? data.session : s)),
      );
    },
    [],
  );

  useEffect(() => {
    if (!ready) return;
    const match = pathname.match(/^\/assistant\/([^/]+)$/);
    const urlSessionId = match?.[1];
    if (urlSessionId && urlSessionId !== activeSessionId) {
      void loadSession(urlSessionId).catch(() => {
        /* loadSession sets error */
      });
    }
  }, [pathname, ready, activeSessionId, loadSession]);

  useEffect(() => {
    if (bootstrapStarted.current) return;
    bootstrapStarted.current = true;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        let list = await fetchSessions();
        setSessions(list);

        const pathMatch = pathname.match(/^\/assistant\/([^/]+)$/);
        const pathSessionId = pathMatch?.[1] ?? null;
        const storedId = readStoredSessionId();

        let targetId: string | null = pathSessionId ?? storedId ?? null;
        if (targetId && !list.some((s) => s.id === targetId)) {
          targetId = null;
        }
        if (!targetId && list.length > 0) {
          targetId = list[0]!.id;
        }
        if (!targetId) {
          const res = await fetch("/api/assistant/sessions", {
            method: "POST",
          });
          if (!res.ok) throw new Error("Failed to create session");
          const data = (await res.json()) as {
            session: AssistantSessionSummary;
          };
          list = [data.session, ...list];
          setSessions(list);
          targetId = data.session.id;
        }

        await loadSession(targetId!);
        if (pathname === "/assistant" && targetId) {
          router.replace(`/assistant/${targetId}`);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to initialize assistant");
      } finally {
        setLoading(false);
        setReady(true);
      }
    })();
  }, [loadSession, pathname, router]);

  const value = useMemo(
    () => ({
      ready,
      sessions,
      activeSessionId,
      messages,
      loading,
      streaming,
      error,
      historyOpen,
      setHistoryOpen,
      createSession,
      switchSession,
      deleteSession,
      renameSession,
      refreshSessions,
      reloadActiveMessages,
      setStreaming,
      registerStreamAbort,
      abortStream,
    }),
    [
      ready,
      sessions,
      activeSessionId,
      messages,
      loading,
      streaming,
      error,
      historyOpen,
      createSession,
      switchSession,
      deleteSession,
      renameSession,
      refreshSessions,
      reloadActiveMessages,
      abortStream,
      registerStreamAbort,
    ],
  );

  return (
    <AssistantSessionContext.Provider value={value}>
      {children}
    </AssistantSessionContext.Provider>
  );
}

export function useAssistantSession(): AssistantSessionContextValue {
  const ctx = useContext(AssistantSessionContext);
  if (!ctx) {
    throw new Error(
      "useAssistantSession must be used within AssistantSessionProvider",
    );
  }
  return ctx;
}

export function useAssistantSessionOptional(): AssistantSessionContextValue | null {
  return useContext(AssistantSessionContext);
}
