import { NextRequest } from "next/server";
import { clearClickUpCache } from "@agent-os/platform/integrations/clickup/cache";
import { fetchClickUpIdentity } from "@agent-os/platform/integrations/clickup/client";
import { isClickUpReady } from "@agent-os/platform/integrations/clickup/config";
import { saveTokenRecord } from "@agent-os/platform/integrations/clickup/store";

/**
 * Connect ClickUp with a Personal API Token (pk_...). No admin / app
 * registration needed — any workspace member can generate one. We validate it
 * by resolving the account + workspace, then store it encrypted.
 */
export async function POST(request: NextRequest) {
  if (!isClickUpReady()) {
    return Response.json(
      {
        error:
          "TOKEN_ENCRYPTION_KEY is not configured — cannot store the token securely.",
      },
      { status: 503 },
    );
  }

  let body: { token?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const token = body.token?.trim();
  if (!token) {
    return Response.json({ error: "Token is required" }, { status: 400 });
  }

  try {
    const identity = await fetchClickUpIdentity(token);
    await saveTokenRecord({ accessToken: token, ...identity });
    clearClickUpCache();
    return Response.json({ ok: true, connected: true, teamName: identity.teamName });
  } catch {
    return Response.json(
      { error: "That token was rejected by ClickUp. Check it and try again." },
      { status: 400 },
    );
  }
}
