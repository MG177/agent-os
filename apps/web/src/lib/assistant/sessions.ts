import { randomUUID } from "crypto";
import type { Collection } from "mongodb";
import { getDb } from "@/lib/mongo";
import type { AssistantChatMessage } from "@/lib/assistant/types";

export const MAX_MESSAGES_PER_SESSION = 100;
export const MAX_IMAGES_PER_SESSION = 5;
export const MAX_IMAGE_BYTES = 500 * 1024;
export const MAX_CONTENT_LENGTH = 50_000;
export const DEFAULT_SESSION_LIST_LIMIT = 50;
export const MAX_SESSION_LIST_LIMIT = 100;

export interface AssistantSessionImage {
  mediaType: string;
  base64: string;
}

export interface AssistantSessionDoc {
  _id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date;
  messageCount: number;
  /** Last assistant reply snippet for list preview */
  preview?: string;
}

export interface AssistantMessageDoc {
  _id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  command?: string;
  image?: AssistantSessionImage;
  createdAt: Date;
}

export class AssistantSessionError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "AssistantSessionError";
  }
}

let indexesReady: Promise<void> | null = null;

async function ready(): Promise<void> {
  if (!indexesReady) {
    indexesReady = ensureAssistantIndexes();
  }
  await indexesReady;
}

export async function sessionsCollection(): Promise<
  Collection<AssistantSessionDoc>
> {
  await ready();
  const db = await getDb();
  return db.collection<AssistantSessionDoc>("assistant_sessions");
}

export async function messagesCollection(): Promise<
  Collection<AssistantMessageDoc>
> {
  await ready();
  const db = await getDb();
  return db.collection<AssistantMessageDoc>("assistant_messages");
}

export async function ensureAssistantIndexes(): Promise<void> {
  const db = await getDb();
  await db
    .collection("assistant_sessions")
    .createIndex({ updatedAt: -1 });
  await db
    .collection("assistant_messages")
    .createIndex({ sessionId: 1, createdAt: 1 });
}

function titleFromContent(content: string): string {
  const oneLine = content.replace(/\s+/g, " ").trim();
  if (!oneLine) return "New chat";
  return oneLine.length > 60 ? `${oneLine.slice(0, 57)}…` : oneLine;
}

function previewFromContent(content: string): string {
  const oneLine = content.replace(/\s+/g, " ").trim();
  if (!oneLine) return "";
  return oneLine.length > 120 ? `${oneLine.slice(0, 117)}…` : oneLine;
}

export function validateImageInput(
  image: AssistantSessionImage | undefined,
  existingImageCount: number,
): void {
  if (!image) return;
  if (existingImageCount >= MAX_IMAGES_PER_SESSION) {
    throw new AssistantSessionError(
      `This chat already has ${MAX_IMAGES_PER_SESSION} photos. Start a new chat to attach more.`,
      400,
    );
  }
  const raw = image.base64?.trim() ?? "";
  if (!raw) {
    throw new AssistantSessionError("Image data is empty.", 400);
  }
  let byteLength: number;
  try {
    byteLength = Buffer.from(raw, "base64").byteLength;
  } catch {
    throw new AssistantSessionError("Invalid image encoding.", 400);
  }
  if (byteLength > MAX_IMAGE_BYTES) {
    throw new AssistantSessionError(
      `Image is too large (max ${Math.round(MAX_IMAGE_BYTES / 1024)}KB).`,
      400,
    );
  }
}

export async function countSessionImages(sessionId: string): Promise<number> {
  const col = await messagesCollection();
  return col.countDocuments({
    sessionId,
    role: "user",
    image: { $exists: true },
  });
}

export async function listSessions(
  limit = DEFAULT_SESSION_LIST_LIMIT,
): Promise<AssistantSessionDoc[]> {
  const cap = Math.min(Math.max(1, limit), MAX_SESSION_LIST_LIMIT);
  const col = await sessionsCollection();
  return col.find({}).sort({ updatedAt: -1 }).limit(cap).toArray();
}

export async function createSession(): Promise<AssistantSessionDoc> {
  const now = new Date();
  const doc: AssistantSessionDoc = {
    _id: randomUUID(),
    title: "New chat",
    createdAt: now,
    updatedAt: now,
    lastMessageAt: now,
    messageCount: 0,
  };
  const col = await sessionsCollection();
  await col.insertOne(doc);
  return doc;
}

export async function getSession(
  sessionId: string,
): Promise<AssistantSessionDoc | null> {
  const col = await sessionsCollection();
  return col.findOne({ _id: sessionId });
}

