import { NextRequest } from "next/server";
import { clearClickUpCache } from "@agent-os/platform/integrations/clickup/cache";
import { ClickUpNotConnectedError, createTask } from "@agent-os/platform/integrations/clickup/client";
import { isClickUpReady } from "@agent-os/platform/integrations/clickup/config";
import { groupTasks, type DueFilter } from "@agent-os/platform/integrations/clickup/group";
import { getMyTasksCached } from "@agent-os/platform/integrations/clickup/tasks-service";

const DUE_VALUES: DueFilter[] = ["all", "overdue", "today", "week"];

export async function GET(request: NextRequest) {
  if (!isClickUpReady()) {
    return Response.json(
      { error: "ClickUp integration is not configured" },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const dueParam = searchParams.get("due");
  const due: DueFilter = DUE_VALUES.includes(dueParam as DueFilter)
    ? (dueParam as DueFilter)
    : "all";
  const priority = searchParams.get("priority");
  const includeClosed = searchParams.get("includeClosed") === "1";
  const skipCache = searchParams.get("refresh") === "1";

  try {
    const tasks = await getMyTasksCached({ includeClosed, skipCache });
    // Short private cache — SWR client cache dedupes re-fetches; this lets the
    // browser also reuse the response for a short window between SWR dedup intervals.
    return Response.json(groupTasks(tasks, { due, priority }), {
      headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=60" },
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  if (!isClickUpReady()) {
    return Response.json(
      { error: "ClickUp integration is not configured" },
      { status: 503 },
    );
  }

  let body: { name?: string; listId?: string; dueDate?: number | null; priority?: number | null };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return Response.json({ error: "Task name is required" }, { status: 400 });
  }
  if (!body.listId) {
    return Response.json({ error: "listId is required" }, { status: 400 });
  }

  try {
    const task = await createTask(body.listId, {
      name,
      dueDate: body.dueDate ?? null,
      priority: body.priority ?? null,
    });
    // Invalidate so the next GET reflects the new task immediately.
    clearClickUpCache();
    return Response.json({ task }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}

function errorResponse(err: unknown): Response {
  if (err instanceof ClickUpNotConnectedError) {
    return Response.json(
      { error: "not_connected", message: err.message },
      { status: 401 },
    );
  }
  const message = err instanceof Error ? err.message : "ClickUp request failed";
  return Response.json({ error: message }, { status: 500 });
}
