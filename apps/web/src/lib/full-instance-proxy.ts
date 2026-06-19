/**
 * Auto-proxy: in `lite` mode (Vercel), relay the can't-run-here API routes to the
 * VPS `full` instance (agent-os.lumen-dev.com) instead of returning 503. The VPS
 * runs the same repo in `full` mode and never proxies, so there is no loop.
 *
 * Env (set on the lite/Vercel deployment only):
 *   FULL_INSTANCE_URL    e.g. https://agent-os.lumen-dev.com
 *   FULL_INSTANCE_BASIC  "user:pass" for the VPS Caddy Basic-auth gate (optional)
 */
import { getDeploymentMode } from "@/lib/deployment";

export function proxyToFullEnabled(): boolean {
  return (
    getDeploymentMode() === "lite" && !!process.env.FULL_INSTANCE_URL?.trim()
  );
}

// Hop-by-hop + body-framing headers that must not be forwarded verbatim.
const STRIP_RESPONSE_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "content-encoding",
  "content-length",
]);

/**
 * Forward `req` to the full instance, adding the shared Basic-auth header, and
 * stream the response body straight back (so /api/chat's chunked text stream
 * passes through unbuffered).
 */
export async function proxyToFullInstance(req: Request): Promise<Response> {
  const base = process.env.FULL_INSTANCE_URL!.trim();
  const incoming = new URL(req.url);
  const target = new URL(incoming.pathname + incoming.search, base);

  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.delete("cookie");
  headers.delete("content-length");
  headers.delete("accept-encoding");

  const basic = process.env.FULL_INSTANCE_BASIC?.trim();
  if (basic) {
    headers.set(
      "authorization",
      `Basic ${Buffer.from(basic).toString("base64")}`,
    );
  }

  const method = req.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";

  const init: RequestInit & { duplex?: "half" } = {
    method,
    headers,
    redirect: "manual",
  };
  if (hasBody) {
    init.body = req.body;
    init.duplex = "half";
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, init);
  } catch {
    return Response.json(
      { error: "Full instance unreachable", code: "FULL_INSTANCE_UNREACHABLE" },
      { status: 502 },
    );
  }

  const respHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!STRIP_RESPONSE_HEADERS.has(key.toLowerCase())) {
      respHeaders.set(key, value);
    }
  });

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: respHeaders,
  });
}