export async function requireSession(
  sessionId: string,
): Promise<AssistantSessionDoc> {
  const session = await getSession(sessionId);
  if (!session) {
    throw new AssistantSessionError("Session not found.", 404);
  }
  return session;
}

export async function listSessionMessages(
  sessionId: string,
): Promise<AssistantMessageDoc[]> {
  const col = await messagesCollection();
  return col.find({ sessionId }).sort({ createdAt: 1 }).toArray();
}

export async function getSessionWithMessages(sessionId: string): Promise<{
  session: AssistantSessionDoc;
  messages: AssistantMessageDoc[];
}> {
  const session = await requireSession(sessionId);
  const messages = await listSessionMessages(sessionId);
  return { session, messages };
}

export function messagesToChatHistory(
  docs: AssistantMessageDoc[],
): AssistantChatMessage[] {
  return docs.map((m) => ({
    role: m.role,
    content: m.content,
  }));
}

export interface AppendUserMessageInput {
  sessionId: string;
  content: string;
  command?: string;
  image?: AssistantSessionImage;
}

export async function appendUserMessage(
  input: AppendUserMessageInput,
): Promise<AssistantMessageDoc> {
  const content = input.content.trim();
  if (!content && !input.image) {
    throw new AssistantSessionError("Message cannot be empty.", 400);
  }
  if (content.length > MAX_CONTENT_LENGTH) {
    throw new AssistantSessionError("Message is too long.", 400);
  }

  const session = await requireSession(input.sessionId);
  if (session.messageCount >= MAX_MESSAGES_PER_SESSION) {
    throw new AssistantSessionError(
      `This chat reached the ${MAX_MESSAGES_PER_SESSION} message limit. Start a new chat.`,
      400,
    );
  }

  const imageCount = await countSessionImages(input.sessionId);
  validateImageInput(input.image, imageCount);

  const now = new Date();
  const doc: AssistantMessageDoc = {
    _id: randomUUID(),
    sessionId: input.sessionId,
    role: "user",
    content: content || "[Photo]",
    command: input.command,
    ...(input.image ? { image: input.image } : {}),
    createdAt: now,
  };

  const msgCol = await messagesCollection();
  await msgCol.insertOne(doc);

  const sessCol = await sessionsCollection();
  const titleUpdate =
    session.messageCount === 0 && content
      ? { title: titleFromContent(content) }
      : {};

  await sessCol.updateOne(
    { _id: input.sessionId },
    {
      $set: {
        updatedAt: now,
        lastMessageAt: now,
        ...titleUpdate,
      },
      $inc: { messageCount: 1 },
    },
  );

  return doc;
}

export async function appendAssistantMessage(
  sessionId: string,
  content: string,
): Promise<AssistantMessageDoc> {
  const trimmed = content.trim() || "Done — let me know if you need anything else.";
  if (trimmed.length > MAX_CONTENT_LENGTH) {
    throw new AssistantSessionError("Assistant reply is too long.", 500);
  }

  await requireSession(sessionId);

  const now = new Date();
  const doc: AssistantMessageDoc = {
    _id: randomUUID(),
    sessionId,
    role: "assistant",
    content: trimmed,
    createdAt: now,
  };

  const msgCol = await messagesCollection();
  await msgCol.insertOne(doc);

  const sessCol = await sessionsCollection();
  await sessCol.updateOne(
    { _id: sessionId },
    {
      $set: {
        updatedAt: now,
        lastMessageAt: now,
        preview: previewFromContent(trimmed),
      },
      $inc: { messageCount: 1 },
    },
  );

  return doc;
}

export async function updateSessionTitle(
  sessionId: string,
  title: string,
): Promise<AssistantSessionDoc> {
  const trimmed = title.trim();
  if (!trimmed) {
    throw new AssistantSessionError("Title cannot be empty.", 400);
  }
  if (trimmed.length > 200) {
    throw new AssistantSessionError("Title is too long.", 400);
  }

  await requireSession(sessionId);
  const now = new Date();
  const col = await sessionsCollection();
  await col.updateOne(
    { _id: sessionId },
    { $set: { title: trimmed, updatedAt: now } },
  );
  return (await getSession(sessionId))!;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await requireSession(sessionId);
  const msgCol = await messagesCollection();
  await msgCol.deleteMany({ sessionId });
  const sessCol = await sessionsCollection();
  await sessCol.deleteOne({ _id: sessionId });
}

/** Load history for a chat turn (before appending the new user message). */
export async function loadChatHistoryForTurn(
  sessionId: string,
): Promise<AssistantChatMessage[]> {
  const messages = await listSessionMessages(sessionId);
  return messagesToChatHistory(messages);
}
