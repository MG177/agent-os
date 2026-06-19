import { NextRequest } from "next/server";
import {
  ClickUpNotConnectedError,
  addComment,
  getComments,
} from "@/lib/integrations/clickup/client";
import { isClickUpReady } from "@/lib/integrations/clickup/config";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isClickUpReady()) {
    return Response.json(
      { error: "ClickUp integration is not configured" },
      { status: 503 },
    );
  }
  const { id } = await params;
  try {
    const comments = await getComments(decodeURIComponent(id));
    return Response.json({ comments });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isClickUpReady()) {
    return Response.json(
      { error: "ClickUp integration is not configured" },
      { status: 503 },
    );
  }
  const { id } = await params;

  let body: { text?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const text = body.text?.trim();
  if (!text) {
    return Response.json({ error: "Comment text is required" }, { status: 400 });
  }

  try {
    const result = await addComment(decodeURIComponent(id), text);
    return Response.json(result, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}

function errorResponse(err: unknown): Response {
  if (err instanceof ClickUpNotConnectedError) {
    return Response.json(
      { error: "not_connected", message: err.message },
      { status: 401 },
    );
  }
  const message = err instanceof Error ? err.message : "ClickUp request failed";
  return Response.json({ error: message }, { status: 500 });
}
