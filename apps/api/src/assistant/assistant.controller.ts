import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from "@nestjs/common";
import type { Response } from "express";
import { z } from "zod";
import { runAssistantChat } from "@agent-os/platform/assistant/runtime";
import {
  appendAssistantMessage,
  appendUserMessage,
  AssistantSessionError,
  createSession,
  deleteSession,
  getSessionWithMessages,
  listSessions,
  loadChatHistoryForTurn,
  updateSessionTitle,
  DEFAULT_SESSION_LIST_LIMIT,
  MAX_SESSION_LIST_LIMIT,
} from "@agent-os/platform/assistant/sessions";

const ImageSchema = z.object({ base64: z.string(), mediaType: z.string() });
const ChatSchema = z.object({
  sessionId: z.string().uuid(),
  content: z.string().max(50_000),
  image: ImageSchema.optional(),
  command: z.string().max(200).nullable().optional(),
});
const PatchSchema = z.object({ title: z.string().min(1).max(200) });

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type SessionDoc = {
  _id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date;
  messageCount: number;
  preview?: string;
};
type MessageDoc = {
  _id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  command?: string;
  image?: { mediaType: string; base64: string };
  createdAt: Date;
};

function serializeSession(s: SessionDoc) {
  return {
    id: s._id,
    title: s.title,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    lastMessageAt: s.lastMessageAt.toISOString(),
    messageCount: s.messageCount,
    preview: s.preview ?? null,
  };
}

function serializeMessage(m: MessageDoc) {
  return {
    id: m._id,
    sessionId: m.sessionId,
    role: m.role,
    content: m.content,
    command: m.command ?? null,
    image: m.image
      ? { mediaType: m.image.mediaType, base64: m.image.base64 }
      : null,
    createdAt: m.createdAt.toISOString(),
  };
}

@Controller()
export class AssistantController {
  @Post("chat")
  async chat(@Body() raw: unknown, @Res() res: Response) {
    try {
      const parsed = ChatSchema.safeParse(raw);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body" });
      }
      const { sessionId, content, image, command } = parsed.data;
      const trimmed = content.trim();
      if (!trimmed && !image) {
        return res.status(400).json({ error: "Message cannot be empty" });
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
          return res.status(err.status).json({ error: err.message });
        }
        throw err;
      }

      const messages = [
        ...priorHistory,
        { role: "user" as const, content: trimmed || "[Photo]" },
      ];

      const outcome = await runAssistantChat({ messages, image, command });
      if (!outcome.ok) {
        return res.status(outcome.status).json({ error: outcome.message });
      }

      try {
        await appendAssistantMessage(sessionId, outcome.text);
      } catch (err) {
        console.error("Failed to persist assistant message:", err);
        return res.status(500).json({ error: "Failed to save assistant reply" });
      }

      // Cosmetic chunked stream, mirroring platform textStreamResponse (4 chars / 10ms).
      res.status(200);
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("X-Accel-Buffering", "no");
      const text = outcome.text;
      for (let i = 0; i < text.length; i += 4) {
        res.write(text.slice(i, i + 4));
        await delay(10);
      }
      return res.end();
    } catch (err) {
      console.error("Chat API error:", err);
      if (!res.headersSent) {
        return res.status(500).json({ error: "Failed to process request" });
      }
      return res.end();
    }
  }

  @Get("assistant/sessions")
  async list(@Query("limit") limitRaw: string | undefined, @Res() res: Response) {
    try {
      const limit = limitRaw
        ? Math.min(
            Math.max(1, parseInt(limitRaw, 10) || DEFAULT_SESSION_LIST_LIMIT),
            MAX_SESSION_LIST_LIMIT,
          )
        : DEFAULT_SESSION_LIST_LIMIT;
      const sessions = await listSessions(limit);
      return res.json({ sessions: sessions.map(serializeSession) });
    } catch (err) {
      console.error("GET /api/assistant/sessions", err);
      return res.status(500).json({ error: "Failed to list sessions" });
    }
  }

  @Post("assistant/sessions")
  async create(@Res() res: Response) {
    try {
      const session = await createSession();
      return res.status(201).json({ session: serializeSession(session) });
    } catch (err) {
      console.error("POST /api/assistant/sessions", err);
      return res.status(500).json({ error: "Failed to create session" });
    }
  }

  @Get("assistant/sessions/:id")
  async get(@Param("id") id: string, @Res() res: Response) {
    try {
      const { session, messages } = await getSessionWithMessages(id);
      return res.json({
        session: serializeSession(session),
        messages: messages.map(serializeMessage),
      });
    } catch (err) {
      if (err instanceof AssistantSessionError) {
        return res.status(err.status).json({ error: err.message });
      }
      console.error("GET /api/assistant/sessions/[id]", err);
      return res.status(500).json({ error: "Failed to load session" });
    }
  }

  @Patch("assistant/sessions/:id")
  async patch(
    @Param("id") id: string,
    @Body() body: unknown,
    @Res() res: Response,
  ) {
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request body" });
    }
    try {
      const session = await updateSessionTitle(id, parsed.data.title);
      return res.json({ session: serializeSession(session) });
    } catch (err) {
      if (err instanceof AssistantSessionError) {
        return res.status(err.status).json({ error: err.message });
      }
      console.error("PATCH /api/assistant/sessions/[id]", err);
      return res.status(500).json({ error: "Failed to update session" });
    }
  }

  @Delete("assistant/sessions/:id")
  async remove(@Param("id") id: string, @Res() res: Response) {
    try {
      await deleteSession(id);
      return res.json({ ok: true });
    } catch (err) {
      if (err instanceof AssistantSessionError) {
        return res.status(err.status).json({ error: err.message });
      }
      console.error("DELETE /api/assistant/sessions/[id]", err);
      return res.status(500).json({ error: "Failed to delete session" });
    }
  }
}
