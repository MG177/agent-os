import { NextRequest } from "next/server";
import { z } from "zod";
import { runAssistantChat } from "@/lib/assistant/runtime";
import { textStreamResponse, errorJsonResponse } from "@/lib/cursor-sdk/stream";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(50_000),
});

const ImageSchema = z.object({
  base64: z.string(),
  mediaType: z.string(),
});

const ChatSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(100),
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

    const { messages, image, command } = parsed.data;
    const outcome = await runAssistantChat({ messages, image, command });

    if (!outcome.ok) {
      return errorJsonResponse(outcome.message, outcome.status);
    }

    return textStreamResponse(outcome.text);
  } catch (err) {
    console.error("Chat API error:", err);
    return errorJsonResponse("Failed to process request", 500);
  }
}
