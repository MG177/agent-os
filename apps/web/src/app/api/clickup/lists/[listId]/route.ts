import { NextRequest } from "next/server";
import {
  ClickUpNotConnectedError,
  getListStatuses,
} from "@agent-os/platform/integrations/clickup/client";
import { isClickUpReady } from "@agent-os/platform/integrations/clickup/config";

/** Status definitions for a list — powers the detail-panel status picker. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ listId: string }> },
) {
  if (!isClickUpReady()) {
    return Response.json(
      { error: "ClickUp integration is not configured" },
      { status: 503 },
    );
  }
  const { listId } = await params;
  try {
    const statuses = await getListStatuses(decodeURIComponent(listId));
    return Response.json({ statuses });
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
