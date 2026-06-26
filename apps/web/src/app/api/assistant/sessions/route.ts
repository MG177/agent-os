import { NextRequest, NextResponse } from "next/server";
import {
  createSession,
  listSessions,
  parseSessionLimit,
  serializeSessionDoc,
} from "@agent-os/platform/assistant/sessions";

export async function GET(req: NextRequest) {
  try {
    const limit = parseSessionLimit(
      req.nextUrl.searchParams.get("limit") ?? undefined,
    );
    const sessions = await listSessions(limit);
    return NextResponse.json({ sessions: sessions.map(serializeSessionDoc) });
  } catch (err) {
    console.error("GET /api/assistant/sessions", err);
    return NextResponse.json({ error: "Failed to list sessions" }, { status: 500 });
  }
}

export async function POST() {
  try {
    const session = await createSession();
    return NextResponse.json({ session: serializeSessionDoc(session) }, { status: 201 });
  } catch (err) {
    console.error("POST /api/assistant/sessions", err);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
