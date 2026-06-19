import { NextRequest } from "next/server";
import { clearClickUpCache } from "@agent-os/platform/integrations/clickup/cache";
import {
  ClickUpNotConnectedError,
  completeTask,
  getTaskDetail,
  updateTask,
} from "@agent-os/platform/integrations/clickup/client";
import { isClickUpReady } from "@agent-os/platform/integrations/clickup/config";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isClickUpReady()) {
    return Response.json({ error: "ClickUp not configured" }, { status: 503 });
  }
  const { id } = await params;
  try {
    const detail = await getTaskDetail(decodeURIComponent(id));
    return Response.json(detail);
  } catch (err) {
    if (err instanceof ClickUpNotConnectedError) {
      return Response.json({ error: "not_connected" }, { status: 401 });
    }
    return Response.json({ markdownContent: null, textContent: null });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isClickUpReady()) {
    return Response.json(
      { error: "ClickUp integration is not configured" },
      { status: 503 },
    );
  }

  const { id } = await params;
  const taskId = decodeURIComponent(id);

  let body: {
    action?: "complete";
    listId?: string;
    status?: string;
    priority?: number | null;
    dueDate?: number | null;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    let task;
    if (body.action === "complete") {
      if (!body.listId) {
        return Response.json(
          { error: "listId is required to complete a task" },
          { status: 400 },
        );
      }
      task = await completeTask(taskId, body.listId);
    } else {
      const patch: {
        status?: string;
        priority?: number | null;
        dueDate?: number | null;
      } = {};
      if (body.status !== undefined) patch.status = body.status;
      if (body.priority !== undefined) patch.priority = body.priority;
      if (body.dueDate !== undefined) patch.dueDate = body.dueDate;
      if (Object.keys(patch).length === 0) {
        return Response.json({ error: "No changes provided" }, { status: 400 });
      }
      task = await updateTask(taskId, patch);
    }

    clearClickUpCache();
    return Response.json({ task });
  } catch (err) {
    if (err instanceof ClickUpNotConnectedError) {
      return Response.json(
        { error: "not_connected", message: err.message },
        { status: 401 },
      );
    }
    const message = err instanceof Error ? err.message : "ClickUp request failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
