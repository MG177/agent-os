import { z } from "zod";

export const TriggerSchema = z.object({
  id: z.string(),
  type: z.enum(["hourly", "daily", "weekly", "monthly", "cron", "interval"]),
  hourlyInterval: z.number().int().min(1).max(24).optional(),
  dailyHour: z.number().int().min(0).max(23).optional(),
  dailyMinute: z.number().int().min(0).max(59).optional(),
  weeklyDays: z.array(z.number().int().min(0).max(6)).optional(),
  weeklyHour: z.number().int().min(0).max(23).optional(),
  weeklyMinute: z.number().int().min(0).max(59).optional(),
  monthlyDay: z.number().int().min(1).max(31).optional(),
  monthlyHour: z.number().int().min(0).max(23).optional(),
  monthlyMinute: z.number().int().min(0).max(59).optional(),
  cronExpr: z.string().optional(),
  intervalUnit: z.enum(["minute", "hour", "day", "week", "month"]).optional(),
  intervalValue: z.number().int().min(1).max(1000).optional(),
  startAt: z.string().datetime().optional(),
  label: z.string().default(""),
});
