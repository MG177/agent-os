import { NextRequest } from "next/server";
import { getInboxItem, archiveInboxItem } from "@agent-os/platform/vault";
import {
  fileWritesDisabledResponse,
  isFileWritesDisabledError,
} from "@agent-os/contracts/deployment";
import {
  proxyToFullEnabled,
  proxyToFullInstance,
} from "@/lib/full-instance-proxy";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  if (proxyToFullEnabled()) return proxyToFullInstance(request);
  const { slug } = await params;
  const item = getInboxItem(slug);
  if (!item) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ item });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  if (proxyToFullEnabled()) return proxyToFullInstance(request);
  const { slug } = await params;
  let result;
  try {
    result = archiveInboxItem(slug);
  } catch (error) {
    if (isFileWritesDisabledError(error)) return fileWritesDisabledResponse();
    throw error;
  }
  if (!result.ok) {
    if (result.reason === "expired") {
      return Response.json(
        { error: "Undo window (24h) has expired" },
        { status: 410 },
      );
    }
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  return Response.json({ archived: true });
}
