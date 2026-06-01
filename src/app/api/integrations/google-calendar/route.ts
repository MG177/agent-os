import { clearEventsCache } from "@/lib/integrations/google-calendar/cache";
import { deleteTokenRecord } from "@/lib/integrations/google-calendar/store";

export async function DELETE() {
  await deleteTokenRecord();
  clearEventsCache();
  return Response.json({ ok: true, connected: false });
}
