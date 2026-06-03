/** Client-side types matching /api/assistant/sessions JSON. */

export interface AssistantSessionSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  messageCount: number;
  preview: string | null;
}

export interface AssistantMessageRecord {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  command: string | null;
  image: { mediaType: string; base64: string } | null;
  createdAt: string;
}

export interface AssistantSessionDetail {
  session: AssistantSessionSummary;
  messages: AssistantMessageRecord[];
}
