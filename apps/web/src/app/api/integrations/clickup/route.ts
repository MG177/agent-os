import { clearClickUpCache } from "@agent-os/platform/integrations/clickup/cache";
import { deleteTokenRecord } from "@agent-os/platform/integrations/clickup/store";

export async function DELETE() {
  await deleteTokenRecord();
  clearClickUpCache();
  return Response.json({ ok: true, connected: false });
}
