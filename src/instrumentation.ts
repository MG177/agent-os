/**
 * Runs once when the Node.js server process starts (App Router instrumentation
 * hook). Drives long-running background loops — the WhatsApp due-todo notifier
 * and the ClickUp cache sync. Only meaningful on a long-running process
 * (VPS/Docker `next start`), so it no-ops on Vercel (lite deployment,
 * serverless) where nothing persists between requests; there the ClickUp cache
 * stays warm via refresh-on-read instead.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { getDeploymentMode } = await import("@/lib/deployment");
  if (getDeploymentMode() !== "full") return;

  const { notifyDueTodos } = await import("@/lib/todo-notify");

  const POLL_MS = 60_000;
  const tick = () => {
    notifyDueTodos().catch((err) => {
      console.error("[todo-notify] poll failed", err);
    });
  };
  tick();
  setInterval(tick, POLL_MS);

  // ── ClickUp cache sync ──
  const { isClickUpConnected } = await import(
    "@/lib/integrations/clickup/store"
  );
  const { syncClickUpTasks } = await import("@/lib/integrations/clickup/sync");

  const SYNC_MS = Number(process.env.CLICKUP_SYNC_INTERVAL_MS) || 150_000;
  const syncTick = async () => {
    if (!(await isClickUpConnected())) return;
    await syncClickUpTasks({ reason: "interval" }).catch((err) => {
      console.error("[clickup-sync] poll failed", err);
    });
  };
  void syncTick(); // warm the cache on boot
  setInterval(() => void syncTick(), SYNC_MS);
}
