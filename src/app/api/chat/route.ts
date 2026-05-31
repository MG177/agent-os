import { NextRequest } from "next/server";
import { runAssistantChat } from "@/lib/assistant/runtime";
import { textStreamResponse, errorJsonResponse } from "@/lib/cursor-sdk/stream";
import type {
  AssistantChatMessage,
  AssistantChatImage,
} from "@/lib/assistant/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, image, command } = body as {
      messages: AssistantChatMessage[];
      image?: AssistantChatImage;
      command?: string | null;
    };

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
