import { NextRequest, NextResponse } from "next/server";
import { clearEventsCache } from "@/lib/integrations/google-calendar/cache";
import { resolveRedirectUri } from "@/lib/integrations/google-calendar/config";
import { exchangeAuthorizationCode } from "@/lib/integrations/google-calendar/oauth";
import { saveTokenRecord } from "@/lib/integrations/google-calendar/store";
import { verifyOAuthState } from "@/lib/integrations/oauth-state";

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
  const cookieState = request.cookies.get("gcal_oauth_state")?.value;

  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(
      new URL("/settings/integrations?error=invalid_state", request.url),
    );
  }

  if (!verifyOAuthState(state)) {
    return NextResponse.redirect(
      new URL("/settings/integrations?error=expired_state", request.url),
    );
  }

  try {
    const redirectUri = resolveRedirectUri(request);
    const { refreshToken, email } = await exchangeAuthorizationCode(
      redirectUri,
      code,
    );
    saveTokenRecord({ refreshToken, email });
    clearEventsCache();

    const res = NextResponse.redirect(
      new URL("/settings/integrations?connected=1", request.url),
    );
    res.cookies.delete("gcal_oauth_state");
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "oauth_failed";
    return NextResponse.redirect(
      new URL(
        `/settings/integrations?error=${encodeURIComponent(message)}`,
        request.url,
      ),
    );
  }
}
