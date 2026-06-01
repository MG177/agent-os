import { NextRequest } from "next/server";
import { clearClickUpCache } from "@/lib/integrations/clickup/cache";
import {
  ClickUpNotConnectedError,
  getTeams,
} from "@/lib/integrations/clickup/client";
import { isClickUpReady } from "@/lib/integrations/clickup/config";
import {
  loadTokenRecord,
  setActiveTeam,
} from "@/lib/integrations/clickup/store";

/** List the workspaces the token can access + which one is active. */
export async function GET() {
  if (!isClickUpReady()) {
    return Response.json(
      { error: "ClickUp integration is not configured" },
      { status: 503 },
    );
  }
  try {
    const [teams, activeRecord] = await Promise.all([getTeams(), loadTokenRecord()]);
    const activeTeamId = activeRecord?.teamId ?? null;
    return Response.json({ teams, activeTeamId });
  } catch (err) {
    return errorResponse(err);
  }
}

/** Switch the active workspace. Body: { teamId } */
export async function POST(request: NextRequest) {
  if (!isClickUpReady()) {
    return Response.json(
      { error: "ClickUp integration is not configured" },
      { status: 503 },
    );
  }

  let body: { teamId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.teamId) {
    return Response.json({ error: "teamId is required" }, { status: 400 });
  }

  try {
    const teams = await getTeams();
    const team = teams.find((t) => t.id === body.teamId);
    if (!team) {
      return Response.json(
        { error: "That workspace is not available to this token" },
        { status: 400 },
      );
    }
    await setActiveTeam(team.id, team.name);
    clearClickUpCache();
    return Response.json({ ok: true, teamId: team.id, teamName: team.name });
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
