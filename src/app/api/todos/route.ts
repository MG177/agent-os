import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listTodos, getDueTodos, createTodo } from "@/lib/todos";

const TriggerSchema = z.object({
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

const CreateSchema = z.object({
  title: z.string().min(1).max(200),
  notes: z.string().max(500).optional(),
  type: z.enum(["once", "recurring"]),
  dueAt: z.string().datetime().optional(),
  triggers: z.array(TriggerSchema).optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const due = searchParams.get("due") === "true";
  const status = (searchParams.get("status") ?? "active") as "active" | "completed" | "all";

  try {
    const todos = due ? await getDueTodos() : await listTodos(status);
    return NextResponse.json({ todos });
  } catch (err) {
    console.error("GET /api/todos", err);
    return NextResponse.json({ error: "Failed to fetch todos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { title, notes, type, dueAt, triggers } = parsed.data;
  try {
    const todo = await createTodo({
      title,
      notes,
      type,
      dueAt: dueAt ? new Date(dueAt) : undefined,
      triggers,
    });
    return NextResponse.json({ todo }, { status: 201 });
  } catch (err) {
    console.error("POST /api/todos", err);
    return NextResponse.json({ error: "Failed to create todo" }, { status: 500 });
  }
}
