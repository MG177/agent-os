const CALENDAR_READONLY_SCOPE =
  "https://www.googleapis.com/auth/calendar.readonly";

const ALLOWED_HOSTS = new Set([
  "localhost:3003",
  "127.0.0.1:3003",
  "agent-os.lumen-dev.com",
  "personal.lumen-dev.com",
  "personal-dashboard.lumen-dev.com",
  "agent-os-beta-lovat.vercel.app",
]);

export function getCalendarReadonlyScope(): string {
  return CALENDAR_READONLY_SCOPE;
}

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_OAUTH_CLIENT_ID &&
      process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
      process.env.TOKEN_ENCRYPTION_KEY &&
      process.env.OAUTH_STATE_SECRET,
  );
}

export function getGoogleOAuthClientConfig() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth client credentials are not configured");
  }
  return { clientId, clientSecret };
}

/** Build redirect URI from request or env override. */
export function resolveRedirectUri(request: Request): string {
  const override = process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim();
  if (override) return override;

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host || !ALLOWED_HOSTS.has(host)) {
    throw new Error(`OAuth redirect host not allowed: ${host ?? "unknown"}`);
  }
  const proto =
    request.headers.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");
  return `${proto}://${host}/api/integrations/google-calendar/callback`;
}
