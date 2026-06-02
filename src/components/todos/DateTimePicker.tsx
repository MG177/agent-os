"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatHour12 } from "@/lib/trigger-format";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const HOURS12 = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5); // 0,5,…,55

function parseLocal(s: string): Date {
  const [datePart, timePart] = s.split("T");
  const [y, mo, d] = datePart.split("-").map(Number);
  const [h, mi] = (timePart ?? "09:00").split(":").map(Number);
  return new Date(y, mo - 1, d, h, mi);
}

function toLocalInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function fmtSummary(d: Date): string {
  const date = d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return `${date} · ${formatHour12(d.getHours(), d.getMinutes())}`;
}

interface Props {
  value: string; // "YYYY-MM-DDTHH:mm" or ""
  onChange: (value: string) => void;
}

export function DateTimePicker({ value, onChange }: Props) {
  const selected = value ? parseLocal(value) : null;
  const [view, setView] = useState(() => {
    const d = selected ?? new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  // Keep the visible month in sync when the value changes from outside
  // (quick presets, editing an existing reminder).
  useEffect(() => {
    const d = value ? parseLocal(value) : new Date();
    setView({ y: d.getFullYear(), m: d.getMonth() });
  }, [value]);

  const baseHour = selected ? selected.getHours() : 9;
  const baseMin = selected ? selected.getMinutes() : 0;

  const today = startOfToday();
  const now = new Date();

  function emit(year: number, month: number, day: number, h24: number, min: number) {
    onChange(toLocalInput(new Date(year, month, day, h24, min)));
  }

  function pickDay(day: number) {
    emit(view.y, view.m, day, baseHour, baseMin);
  }

  function setTime(h24: number, min: number) {
    const b = selected ?? new Date();
    emit(b.getFullYear(), b.getMonth(), b.getDate(), h24, min);
  }

  // ── quick presets ──
  const presets: { label: string; go: () => void }[] = [
    {
      label: "In 1 hour",
      go: () => {
        const d = new Date(Date.now() + 3600_000);
        d.setSeconds(0, 0);
        onChange(toLocalInput(d));
      },
    },
    {
      label: "Tonight 6 PM",
      go: () => {
        const d = new Date();
        d.setHours(18, 0, 0, 0);
        if (d <= new Date()) d.setDate(d.getDate() + 1);
        onChange(toLocalInput(d));
      },
    },
    {
      label: "Tomorrow 9 AM",
      go: () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(9, 0, 0, 0);
        onChange(toLocalInput(d));
      },
    },
    {
      label: "Next Mon 9 AM",
      go: () => {
        const d = new Date();
        const add = (8 - d.getDay()) % 7 || 7;
        d.setDate(d.getDate() + add);
        d.setHours(9, 0, 0, 0);
        onChange(toLocalInput(d));
      },
    },
  ];

  // ── calendar grid ──
  const firstDow = new Date(view.y, view.m, 1).getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const monthLabel = new Date(view.y, view.m, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const atCurrentMonth = view.y === now.getFullYear() && view.m === now.getMonth();

  function shiftMonth(delta: number) {
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  // ── time selector state (derived) ──
  const mer = baseHour < 12 ? "AM" : "PM";
  const hour12 = baseHour % 12 === 0 ? 12 : baseHour % 12;
  const to24 = (h12: number, m: "AM" | "PM") =>
    m === "AM" ? h12 % 12 : (h12 % 12) + 12;

  const cell =
    "rounded-xl bg-slate-50 px-2.5 py-2 text-sm text-slate-700 ring-1 ring-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="space-y-3">
      {/* Quick presets */}
      <div className="flex flex-wrap gap-1.5">
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={p.go}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* Calendar */}
        <div className="rounded-2xl border border-slate-200 p-3">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              disabled={atCurrentMonth}
              className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent"
              aria-label="Previous month"
            >
              <ChevronLeft strokeWidth={2} className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-slate-800">{monthLabel}</span>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              aria-label="Next month"
            >
              <ChevronRight strokeWidth={2} className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-1 text-[10px] font-semibold text-slate-400">
                {d}
              </div>
            ))}
            {cells.map((c, i) => {
              if (c === null) return <div key={`b${i}`} />;
              const dayDate = new Date(view.y, view.m, c);
              const isPast = dayDate < today;
              const isSel =
                selected &&
                selected.getFullYear() === view.y &&
                selected.getMonth() === view.m &&
                selected.getDate() === c;
              const isToday =
                now.getFullYear() === view.y &&
                now.getMonth() === view.m &&
                now.getDate() === c;
              return (
                <button
                  key={c}
                  type="button"
                  disabled={isPast}
                  onClick={() => pickDay(c)}
                  className={`h-9 rounded-lg text-sm transition-colors ${
                    isSel
                      ? "bg-blue-600 font-semibold text-white"
                      : isPast
                        ? "cursor-not-allowed text-slate-300"
                        : isToday
                          ? "font-semibold text-blue-600 ring-1 ring-inset ring-blue-200 hover:bg-blue-50"
                          : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        {/* Time + summary */}
        <div className="flex flex-col gap-3">
          <div>
            <p className="mb-1.5 text-xs font-semibold text-slate-700">Time</p>
            <div className="flex items-center gap-1.5">
              <select
                className={cell}
                value={hour12}
                onChange={(e) => setTime(to24(Number(e.target.value), mer), baseMin)}
              >
                {HOURS12.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
              <span className="font-semibold text-slate-400">:</span>
              <select
                className={cell}
                value={baseMin - (baseMin % 5)}
                onChange={(e) => setTime(baseHour, Number(e.target.value))}
              >
                {MINUTES.map((m) => (
                  <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
                ))}
              </select>
              <div className="ml-1 inline-flex rounded-xl bg-slate-100 p-0.5">
                {(["AM", "PM"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setTime(to24(hour12, m), baseMin)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                      mer === m ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-violet-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400">
              Fires
            </p>
            <p className="mt-1 text-sm font-semibold text-violet-900">
              {selected ? fmtSummary(selected) : "Pick a date"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
