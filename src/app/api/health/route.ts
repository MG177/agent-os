export async function GET() {
  const vpsUrl = process.env.VPS_HEALTH_API;

  if (!vpsUrl) {
    return Response.json({ status: "ok", vps: "unknown" });
  }

  try {
    const start = Date.now();
    const res = await fetch(vpsUrl, {
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    return Response.json({
      status: "ok",
      vps: res.ok ? "online" : "offline",
      latency: Date.now() - start,
    });
  } catch {
    return Response.json({ status: "ok", vps: "offline" });
  }
}
