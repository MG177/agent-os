"use client";

import { useState } from "react";
import { GripVertical, RotateCcw, SlidersHorizontal } from "lucide-react";
import { StatusDot } from "@/components/clickup/StatusPill";

/**
 * Toolbar control to hide/show and reorder task statuses. Reorder is native
 * drag-and-drop on the grip handle; visibility is a checkbox per status.
 */
export function StatusFilter({
  statuses,
  hidden,
  onToggle,
  onReorder,
  onReset,
}: {
  statuses: { status: string; color: string }[];
  hidden: Set<string>;
  onToggle: (status: string) => void;
  onReorder: (from: string, to: string) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [dragStatus, setDragStatus] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  if (statuses.length === 0) return null;

  const hiddenCount = statuses.filter((s) => hidden.has(s.status)).length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
          hiddenCount > 0
            ? "bg-accent text-primary hover:bg-accent"
            : "text-slate-500 hover:bg-slate-100"
        }`}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.8} />
        Status
        {hiddenCount > 0 && (
          <span className="rounded-full bg-accent px-1.5 text-[10px] font-semibold text-primary">
            {hiddenCount} hidden
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close status filter"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 cursor-default"
          />
          <div className="absolute left-0 z-40 mt-1 w-60 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lg">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="app-section-label">Show statuses</span>
              <button
                type="button"
                onClick={onReset}
                className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <RotateCcw className="h-3 w-3" strokeWidth={1.8} />
                Reset
              </button>
            </div>
            <ul className="max-h-72 overflow-y-auto">
              {statuses.map((s) => {
                const visible = !hidden.has(s.status);
                return (
                  <li
                    key={s.status}
                    onDragOver={(e) => {
                      if (!dragStatus || dragStatus === s.status) return;
                      e.preventDefault();
                      setDragOver(s.status);
                    }}
                    onDragLeave={() =>
                      setDragOver((d) => (d === s.status ? null : d))
                    }
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragStatus) onReorder(dragStatus, s.status);
                      setDragOver(null);
                    }}
                    className={`flex items-center gap-1.5 rounded-lg px-1 py-1 ${
                      dragOver === s.status ? "ring-2 ring-ring" : ""
                    } ${dragStatus === s.status ? "opacity-50" : ""}`}
                  >
                    <span
                      draggable
                      onDragStart={() => setDragStatus(s.status)}
                      onDragEnd={() => {
                        setDragStatus(null);
                        setDragOver(null);
                      }}
                      aria-label={`Drag ${s.status} to reorder`}
                      className="cursor-grab text-slate-300 transition-colors hover:text-slate-400 active:cursor-grabbing"
                    >
                      <GripVertical className="h-3.5 w-3.5" />
                    </span>
                    <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={visible}
                        onChange={() => onToggle(s.status)}
                        className="h-3.5 w-3.5 rounded border-slate-300 accent-blue-600"
                      />
                      <StatusDot color={s.color} />
                      <span
                        className={`min-w-0 flex-1 truncate text-xs font-medium ${
                          visible ? "text-slate-700" : "text-slate-400 line-through"
                        }`}
                      >
                        {s.status}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
