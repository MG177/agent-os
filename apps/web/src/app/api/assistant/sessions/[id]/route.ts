import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  AssistantSessionError,
  deleteSession,
  getSessionWithMessages,
  serializeMessageDoc,
  serializeSessionDoc,
  updateSessionTitle,
} from "@agent-os/platform/assistant/sessions";

const PatchSchema = z.object({
  title: z.string().min(1).max(200),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  try {
    const { session, messages } = await getSessionWithMessages(id);
    return NextResponse.json({
      session: serializeSessionDoc(session),
      messages: messages.map(serializeMessageDoc),
    });
  } catch (err) {
    if (err instanceof AssistantSessionError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("GET /api/assistant/sessions/[id]", err);
    return NextResponse.json({ error: "Failed to load session" }, { status: 500 });
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
    return NextResponse.json({ session: serializeSessionDoc(session) });
  } catch (err) {
    if (err instanceof AssistantSessionError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("PATCH /api/assistant/sessions/[id]", err);
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 });
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
    return NextResponse.json({ error: "Failed to delete session" }, { status: 500 });
  }
}
