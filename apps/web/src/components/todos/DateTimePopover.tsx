"use client";

import { useState } from "react";
import { Calendar } from "lucide-react";
import { DateTimePicker } from "./DateTimePicker";
import { formatHour12 } from "@agent-os/contracts/trigger-format";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@agent-os/contracts/utils";

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
  value: string;
  onChange: (value: string) => void;
  className?: string;
  mode?: "date" | "datetime";
  minDate?: Date;
  maxDate?: Date;
  allowClear?: boolean;
  summaryLabel?: string;
  triggerLabel?: string;
  emptyLabel?: string;
  disabled?: boolean;
}

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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className={cn(
          "inline-flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-slate-700 ring-1 ring-slate-200 transition-colors hover:ring-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      >
        <span className="truncate">
          {triggerLabel ?? (pillLabel(value, mode) || emptyLabel)}
        </span>
        <Calendar strokeWidth={1.8} className="size-4 shrink-0 text-slate-400" aria-hidden />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[min(560px,calc(100vw-2rem))] rounded-xl border-slate-200 p-3"
      >
        <DateTimePicker
          value={value}
          onChange={(v) => {
            onChange(v);
            if (mode === "date") setOpen(false);
          }}
          mode={mode}
          minDate={minDate}
          maxDate={maxDate}
          allowClear={allowClear}
          summaryLabel={summaryLabel}
        />
        <div className="mt-3 flex justify-end">
          <Button
            type="button"
            size="sm"
            className="h-auto rounded-lg px-3 py-1.5 text-xs font-semibold"
            onClick={() => setOpen(false)}
          >
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
