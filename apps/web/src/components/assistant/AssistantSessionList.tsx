"use client";

import { useState } from "react";
import { Clock, Pencil, Trash2, X } from "lucide-react";
import { useAssistantSession } from "@/components/assistant/AssistantSessionContext";

function formatRelative(iso: string): string {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

interface AssistantSessionListProps {
  variant?: "sidebar" | "sheet";
  onClose?: () => void;
}

export default function AssistantSessionList({
  variant = "sidebar",
  onClose,
}: AssistantSessionListProps) {
  const {
    sessions,
    activeSessionId,
    switchSession,
    deleteSession,
    renameSession,
    streaming,
  } = useAssistantSession();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  async function handleSelect(id: string) {
    if (streaming && id !== activeSessionId) {
      const ok = window.confirm(
        "A reply is still generating. Switch chats anyway?",
      );
      if (!ok) return;
    }
    await switchSession(id);
    onClose?.();
  }

  async function handleDelete(id: string, title: string) {
    if (
      !window.confirm(`Delete "${title}"? This cannot be undone.`)
    ) {
      return;
    }
    try {
      await deleteSession(id);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  function startRename(id: string, title: string) {
    setRenamingId(id);
    setRenameValue(title);
  }

  async function commitRename(id: string) {
    const trimmed = renameValue.trim();
    setRenamingId(null);
    if (!trimmed) return;
    try {
      await renameSession(id, trimmed);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Failed to rename");
    }
  }

  const list = (
    <ul className="space-y-1" role="listbox" aria-label="Chat history">
      {sessions.length === 0 && (
        <li className="px-3 py-6 text-center text-xs text-slate-400">
          No chats yet
        </li>
      )}
      {sessions.map((session) => {
        const active = session.id === activeSessionId;
        return (
          <li key={session.id}>
            {renamingId === session.id ? (
              <form
                className="px-2 py-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  void commitRename(session.id);
                }}
              >
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => void commitRename(session.id)}
                  className="app-input w-full py-2 text-xs"
                  aria-label="Rename chat"
                />
              </form>
            ) : (
              <div
                className={`group flex items-stretch gap-0.5 rounded-2xl transition-colors ${active ? "bg-accent" : "hover:bg-slate-50"
                  }`}
              >
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => void handleSelect(session.id)}
                  className="min-w-0 flex-1 px-3 py-2.5 text-left"
                >
                  <p
                    className={`truncate text-xs font-semibold ${active ? "text-primary" : "text-slate-800"
                      }`}
                  >
                    {session.title}
                  </p>
                  {session.preview && (
                    <p className="mt-0.5 truncate text-[11px] text-slate-500">
                      {session.preview}
                    </p>
                  )}
                  <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                    <Clock className="h-3 w-3 shrink-0" strokeWidth={1.8} aria-hidden />
                    {formatRelative(session.updatedAt)}
                  </p>
                </button>
                <div className="flex shrink-0 flex-col justify-center gap-0.5 pr-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                  <button
                    type="button"
                    title="Rename"
                    aria-label={`Rename ${session.title}`}
                    onClick={() => startRename(session.id, session.title)}
                    className="flex h-7 w-7 items-center justify-center rounded-2xl text-slate-400 hover:bg-white hover:text-slate-700"
                  >
                    <Pencil className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
                  </button>
                  <button
                    type="button"
                    title="Delete"
                    aria-label={`Delete ${session.title}`}
                    onClick={() => void handleDelete(session.id, session.title)}
                    className="flex h-7 w-7 items-center justify-center rounded-2xl text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
                  </button>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );

  if (variant === "sheet") {
    return (
      <div className="flex max-h-[min(70dvh,24rem)] flex-col border-b border-slate-100 bg-slate-50/80">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-3 py-2">
          <p className="text-xs font-bold text-slate-700">History</p>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close history"
              className="flex h-7 w-7 items-center justify-center rounded-2xl text-slate-400 hover:bg-slate-100"
            >
              <X className="h-4 w-4" strokeWidth={2} aria-hidden />
            </button>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">{list}</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-col border-r border-slate-100 bg-slate-50/50">
      <div className="shrink-0 border-b border-slate-100 px-4 py-3">
        <p className="text-xs font-bold text-slate-700">History</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">{list}</div>
    </div>
  );
}
