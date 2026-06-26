import { clearEventsCache } from "@agent-os/platform/integrations/google-calendar/cache";
import { deleteTokenRecord } from "@agent-os/platform/integrations/google-calendar/store";

export async function DELETE() {
  await deleteTokenRecord();
  clearEventsCache();
  return Response.json({ ok: true, connected: false });
}
