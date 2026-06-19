import { hasEncryptionKey } from "@agent-os/core/integrations/token-crypto";

const ALLOWED_HOSTS = new Set([
  "localhost:3003",
  "127.0.0.1:3003",
  "agent-os.lumen-dev.com",
  "personal.lumen-dev.com",
  "personal-dashboard.lumen-dev.com",
  "agent-os-beta-lovat.vercel.app",
]);

/**
 * The integration can run as long as we can encrypt/decrypt a stored token.
 * This covers the personal-API-token path (no OAuth app needed) and is the gate
 * for all data routes.
 */
export function isClickUpReady(): boolean {
  return hasEncryptionKey();
}

/** Stricter: the optional OAuth "Connect" button requires a registered app. */
export function isClickUpOAuthConfigured(): boolean {
  return Boolean(
    process.env.CLICKUP_OAUTH_CLIENT_ID &&
      process.env.CLICKUP_OAUTH_CLIENT_SECRET &&
      process.env.TOKEN_ENCRYPTION_KEY &&
      process.env.OAUTH_STATE_SECRET,
  );
}

export function getClickUpOAuthClientConfig() {
  const clientId = process.env.CLICKUP_OAUTH_CLIENT_ID;
  const clientSecret = process.env.CLICKUP_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("ClickUp OAuth client credentials are not configured");
  }
  return { clientId, clientSecret };
}

/** Build redirect URI from request or env override. Mirrors the calendar flow. */
export function resolveRedirectUri(request: Request): string {
  const override = process.env.CLICKUP_OAUTH_REDIRECT_URI?.trim();
  if (override) return override;

  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host || !ALLOWED_HOSTS.has(host)) {
    throw new Error(`OAuth redirect host not allowed: ${host ?? "unknown"}`);
  }
  const proto =
    request.headers.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");
  return `${proto}://${host}/api/integrations/clickup/callback`;
}
