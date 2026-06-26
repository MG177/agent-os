/**
 * Runs once when the Node.js server process starts (App Router instrumentation
 * hook). Drives the WhatsApp due-todo notifier — only meaningful on a
 * long-running process (VPS/Docker `next start`), so it no-ops on Vercel
 * (lite deployment, serverless) where nothing persists between requests.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { getDeploymentMode } = await import("@agent-os/contracts/deployment");
  if (getDeploymentMode() !== "full") return;

  const { notifyDueTodos } = await import("@agent-os/platform/todo-notify");

  const POLL_MS = 60_000;
  const tick = () => {
    notifyDueTodos().catch((err) => {
      console.error("[todo-notify] poll failed", err);
    });
  };
  tick();
  setInterval(tick, POLL_MS);
}
