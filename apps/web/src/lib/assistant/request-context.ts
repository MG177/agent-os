/**
 * Synthetic Request for server-side code paths that need OAuth redirect resolution
 * (e.g. calendar tools invoked from MCP without an HTTP request).
 */
export function createAssistantOAuthRequest(): Request {
  const override = process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim();
  if (override) {
    return new Request(override, { method: "GET" });
  }

  const host =
    process.env.ASSISTANT_OAUTH_HOST?.trim() || "localhost:3003";
  const proto =
    host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https";

  return new Request(`${proto}://${host}/`, {
    method: "GET",
    headers: { host },
  });
}
