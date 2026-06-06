"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar } from "lucide-react";
import { DateTimePicker } from "./DateTimePicker";
import { formatHour12 } from "@/lib/trigger-format";

// Wide enough that DateTimePicker's `sm:grid-cols-2` (calendar + time) fits on
// desktop; clamped to the viewport on small screens where it stacks to one col.
const POP_WIDTH = 560;

function parseLocal(s: string): Date | null {
  if (!s) return null;
  const [datePart, timePart] = s.split("T");
  if (!datePart) return null;
  const [y, mo, d] = datePart.split("-").map(Number);
  const [h, mi] = (timePart ?? "00:00").split(":").map(Number);
  const dt = new Date(y, mo - 1, d, h, mi);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function pillLabel(s: string, mode: "date" | "datetime"): string {
  const d = parseLocal(s);
  if (!d) return "";
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return mode === "date" ? date : `${date} · ${formatHour12(d.getHours(), d.getMinutes())}`;
}

interface Props {
  value: string; // "YYYY-MM-DDTHH:mm" or ""
  onChange: (value: string) => void;
  /** Applied to the pill trigger so callers can flex/size it in their layout. */
  className?: string;
  /** "datetime" (default) or "date" — passed to DateTimePicker; in date mode picking a day closes the popover. */
  mode?: "date" | "datetime";
  minDate?: Date;
  maxDate?: Date;
  allowClear?: boolean;
  /** Heading on the picker's summary card. */
  summaryLabel?: string;
  /** Override the pill text entirely (e.g. "Today" / "Yesterday"). */
  triggerLabel?: string;
  /** Pill text when no value is set. */
  emptyLabel?: string;
  disabled?: boolean;
}

/**
 * Compact pill that opens the rich DateTimePicker in a portal popover.
 * Portalled to <body> with fixed positioning so it isn't clipped by the
 * modal's `overflow-y-auto` or the trigger table's `overflow-hidden`.
 */
export function DateTimePopover({
  value,
  onChange,
  className = "",
  mode = "datetime",
  minDate,
  maxDate,
  allowClear = false,
  summaryLabel = "Starts",
  triggerLabel,
  emptyLabel = "Pick a date",
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  const place = useCallback(() => {
    const r = triggerRef.current?.getBoundingClientRect();
    if (!r) return;
    const w = Math.min(POP_WIDTH, window.innerWidth - 16);
    let left = r.left;
    if (left + w > window.innerWidth - 8) left = window.innerWidth - w - 8;
    left = Math.max(8, left);
    const h = popRef.current?.offsetHeight ?? 460;
    let top = r.bottom + 6;
    if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 6);
    setCoords({ top, left });
  }, []);

  useEffect(() => {
    if (!open) return;
    place(); // refine once the panel is mounted (real height ⇒ correct flip)

    function onPointerDown(e: PointerEvent) {
      if (popRef.current?.contains(e.target as Node)) return;
      if (triggerRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        // Close only the popover — keep the surrounding modal open. This
        // document-phase listener runs before the modal's window-phase one.
        e.stopPropagation();
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    // capture phase so scrolls inside nested containers reposition too
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, place]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (!open) place();
          setOpen((o) => !o);
        }}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-1.5 text-slate-700 ring-1 ring-slate-200 transition-colors hover:ring-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      >
        <span className="truncate">
          {triggerLabel ?? (pillLabel(value, mode) || emptyLabel)}
        </span>
        <Calendar strokeWidth={1.8} className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popRef}
            role="dialog"
            aria-label="Pick start date and time"
            style={{
              top: coords.top,
              left: coords.left,
              width: Math.min(
                POP_WIDTH,
                typeof window !== "undefined" ? window.innerWidth - 16 : POP_WIDTH,
              ),
            }}
            className="fixed z-[var(--app-z-popover)] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl"
          >
            <DateTimePicker
              value={value}
              onChange={(v) => {
                onChange(v);
                // Date-only fields have nothing left to set — close on pick.
                if (mode === "date") setOpen(false);
              }}
              mode={mode}
              minDate={minDate}
              maxDate={maxDate}
              allowClear={allowClear}
              summaryLabel={summaryLabel}
            />
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
