"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import type { LogEntry } from "../types";

const MENU_WIDTH = 176;

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Per-meal actions menu (⋯). Lists Edit + Delete; Delete switches the popover
 * to a confirm step rather than firing immediately. Rendered through a portal
 * so it escapes the card's `overflow-hidden` and surrounding scroll containers;
 * closes on outside-click, Escape, or scroll/resize.
 */
function MealRowMenu({
  label,
  busy,
  onEdit,
  onDelete,
}: {
  label: string;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  function close() {
    setOpen(false);
    setConfirming(false);
  }

  function toggle() {
    if (!open && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setCoords({ top: r.bottom + 4, left: r.right - MENU_WIDTH });
    }
    setConfirming(false);
    setOpen((v) => !v);
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      close();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    function onReflow() {
      close();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    // capture phase so scrolls inside nested containers also close the menu
    window.addEventListener("scroll", onReflow, true);
    window.addEventListener("resize", onReflow);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onReflow, true);
      window.removeEventListener("resize", onReflow);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Options for ${label}`}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-300 transition-colors hover:bg-slate-50 hover:text-slate-600 disabled:opacity-40"
      >
        <MoreHorizontal className="h-4 w-4" strokeWidth={1.8} aria-hidden />
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={`Actions for ${label}`}
            style={{ top: coords.top, left: coords.left, width: MENU_WIDTH }}
            className="fixed z-50 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-lg"
          >
            {confirming ? (
              <div className="px-3 py-2.5">
                <p className="mb-2 text-xs text-slate-500">
                  Delete this meal?
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={close}
                    className="flex-1 rounded-xl border border-slate-200 px-2 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      close();
                      onDelete();
                    }}
                    className="flex-1 rounded-xl bg-red-600 px-2 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-1">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    close();
                    onEdit();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <Pencil className="h-4 w-4" strokeWidth={1.8} aria-hidden />
                  Edit amount
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => setConfirming(true)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.8} aria-hidden />
                  Delete
                </button>
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}

/** A single logged meal — display mode with the ⋯ menu, or inline amount editor. */
function MealRow({
  entry,
  deleting,
  onDelete,
  onEdit,
}: {
  entry: LogEntry;
  deleting: boolean;
  onDelete: (timestamp: string) => void;
  onEdit: (timestamp: string, quantityGrams: number) => Promise<boolean> | boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [grams, setGrams] = useState(entry.quantity_grams);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setGrams(entry.quantity_grams);
    setEditing(true);
  }

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const previewKcal =
    entry.quantity_grams > 0
      ? Math.round((entry.consumed_nutrition.calories * grams) / entry.quantity_grams)
      : 0;

  const canSave = grams > 0 && grams !== entry.quantity_grams && !saving;

  async function save() {
    if (!canSave) return;
    setSaving(true);
    const ok = await onEdit(entry.timestamp, grams);
    setSaving(false);
    if (ok) setEditing(false);
  }

  const { protein_g, carb_g, fat_g, calories } = entry.consumed_nutrition;
  const macroTotal = protein_g + carb_g + fat_g;
  const pPct = macroTotal > 0 ? (protein_g / macroTotal) * 100 : 0;
  const cPct = macroTotal > 0 ? (carb_g / macroTotal) * 100 : 0;
  const fPct = macroTotal > 0 ? (fat_g / macroTotal) * 100 : 0;

  if (editing) {
    return (
      <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
        <p className="text-sm font-medium text-slate-800">{entry.food_name}</p>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex items-baseline gap-1 rounded-xl border border-slate-200 px-2.5 py-1.5">
            <input
              ref={inputRef}
              type="number"
              inputMode="numeric"
              min={0}
              value={grams === 0 ? "" : grams}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                setGrams(Number.isNaN(n) ? 0 : Math.max(0, n));
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") setEditing(false);
              }}
              placeholder="0"
              aria-label={`Amount in grams for ${entry.food_name}`}
              className="w-14 bg-transparent text-center text-sm font-semibold tabular-nums text-slate-900 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="text-sm font-semibold text-slate-500">g</span>
          </div>
          <span className="text-xs text-slate-400">≈ {previewKcal} kcal</span>
        </div>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={save}
            disabled={!canSave}
            className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-40"
          >
            <Check className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-800">{entry.food_name}</p>
          <p className="mt-0.5 text-xs text-slate-400">
            {Math.round(entry.quantity_grams)}g · {formatTime(entry.timestamp)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <div className="text-right">
            <span className="text-base font-bold tabular-nums text-slate-900">
              {Math.round(calories)}
            </span>
            <span className="ml-0.5 text-[10px] font-medium text-slate-400">kcal</span>
          </div>
          <MealRowMenu
            label={entry.food_name}
            busy={deleting}
            onEdit={startEdit}
            onDelete={() => onDelete(entry.timestamp)}
          />
        </div>
      </div>

      <div className="mt-2.5 flex h-1 overflow-hidden rounded-full bg-slate-100">
        <div className="rounded-full bg-blue-600" style={{ width: `${pPct}%` }} />
        <div className="rounded-full bg-green-600" style={{ width: `${cPct}%` }} />
        <div className="rounded-full bg-orange-500" style={{ width: `${fPct}%` }} />
      </div>
      <div className="mt-1.5 flex gap-3">
        <span className="text-[11px] text-slate-400">
          <strong className="font-semibold text-blue-600">{Math.round(protein_g)}g</strong> P
        </span>
        <span className="text-[11px] text-slate-400">
          <strong className="font-semibold text-green-600">{Math.round(carb_g)}g</strong> C
        </span>
        <span className="text-[11px] text-slate-400">
          <strong className="font-semibold text-orange-500">{Math.round(fat_g)}g</strong> F
        </span>
      </div>
    </div>
  );
}

export default function TodayPanel({
  entries,
  deleting,
  onDelete,
  onEdit,
  onLogMeal,
}: {
  entries: LogEntry[];
  deleting: string | null;
  onDelete: (timestamp: string) => void;
  onEdit: (timestamp: string, quantityGrams: number) => Promise<boolean> | boolean;
  /** When omitted (e.g. beside the food workspace), the log shortcuts are hidden. */
  onLogMeal?: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="app-section-label">Meals today</p>
        {onLogMeal && (
          <button
            type="button"
            onClick={onLogMeal}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            + Log meal
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="app-card flex flex-col items-center px-4 py-12 text-center">
          <p className="text-sm text-slate-400">No meals yet today</p>
          {onLogMeal && (
            <button
              type="button"
              onClick={onLogMeal}
              className="mt-3 text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              Log your first meal →
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {[...entries].reverse().map((entry) => (
            <MealRow
              key={entry.timestamp}
              entry={entry}
              deleting={deleting === entry.timestamp}
              onDelete={onDelete}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}
