import { NextRequest, NextResponse } from "next/server";
import {
  isGoogleOAuthConfigured,
  resolveRedirectUri,
} from "@/lib/integrations/google-calendar/config";
import { getAuthorizationUrl } from "@/lib/integrations/google-calendar/oauth";
import { createOAuthState } from "@/lib/integrations/oauth-state";

export async function GET(request: NextRequest) {
  if (!isGoogleOAuthConfigured()) {
    return Response.json(
      { error: "Google Calendar integration is not configured on the server" },
      { status: 503 },
    );
  }

  try {
    const redirectUri = resolveRedirectUri(request);
    const state = createOAuthState();
    const url = getAuthorizationUrl(redirectUri, state);
    const res = NextResponse.redirect(url);
    res.cookies.set("gcal_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "OAuth start failed";
    return Response.json({ error: message }, { status: 400 });
  }
}
