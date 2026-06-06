"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ExternalLink, Loader2, Monitor, Play, Send, Square, X } from "lucide-react";
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

// ── helpers ───────────────────────────────────────────────────────────────

function toDateInput(ms: number | null): string {
  if (ms == null) return "";
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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

function branchKey(type: "be" | "fe", taskId: string) {
  return `clickup.branch.${type}.${taskId}`;
}

function readBranch(type: "be" | "fe", taskId: string): string {
  try {
    return localStorage.getItem(branchKey(type, taskId)) ?? "";
  } catch {
    return "";
  }
}

function writeBranch(type: "be" | "fe", taskId: string, value: string) {
  try {
    if (value.trim()) {
      localStorage.setItem(branchKey(type, taskId), value);
    } else {
      localStorage.removeItem(branchKey(type, taskId));
    }
  } catch {
    /* ignore */
  }
}

// ── prose markdown used for description + comments ────────────────────────

const PROSE_COMPONENTS = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-2 last:mb-0 text-sm leading-relaxed text-slate-700">{children}</p>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="mb-1 mt-3 text-base font-bold text-slate-900 first:mt-0">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="mb-1 mt-3 text-sm font-bold text-slate-900 first:mt-0">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="mb-1 mt-2 text-sm font-semibold text-slate-800 first:mt-0">{children}</h3>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="mb-2 list-disc pl-4 text-sm text-slate-700 [&>li]:mb-0.5">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="mb-2 list-decimal pl-4 text-sm text-slate-700 [&>li]:mb-0.5">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => <li>{children}</li>,
  code: ({ children, className }: { children?: React.ReactNode; className?: string }) =>
    className ? (
      <code className="block overflow-x-auto rounded-xl bg-slate-50 px-3 py-2 text-xs font-mono text-slate-700">
        {children}
      </code>
    ) : (
      <code className="rounded bg-slate-100 px-1 py-0.5 text-xs font-mono text-slate-700">
        {children}
      </code>
    ),
  pre: ({ children }: { children?: React.ReactNode }) => (
    <pre className="mb-2 overflow-x-auto rounded-xl bg-slate-50 px-3 py-2 text-xs">{children}</pre>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="mb-2 border-l-2 border-slate-200 pl-3 text-sm italic text-slate-500">
      {children}
    </blockquote>
  ),
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 underline hover:text-blue-700"
    >
      {children}
    </a>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-slate-800">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="italic text-slate-600">{children}</em>
  ),
  hr: () => <hr className="my-3 border-slate-100" />,
};

// ── main component ────────────────────────────────────────────────────────

