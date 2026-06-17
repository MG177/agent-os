import { clearClickUpCache } from "@/lib/integrations/clickup/cache";
import { deleteTokenRecord } from "@/lib/integrations/clickup/store";
import { resetClickUpCache } from "@/lib/integrations/clickup/sync";

export async function DELETE() {
  await deleteTokenRecord();
  clearClickUpCache();
  await resetClickUpCache();
  return Response.json({ ok: true, connected: false });
}
