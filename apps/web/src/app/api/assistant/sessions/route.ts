import { NextRequest, NextResponse } from "next/server";
import {
  createSession,
  listSessions,
  DEFAULT_SESSION_LIST_LIMIT,
  MAX_SESSION_LIST_LIMIT,
} from "@agent-os/platform/assistant/sessions";

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

export async function GET(req: NextRequest) {
  try {
    const raw = req.nextUrl.searchParams.get("limit");
    const limit = raw
      ? Math.min(
          Math.max(1, parseInt(raw, 10) || DEFAULT_SESSION_LIST_LIMIT),
          MAX_SESSION_LIST_LIMIT,
        )
      : DEFAULT_SESSION_LIST_LIMIT;

    const sessions = await listSessions(limit);
    return NextResponse.json({
      sessions: sessions.map(serializeSession),
    });
  } catch (err) {
    console.error("GET /api/assistant/sessions", err);
    return NextResponse.json(
      { error: "Failed to list sessions" },
      { status: 500 },
    );
  }
}

export async function POST() {
  try {
    const session = await createSession();
    return NextResponse.json({ session: serializeSession(session) }, { status: 201 });
  } catch (err) {
    console.error("POST /api/assistant/sessions", err);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 },
    );
  }
}
