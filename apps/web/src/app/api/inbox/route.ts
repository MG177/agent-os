import { NextRequest } from "next/server";
import { z } from "zod";
import { listInbox, createInboxItem } from "@agent-os/platform/vault";
import { titleFromCapture } from "@agent-os/platform/inbox-capture";
import type { AuditSource } from "@agent-os/platform/audit";
import {
  fileWritesDisabledResponse,
  isFileWritesDisabledError,
} from "@agent-os/contracts/deployment";
import {
  proxyToFullEnabled,
  proxyToFullInstance,
} from "@/lib/full-instance-proxy";

const ALLOWED_SOURCES: AuditSource[] = ["capture-ui", "whatsapp"];

const InboxCreateSchema = z.object({
  title: z.string().max(300).optional(),
  body: z.string().max(10_000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  source: z.string().max(50).optional(),
});

export async function GET(request: NextRequest) {
  if (proxyToFullEnabled()) return proxyToFullInstance(request);
  const items = listInbox();
  return Response.json({ items });
}

export async function POST(request: NextRequest) {
  if (proxyToFullEnabled()) return proxyToFullInstance(request);
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = InboxCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { title, body: content, tags, source } = parsed.data;

  const text = content?.trim() ?? title?.trim() ?? "";
  if (!text) {
    return Response.json({ error: "Note text is required" }, { status: 400 });
  }

  const resolvedTitle = titleFromCapture(title, content);
  let noteBody = content?.trim() ?? "";
  if (tags?.length) {
    const tagLine = tags.map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ");
    noteBody = noteBody ? `${noteBody}\n\n${tagLine}` : tagLine;
  }

  const resolvedSource: AuditSource =
    source && ALLOWED_SOURCES.includes(source as AuditSource)
      ? (source as AuditSource)
      : "capture-ui";

  try {
    const item = createInboxItem(resolvedTitle, noteBody, resolvedSource);
    return Response.json({ item }, { status: 201 });
  } catch (error) {
    if (isFileWritesDisabledError(error)) return fileWritesDisabledResponse();
    throw error;
  }
}
