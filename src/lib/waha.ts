import crypto from "crypto";
import { readAudit } from "@/lib/audit";

export interface WahaMessagePayload {
  id: string;
  from: string;
  to?: string;
  fromMe?: boolean;
  body?: string;
  hasMedia?: boolean;
  source?: string;
}

export interface WahaWebhookEvent {
  event: string;
  session?: string;
  payload?: WahaMessagePayload;
}

const SKIP_CHAT_SUFFIXES = ["@g.us", "@newsletter"];
const STATUS_BROADCAST = "status@broadcast";

function parseAllowedJids(): Set<string> {
  const raw = process.env.WHATSAPP_ALLOWED_JIDS?.trim();
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((j) => j.trim())
      .filter(Boolean),
  );
}

export function getWahaWebhookSecret(): string | undefined {
  return process.env.WAHA_WEBHOOK_SECRET?.trim() || undefined;
}

export function verifyWahaHmac(
  rawBody: string,
  hmacHeader: string | null,
  algorithmHeader: string | null,
): boolean {
  const secret = getWahaWebhookSecret();
  if (!secret) return false;
  if (!hmacHeader) return false;

  const algo = (algorithmHeader ?? "sha512").toLowerCase();
  if (algo !== "sha512") return false;

  const expected = crypto
    .createHmac("sha512", secret)
    .update(rawBody)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(hmacHeader, "hex"),
    );
  } catch {
    return false;
  }
}

function isSkippedChatId(jid: string): boolean {
  if (jid === STATUS_BROADCAST) return true;
  return SKIP_CHAT_SUFFIXES.some((s) => jid.endsWith(s));
}

export type CaptureDecision =
  | { action: "capture" }
  | { action: "skip"; reason: string }
  | { action: "reject"; reason: string };

export function shouldCaptureMessage(
  payload: WahaMessagePayload,
): CaptureDecision {
  if (payload.fromMe) {
    return { action: "skip", reason: "fromMe" };
  }
  if (payload.source === "api") {
    return { action: "skip", reason: "api-source" };
  }

  const from = payload.from?.trim() ?? "";
  if (!from) {
    return { action: "skip", reason: "missing-from" };
  }
  if (isSkippedChatId(from)) {
    return { action: "skip", reason: "unsupported-chat" };
  }

  const allowed = parseAllowedJids();
  if (process.env.NODE_ENV === "production" && allowed.size === 0) {
    return { action: "reject", reason: "allowlist-unconfigured" };
  }
  if (allowed.size > 0 && !allowed.has(from)) {
    return { action: "reject", reason: "not-allowed" };
  }

  const body = payload.body?.trim() ?? "";
  if (!body && payload.hasMedia) {
    return { action: "skip", reason: "media-only" };
  }
  if (!body) {
    return { action: "skip", reason: "empty-body" };
  }

  return { action: "capture" };
}

export function isDuplicateMessage(waMessageId: string): boolean {
  if (!waMessageId) return false;
  return readAudit().some(
    (e) =>
      e.action === "capture.create" &&
      e.meta?.waMessageId === waMessageId,
  );
}

export function getWahaSession(): string {
  return process.env.WAHA_SESSION?.trim() || "default";
}

export function getWhatsAppAckMessage(): string {
  return process.env.WHATSAPP_ACK_MESSAGE?.trim() || "Saved to Inbox";
}

export async function sendWhatsAppText(params: {
  session: string;
  chatId: string;
  text: string;
}): Promise<void> {
  const baseUrl = process.env.WAHA_BASE_URL?.trim();
  const apiKey = process.env.WAHA_API_KEY?.trim();
  if (!baseUrl || !apiKey) return;

  const url = `${baseUrl.replace(/\/$/, "")}/api/sendText`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": apiKey,
    },
    body: JSON.stringify({
      session: params.session,
      chatId: params.chatId,
      text: params.text,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error(
      `[waha] sendText failed ${res.status}: ${errText.slice(0, 200)}`,
    );
  }
}
