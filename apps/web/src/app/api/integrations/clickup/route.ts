import { clearClickUpCache } from "@/lib/integrations/clickup/cache";
import { deleteTokenRecord } from "@/lib/integrations/clickup/store";

export async function DELETE() {
  await deleteTokenRecord();
  clearClickUpCache();
  return Response.json({ ok: true, connected: false });
}
