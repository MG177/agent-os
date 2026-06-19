import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { doneTodo, updateTodo, deleteTodo } from "@/lib/todos";

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

const PatchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("done") }),
  z.object({
    action: z.literal("update"),
    title: z.string().min(1).max(200).optional(),
    notes: z.string().max(500).optional(),
    enabled: z.boolean().optional(),
    dueAt: z.string().datetime().optional(),
    triggers: z.array(TriggerSchema).optional(),
  }),
]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    if (parsed.data.action === "done") {
      const todo = await doneTodo(id);
      if (!todo) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ todo });
    }

    const { action: _a, dueAt, ...rest } = parsed.data;
    const todo = await updateTodo(id, {
      ...rest,
      dueAt: dueAt ? new Date(dueAt) : undefined,
    });
    if (!todo) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ todo });
  } catch (err) {
    console.error("PATCH /api/todos/[id]", err);
    return NextResponse.json({ error: "Failed to update todo" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const deleted = await deleteTodo(id);
    if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/todos/[id]", err);
    return NextResponse.json({ error: "Failed to delete todo" }, { status: 500 });
  }
}
