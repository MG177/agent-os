import { NextRequest, NextResponse } from "next/server";
import { clearClickUpCache } from "@agent-os/platform/integrations/clickup/cache";
import { exchangeAuthorizationCode } from "@agent-os/platform/integrations/clickup/oauth";
import { saveTokenRecord } from "@agent-os/platform/integrations/clickup/store";
import { verifyOAuthState } from "@agent-os/core/integrations/oauth-state";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const error = searchParams.get("error");
  if (error) {
    return NextResponse.redirect(
      new URL(
        `/settings/integrations?error=${encodeURIComponent(error)}`,
        request.url,
      ),
    );
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const cookieState = request.cookies.get("clickup_oauth_state")?.value;

  // Signed httpOnly cookie is the source of truth; if ClickUp echoes state back
  // it must match.
  if (!code || !cookieState || (state && state !== cookieState)) {
    return NextResponse.redirect(
      new URL("/settings/integrations?error=invalid_state", request.url),
    );
  }

  if (!verifyOAuthState(cookieState)) {
    return NextResponse.redirect(
      new URL("/settings/integrations?error=expired_state", request.url),
    );
  }

  try {
    const result = await exchangeAuthorizationCode(code);
    await saveTokenRecord(result);
    clearClickUpCache();

    const res = NextResponse.redirect(
      new URL("/settings/integrations?connected=clickup", request.url),
    );
    res.cookies.delete("clickup_oauth_state");
    return res;
  } catch (err) {
    const raw = err instanceof Error ? err.message : "oauth_failed";
    const message =
      raw.includes("ECONNREFUSED") || raw.includes("MongoServerSelectionError")
        ? "storage_unavailable"
        : raw;
    return NextResponse.redirect(
      new URL(
        `/settings/integrations?error=${encodeURIComponent(message)}`,
        request.url,
      ),
    );
  }
}
