import { NextRequest } from "next/server";
import { ClickUpNotConnectedError } from "@agent-os/platform/integrations/clickup/client";
import { isClickUpReady } from "@agent-os/platform/integrations/clickup/config";
import { groupTasks } from "@agent-os/platform/integrations/clickup/group";
import { getMyTasksCached } from "@agent-os/platform/integrations/clickup/tasks-service";

/**
 * Lists the user can add tasks to — derived from the lists they already have
 * tasks in. Avoids a full space/folder hierarchy crawl for the quick-add picker.
 */
export async function GET(_request: NextRequest) {
  if (!isClickUpReady()) {
    return Response.json(
      { error: "ClickUp integration is not configured" },
      { status: 503 },
    );
  }
  try {
    const tasks = await getMyTasksCached();
    const { lists } = groupTasks(tasks);
    return Response.json({ lists });
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
