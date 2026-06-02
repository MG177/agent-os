import { NextRequest } from "next/server";
import { listInbox, createInboxItem } from "@/lib/vault";
import { titleFromCapture } from "@/lib/inbox-capture";
import type { AuditSource } from "@/lib/audit";
import {
  fileWritesDisabledResponse,
  isFileWritesDisabledError,
} from "@/lib/deployment";

const ALLOWED_SOURCES: AuditSource[] = ["capture-ui", "whatsapp"];

export async function GET() {
  const items = listInbox();
  return Response.json({ items });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, body: content, tags, source } = body as {
    title?: string;
    body?: string;
    tags?: string[];
    source?: string;
  };

  const text = content?.trim() ?? title?.trim() ?? "";
  if (!text && !title?.trim()) {
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
