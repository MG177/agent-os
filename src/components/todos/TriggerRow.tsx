"use client";

import { X } from "lucide-react";
import {
  type TriggerDoc,
  nextTriggerRun,
  formatNextShort,
} from "@/lib/trigger-format";

const TYPE_OPTIONS = [
  { value: "hourly", label: "Hourly" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "cron", label: "Custom cron" },
] as const;

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MINUTES = [0, 15, 30, 45];
const MONTH_DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const INTERVALS = Array.from({ length: 24 }, (_, i) => i + 1);
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => ({
  value: h,
  label: `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "AM" : "PM"}`,
}));

const CELL =
  "rounded-xl bg-slate-50 px-2 py-1.5 text-sm text-slate-700 ring-1 ring-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";

function minuteLabel(m: number) {
  return `:${String(m).padStart(2, "0")}`;
}

interface Props {
  trigger: TriggerDoc;
  onChange: (updated: TriggerDoc) => void;
  onRemove: () => void;
  canRemove: boolean;
}

export function TriggerRow({ trigger, onChange, onRemove, canRemove }: Props) {
  const set = (patch: Partial<TriggerDoc>) => onChange({ ...trigger, ...patch });
  const next = nextTriggerRun(trigger);

  return (
    <div className="grid grid-cols-12 items-center gap-2 border-t border-slate-100 px-3 py-2.5">
      {/* Type */}
      <div className="col-span-3">
        <select
          className={`w-full font-medium ${CELL}`}
          value={trigger.type}
          onChange={(e) => {
            const nextType = e.target.value as TriggerDoc["type"];
            const patch: Partial<TriggerDoc> = { type: nextType };
            // Seed a real default so the UI (which shows Mon active) matches the
            // data — otherwise "Next" is blank and save fails validation.
            if (nextType === "weekly" && !trigger.weeklyDays?.length) {
              patch.weeklyDays = [1];
            }
            set(patch);
          }}
        >
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Schedule */}
      <div className="col-span-7 flex flex-wrap items-center gap-1.5 text-sm text-slate-600">
        {trigger.type === "hourly" && (
          <>
            <span className="text-slate-500">Every</span>
            <select
              className={CELL}
              value={trigger.hourlyInterval ?? 1}
              onChange={(e) => set({ hourlyInterval: Number(e.target.value) })}
            >
              {INTERVALS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span className="text-slate-500">hour{(trigger.hourlyInterval ?? 1) > 1 ? "s" : ""}</span>
          </>
        )}

        {trigger.type === "daily" && (
          <>
            <span className="text-slate-500">At</span>
            <select
              className={CELL}
              value={trigger.dailyHour ?? 9}
              onChange={(e) => set({ dailyHour: Number(e.target.value) })}
            >
              {HOUR_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select
              className={CELL}
              value={trigger.dailyMinute ?? 0}
              onChange={(e) => set({ dailyMinute: Number(e.target.value) })}
            >
              {MINUTES.map((m) => (
                <option key={m} value={m}>{minuteLabel(m)}</option>
              ))}
            </select>
          </>
        )}

        {trigger.type === "weekly" && (
          <>
            {DAYS.map((d, i) => {
              const active = (trigger.weeklyDays ?? [1]).includes(i);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    const days = trigger.weeklyDays ?? [1];
                    set({
                      weeklyDays: active
                        ? days.filter((x) => x !== i)
                        : [...days, i].sort((a, b) => a - b),
                    });
                  }}
                  className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors ${
                    active
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {d}
                </button>
              );
            })}
            <span className="text-slate-400">at</span>
            <select
              className={CELL}
              value={trigger.weeklyHour ?? 9}
              onChange={(e) => set({ weeklyHour: Number(e.target.value) })}
            >
              {HOUR_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select
              className={CELL}
              value={trigger.weeklyMinute ?? 0}
              onChange={(e) => set({ weeklyMinute: Number(e.target.value) })}
            >
              {MINUTES.map((m) => (
                <option key={m} value={m}>{minuteLabel(m)}</option>
              ))}
            </select>
          </>
        )}

        {trigger.type === "monthly" && (
          <>
            <span className="text-slate-500">Day</span>
            <select
              className={CELL}
              value={trigger.monthlyDay ?? 1}
              onChange={(e) => set({ monthlyDay: Number(e.target.value) })}
            >
              {MONTH_DAYS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <span className="text-slate-400">at</span>
            <select
              className={CELL}
              value={trigger.monthlyHour ?? 9}
              onChange={(e) => set({ monthlyHour: Number(e.target.value) })}
            >
              {HOUR_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select
              className={CELL}
              value={trigger.monthlyMinute ?? 0}
              onChange={(e) => set({ monthlyMinute: Number(e.target.value) })}
            >
              {MINUTES.map((m) => (
                <option key={m} value={m}>{minuteLabel(m)}</option>
              ))}
            </select>
          </>
        )}

        {trigger.type === "cron" && (
          <input
            className={`w-full font-mono ${CELL}`}
            placeholder="0 9 * * 1-5"
            value={trigger.cronExpr ?? ""}
            onChange={(e) => set({ cronExpr: e.target.value })}
          />
        )}
      </div>

      {/* Next + remove */}
      <div className="col-span-2 flex items-center justify-end gap-1.5">
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
            next ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-400"
          }`}
          title={next ? next.toLocaleString() : "No upcoming run"}
        >
          {formatNextShort(next)}
        </span>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-slate-300 transition-colors hover:text-red-500"
            title="Remove trigger"
          >
            <X strokeWidth={2} className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
