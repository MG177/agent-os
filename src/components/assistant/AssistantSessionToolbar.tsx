"use client";

import { History, Plus } from "lucide-react";
import { useAssistantSession } from "@/components/assistant/AssistantSessionContext";

interface AssistantSessionToolbarProps {
  showHistoryToggle?: boolean;
}

export default function AssistantSessionToolbar({
  showHistoryToggle = true,
}: AssistantSessionToolbarProps) {
  const {
    createSession,
    historyOpen,
    setHistoryOpen,
    streaming,
    loading,
  } = useAssistantSession();

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => void createSession()}
        disabled={loading || streaming}
        title="New chat"
        aria-label="New chat"
        className="flex h-8 items-center gap-1 rounded-xl px-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-blue-600 disabled:opacity-40"
      >
        <Plus className="h-4 w-4" strokeWidth={1.8} aria-hidden />
        <span className="hidden sm:inline">New</span>
      </button>
      {showHistoryToggle && (
        <button
          type="button"
          onClick={() => setHistoryOpen(!historyOpen)}
          title="Chat history"
          aria-label="Chat history"
          aria-expanded={historyOpen}
          className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${historyOpen
              ? "bg-blue-50 text-blue-600"
              : "text-slate-400 hover:bg-slate-50 hover:text-slate-700"
            }`}
        >
          <History className="h-4 w-4" strokeWidth={1.8} aria-hidden />
        </button>
      )}
    </div>
  );
}