export function TaskDetailModal({
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
  const [description, setDescription] = useState<string | null | "loading">("loading");
  const [beBranch, setBeBranch] = useState("");
  const [feBranch, setFeBranch] = useState("");
  const backdropRef = useRef<HTMLDivElement>(null);
  const due = formatDue(task.dueDate);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Prevent background scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Load branch fields from localStorage
  useEffect(() => {
    setBeBranch(readBranch("be", task.id));
    setFeBranch(readBranch("fe", task.id));
  }, [task.id]);

  // Load status options
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/clickup/lists/${encodeURIComponent(task.listId)}`)
      .then((r) => (r.ok ? r.json() : { statuses: [] }))
      .then((d) => { if (!cancelled) setStatuses(d.statuses ?? []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [task.listId]);

  // Load description lazily
  useEffect(() => {
    let cancelled = false;
    setDescription("loading");
    fetch(`/api/clickup/tasks/${encodeURIComponent(task.id)}`)
      .then((r) => (r.ok ? r.json() : { markdownContent: null, textContent: null }))
      .then((d) => {
        if (!cancelled) setDescription(d.markdownContent ?? d.textContent ?? null);
      })
      .catch(() => { if (!cancelled) setDescription(null); });
    return () => { cancelled = true; };
  }, [task.id]);

  const loadComments = useCallback(async () => {
    setComments(null);
    try {
      const res = await fetch(`/api/clickup/tasks/${encodeURIComponent(task.id)}/comments`);
      const data = res.ok ? await res.json() : { comments: [] };
      setComments(data.comments ?? []);
    } catch {
      setComments([]);
    }
  }, [task.id]);

  useEffect(() => { loadComments(); }, [loadComments]);

  const patch = useCallback(
    async (body: Record<string, unknown>) => {
      setSaving(true);
      try {
        const res = await fetch(`/api/clickup/tasks/${encodeURIComponent(task.id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
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
      const res = await fetch(`/api/clickup/tasks/${encodeURIComponent(task.id)}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
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
    /* Backdrop */
    <div
      ref={backdropRef}
      className="app-modal-overlay flex items-end justify-center bg-slate-900/40 backdrop-blur-[2px] sm:items-center sm:p-4"
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      {/* Modal sheet */}
      <div className="flex max-h-[90dvh] w-full max-w-2xl flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              {task.folderName ? `${task.folderName} · ` : ""}{task.listName}
            </p>
            <h2 className="mt-1 text-base font-semibold leading-snug text-slate-900">
              {task.name}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {/* Open in ClickUp desktop */}
            <a
              href={`clickup://t/${task.id}`}
              aria-label="Open in ClickUp app"
              title="Open in ClickUp desktop"
              className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <Monitor className="h-4 w-4" strokeWidth={1.8} />
            </a>
            {/* Open in ClickUp web */}
            {task.url && (
              <a
                href={task.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open in ClickUp web"
                title="Open in browser"
                className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <ExternalLink className="h-4 w-4" strokeWidth={1.8} />
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-4 w-4" strokeWidth={1.8} />
            </button>
          </div>
        </div>

        {/* ── Scrollable body ──────────────────────────────────────────── */}
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">

          {/* Description */}
          <div>
            <p className="app-section-label mb-1.5">Description</p>
            {description === "loading" ? (
              <p className="flex items-center gap-1.5 text-xs text-slate-400">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading…
              </p>
            ) : description ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={PROSE_COMPONENTS as never}>
                  {description}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="text-xs text-slate-400">No description.</p>
            )}
          </div>

          {/* Branch fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="app-section-label mb-1.5 block" htmlFor={`be-${task.id}`}>
                BE branch
              </label>
              <input
                id={`be-${task.id}`}
                value={beBranch}
                onChange={(e) => {
                  setBeBranch(e.target.value);
                  writeBranch("be", task.id, e.target.value);
                }}
                placeholder="feature/…"
                className="w-full rounded-xl bg-slate-50 px-3 py-2 text-base md:text-sm font-mono text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="app-section-label mb-1.5 block" htmlFor={`fe-${task.id}`}>
                FE branch
              </label>
              <input
                id={`fe-${task.id}`}
                value={feBranch}
                onChange={(e) => {
                  setFeBranch(e.target.value);
                  writeBranch("fe", task.id, e.target.value);
                }}
                placeholder="feature/…"
                className="w-full rounded-xl bg-slate-50 px-3 py-2 text-base md:text-sm font-mono text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Status + Priority side by side */}
          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <p className="app-section-label mb-1.5">Priority</p>
              <div className="flex flex-wrap gap-1">
                {PRIORITY_OPTIONS.map((p) => {
                  const active = currentPriority === p.level;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      disabled={saving}
                      onClick={() => patch({ priority: active ? null : p.level })}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
                        active ? "text-white" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                      }`}
                      style={active ? { backgroundColor: p.color } : undefined}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Due date */}
          <div>
            <p className="app-section-label mb-1.5">Due date</p>
            <div className="flex items-center gap-2">
              <DateTimePopover
                value={task.dueDate != null ? `${toDateInput(task.dueDate)}T00:00` : ""}
                onChange={(v) => {
                  if (!v) { patch({ dueDate: null }); return; }
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
                {timerBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-3.5 w-3.5 fill-current" />}
                Stop timer
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onStartTimer(task.id)}
                disabled={timerBusy}
                className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50"
              >
                {timerBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-3.5 w-3.5 fill-current" />}
                Start timer
              </button>
            )}
          </div>

          {/* Comments */}
          <div>
            <p className="app-section-label mb-1.5">Comments</p>
            {comments === null ? (
              <p className="flex items-center gap-1.5 text-xs text-slate-400">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading…
              </p>
            ) : comments.length === 0 ? (
              <p className="text-xs text-slate-400">No comments yet.</p>
            ) : (
              <ul className="space-y-2">
                {comments.map((c) => (
                  <li key={c.id} className="rounded-2xl bg-slate-50 px-4 py-3">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-700">
                        {c.user.username ?? c.user.initials ?? "User"}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {formatCommentDate(c.date)}
                      </span>
                    </div>
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={PROSE_COMPONENTS as never}>
                      {c.text}
                    </ReactMarkdown>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ── Add comment footer ───────────────────────────────────────── */}
        <form
          onSubmit={postComment}
          className="flex items-center gap-2 border-t border-slate-100 px-4 py-3"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))" }}
        >
          <input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add a comment…"
            className="min-w-0 flex-1 rounded-xl bg-slate-50 px-3 py-2 text-base md:text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={posting || !commentText.trim()}
            aria-label="Send comment"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" strokeWidth={1.8} />}
          </button>
        </form>
      </div>
    </div>
  );
}
