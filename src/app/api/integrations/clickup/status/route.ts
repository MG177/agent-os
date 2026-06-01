import { getClickUpStatus } from "@/lib/integrations/clickup/status";

export async function GET() {
  return Response.json(await getClickUpStatus());
}
