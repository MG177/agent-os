import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  AssistantSessionError,
  deleteSession,
  getSessionWithMessages,
  updateSessionTitle,
} from "@/lib/assistant/sessions";

function serializeSession(session: {
  _id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date;
  messageCount: number;
  preview?: string;
}) {
  return {
    id: session._id,
    title: session.title,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    lastMessageAt: session.lastMessageAt.toISOString(),
    messageCount: session.messageCount,
    preview: session.preview ?? null,
  };
}

function serializeMessage(message: {
  _id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  command?: string;
  image?: { mediaType: string; base64: string };
  createdAt: Date;
}) {
  return {
    id: message._id,
    sessionId: message.sessionId,
    role: message.role,
    content: message.content,
    command: message.command ?? null,
    image: message.image
      ? {
          mediaType: message.image.mediaType,
          base64: message.image.base64,
        }
      : null,
    createdAt: message.createdAt.toISOString(),
  };
}

const PatchSchema = z.object({
  title: z.string().min(1).max(200),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  try {
    const { session, messages } = await getSessionWithMessages(id);
    return NextResponse.json({
      session: serializeSession(session),
      messages: messages.map(serializeMessage),
    });
  } catch (err) {
    if (err instanceof AssistantSessionError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("GET /api/assistant/sessions/[id]", err);
    return NextResponse.json(
      { error: "Failed to load session" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const session = await updateSessionTitle(id, parsed.data.title);
    return NextResponse.json({ session: serializeSession(session) });
  } catch (err) {
    if (err instanceof AssistantSessionError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("PATCH /api/assistant/sessions/[id]", err);
    return NextResponse.json(
      { error: "Failed to update session" },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  try {
    await deleteSession(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AssistantSessionError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("DELETE /api/assistant/sessions/[id]", err);
    return NextResponse.json(
      { error: "Failed to delete session" },
      { status: 500 },
    );
  }
}
