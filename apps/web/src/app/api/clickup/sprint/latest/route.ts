import { NextRequest } from "next/server";
import { ClickUpNotConnectedError } from "@/lib/integrations/clickup/client";
import { isClickUpReady } from "@/lib/integrations/clickup/config";
import { getLatestSprintTasksCached } from "@/lib/integrations/clickup/sprint-service";

export async function GET(request: NextRequest) {
  if (!isClickUpReady()) {
    return Response.json(
      { error: "ClickUp integration is not configured" },
      { status: 503 },
    );
  }

  const skipCache =
    new URL(request.url).searchParams.get("refresh") === "1";

  try {
    const data = await getLatestSprintTasksCached({ skipCache });
    return Response.json(data, {
      headers: {
        "Cache-Control": "private, max-age=15, stale-while-revalidate=60",
      },
    });
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
