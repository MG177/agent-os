import { NextRequest } from "next/server";
import {
  ClickUpNotConnectedError,
  getCurrentTimer,
  startTimer,
  stopTimer,
} from "@agent-os/platform/integrations/clickup/client";
import { isClickUpReady } from "@agent-os/platform/integrations/clickup/config";

export async function GET() {
  if (!isClickUpReady()) {
    return Response.json(
      { error: "ClickUp integration is not configured" },
      { status: 503 },
    );
  }
  try {
    const entry = await getCurrentTimer();
    return Response.json({ entry });
  } catch (err) {
    return errorResponse(err);
  }
}

/** POST { action: "start", taskId } | { action: "stop" } */
export async function POST(request: NextRequest) {
  if (!isClickUpReady()) {
    return Response.json(
      { error: "ClickUp integration is not configured" },
      { status: 503 },
    );
  }

  let body: { action?: "start" | "stop"; taskId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    if (body.action === "start") {
      if (!body.taskId) {
        return Response.json({ error: "taskId is required" }, { status: 400 });
      }
      const entry = await startTimer(body.taskId);
      return Response.json({ entry });
    }
    if (body.action === "stop") {
      await stopTimer();
      return Response.json({ entry: null });
    }
    return Response.json(
      { error: "action must be 'start' or 'stop'" },
      { status: 400 },
    );
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
