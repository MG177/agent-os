"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Loader2, Play, Send, Square, X } from "lucide-react";
import {
  DUE_TONE_CLASS,
  PRIORITY_OPTIONS,
  formatDue,
  priorityLevel,
} from "@/components/clickup/clickup-format";
import { StatusPill } from "@/components/clickup/StatusPill";
import { DateTimePopover } from "@/components/todos/DateTimePopover";
import type {
  ClickUpComment,
  ClickUpTask,
  ClickUpTaskStatus,
} from "@/components/clickup/types";

function toDateInput(ms: number | null): string {
  if (ms == null) return "";
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function formatCommentDate(ms: number | null): string {
  if (ms == null) return "";
  return new Date(ms).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function TaskDetailPanel({
  task,
  trackingThis,
  timerBusy,
  onStartTimer,
  onStopTimer,
  onClose,
  onChanged,
}: {
  task: ClickUpTask;
  trackingThis: boolean;
  timerBusy: boolean;
  onStartTimer: (taskId: string) => void;
  onStopTimer: () => void;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [statuses, setStatuses] = useState<ClickUpTaskStatus[]>([]);
  const [comments, setComments] = useState<ClickUpComment[] | null>(null);
  const [commentText, setCommentText] = useState("");
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);
  const due = formatDue(task.dueDate);

  // Load the list's status options for the picker.
  useEffect(() => {
    let cancelled = false;
    setStatuses([]);
    fetch(`/api/clickup/lists/${encodeURIComponent(task.listId)}`)
      .then((r) => (r.ok ? r.json() : { statuses: [] }))
      .then((d) => {
        if (!cancelled) setStatuses(d.statuses ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [task.listId]);

  const loadComments = useCallback(async () => {
    setComments(null);
    try {
      const res = await fetch(
        `/api/clickup/tasks/${encodeURIComponent(task.id)}/comments`,
      );
      const data = res.ok ? await res.json() : { comments: [] };
      setComments(data.comments ?? []);
    } catch {
      setComments([]);
    }
  }, [task.id]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const patch = useCallback(
    async (body: Record<string, unknown>) => {
      setSaving(true);
      try {
        const res = await fetch(
          `/api/clickup/tasks/${encodeURIComponent(task.id)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
        );
        if (res.ok) onChanged();
      } finally {
        setSaving(false);
      }
    },
    [task.id, onChanged],
  );

  async function postComment(e: React.FormEvent) {
    e.preventDefault();
    const text = commentText.trim();
    if (!text) return;
    setPosting(true);
    try {
      const res = await fetch(
        `/api/clickup/tasks/${encodeURIComponent(task.id)}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        },
      );
      if (res.ok) {
        setCommentText("");
        await loadComments();
      }
    } finally {
      setPosting(false);
    }
  }

  const currentPriority = priorityLevel(task.priority?.priority);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-start gap-2 border-b border-slate-100 p-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-slate-400">{task.listName}</p>
          <h2 className="mt-0.5 text-base font-semibold leading-snug text-slate-900">
            {task.name}
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {task.url && (
            <a
              href={task.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open in ClickUp"
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {/* Status */}
        <div>
          <p className="app-section-label mb-1.5">Status</p>
          {statuses.length > 0 ? (
            <select
              value={task.status.status}
              disabled={saving}
              onChange={(e) => patch({ status: e.target.value })}
              className="w-full rounded-xl bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {statuses.map((s) => (
                <option key={s.status} value={s.status}>
                  {s.status.toUpperCase()}
                </option>
              ))}
            </select>
          ) : (
            <StatusPill status={task.status.status} color={task.status.color} />
          )}
        </div>

        {/* Priority */}
        <div>
          <p className="app-section-label mb-1.5">Priority</p>
          <div className="flex flex-wrap gap-1.5">
            {PRIORITY_OPTIONS.map((p) => {
              const active = currentPriority === p.level;
              return (
                <button
                  key={p.key}
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    patch({ priority: active ? null : p.level })
                  }
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
                    active
                      ? "text-white"
                      : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                  }`}
                  style={active ? { backgroundColor: p.color } : undefined}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Due date */}
        <div>
          <p className="app-section-label mb-1.5">Due date</p>
          <div className="flex items-center gap-2">
            <DateTimePopover
              value={task.dueDate != null ? `${toDateInput(task.dueDate)}T00:00` : ""}
              onChange={(v) => {
                if (!v) {
                  patch({ dueDate: null });
                  return;
                }
                const [y, m, d] = v.slice(0, 10).split("-").map(Number);
                patch({ dueDate: y && m && d ? new Date(y, m - 1, d).getTime() : null });
              }}
              mode="date"
              allowClear
              disabled={saving}
              emptyLabel="Set due date"
              summaryLabel="Due"
              className="justify-between text-sm font-medium"
            />
            {due && (
              <span className={`text-xs font-medium ${DUE_TONE_CLASS[due.tone]}`}>
                {due.label}
              </span>
            )}
          </div>
        </div>

        {/* Tags */}
        {task.tags.length > 0 && (
          <div>
            <p className="app-section-label mb-1.5">Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {task.tags.map((tag) => (
                <span
                  key={tag.name}
                  className="rounded-md px-2 py-0.5 text-xs font-medium"
                  style={{ color: tag.fg, backgroundColor: tag.bg }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Time tracking */}
        <div>
          <p className="app-section-label mb-1.5">Time tracking</p>
          {trackingThis ? (
            <button
              type="button"
              onClick={onStopTimer}
              disabled={timerBusy}
              className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
            >
              {timerBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Square className="h-3.5 w-3.5 fill-current" />
              )}
              Stop timer
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onStartTimer(task.id)}
              disabled={timerBusy}
              className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50"
            >
              {timerBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5 fill-current" />
              )}
              Start timer
            </button>
          )}
        </div>

        {/* Comments */}
        <div>
          <p className="app-section-label mb-1.5">Comments</p>
          {comments === null ? (
            <p className="text-xs text-slate-400">Loading…</p>
          ) : comments.length === 0 ? (
            <p className="text-xs text-slate-400">No comments yet.</p>
          ) : (
            <ul className="space-y-2">
              {comments.map((c) => (
                <li key={c.id} className="rounded-xl bg-slate-50 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-700">
                      {c.user.username ?? c.user.initials ?? "User"}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {formatCommentDate(c.date)}
                    </span>
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-600">
                    {c.text}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Add comment */}
      <form
        onSubmit={postComment}
        className="flex items-center gap-2 border-t border-slate-100 p-3"
      >
        <input
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Add a comment…"
          className="min-w-0 flex-1 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={posting || !commentText.trim()}
          aria-label="Send comment"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {posting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </form>
    </div>
  );
}
