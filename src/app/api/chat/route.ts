import { NextRequest } from "next/server";
import { z } from "zod";
import { runAssistantChat } from "@/lib/assistant/runtime";
import {
  appendAssistantMessage,
  appendUserMessage,
  AssistantSessionError,
  loadChatHistoryForTurn,
} from "@/lib/assistant/sessions";
import { textStreamResponse, errorJsonResponse } from "@/lib/assistant/stream";

const ImageSchema = z.object({
  base64: z.string(),
  mediaType: z.string(),
});

const ChatSchema = z.object({
  sessionId: z.string().uuid(),
  content: z.string().max(50_000),
  image: ImageSchema.optional(),
  command: z.string().max(200).nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return errorJsonResponse("Invalid JSON", 400);
    }

    const parsed = ChatSchema.safeParse(raw);
    if (!parsed.success) {
      return errorJsonResponse("Invalid request body", 400);
    }

    const { sessionId, content, image, command } = parsed.data;
    const trimmed = content.trim();

    if (!trimmed && !image) {
      return errorJsonResponse("Message cannot be empty", 400);
    }

    let priorHistory;
    try {
      priorHistory = await loadChatHistoryForTurn(sessionId);
      await appendUserMessage({
        sessionId,
        content: trimmed,
        command: command ?? undefined,
        image: image
          ? { base64: image.base64, mediaType: image.mediaType }
          : undefined,
      });
    } catch (err) {
      if (err instanceof AssistantSessionError) {
        return errorJsonResponse(err.message, err.status);
      }
      throw err;
    }

    const messages = [
      ...priorHistory,
      {
        role: "user" as const,
        content: trimmed || "[Photo]",
      },
    ];

    const outcome = await runAssistantChat({
      messages,
      image,
      command,
    });

    if (!outcome.ok) {
      return errorJsonResponse(outcome.message, outcome.status);
    }

    try {
      await appendAssistantMessage(sessionId, outcome.text);
    } catch (err) {
      console.error("Failed to persist assistant message:", err);
      return errorJsonResponse("Failed to save assistant reply", 500);
    }

    return textStreamResponse(outcome.text);
  } catch (err) {
    console.error("Chat API error:", err);
    return errorJsonResponse("Failed to process request", 500);
  }
}
