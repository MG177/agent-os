import { getClickUpStatus } from "@agent-os/platform/integrations/clickup/status";

export async function GET() {
  return Response.json(await getClickUpStatus());
}
