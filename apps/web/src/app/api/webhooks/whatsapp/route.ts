import { NextRequest } from "next/server";
import { createInboxItem } from "@agent-os/platform/vault";
import { titleFromCapture, bodyFromWhatsApp } from "@agent-os/platform/inbox-capture";
import {
  fileWritesDisabledResponse,
  isFileWritesDisabledError,
} from "@agent-os/contracts/deployment";
import {
  verifyWahaHmac,
  shouldCaptureMessage,
  isDuplicateMessage,
  getWahaSession,
  getWhatsAppAckMessage,
  sendWhatsAppText,
  type WahaWebhookEvent,
} from "@agent-os/platform/waha";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  const hmacHeader = request.headers.get("x-webhook-hmac");
  const algoHeader = request.headers.get("x-webhook-hmac-algorithm");

  if (!verifyWahaHmac(rawBody, hmacHeader, algoHeader)) {
    return Response.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  let event: WahaWebhookEvent;
  try {
    event = JSON.parse(rawBody) as WahaWebhookEvent;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (event.event !== "message") {
    return Response.json({ ok: true, skipped: "not-message-event" });
  }

  const payload = event.payload;
  if (!payload?.id) {
    return Response.json({ ok: true, skipped: "missing-payload" });
  }

  const decision = shouldCaptureMessage(payload);
  if (decision.action === "reject") {
    return Response.json({ error: "Sender not allowed" }, { status: 403 });
  }
  if (decision.action === "skip") {
    if (decision.reason === "media-only") {
      const session = event.session ?? getWahaSession();
      const chatId = payload.from;
      void sendWhatsAppText({
        session,
        chatId,
        text: "Text only for now — send a message with words to capture.",
      }).catch(console.error);
    }
    return Response.json({ ok: true, skipped: decision.reason });
  }

  if (isDuplicateMessage(payload.id)) {
    return Response.json({ ok: true, deduplicated: true });
  }

  const text = payload.body!.trim();
  const title = titleFromCapture(undefined, text);
  const body = bodyFromWhatsApp(text, payload.from);
  const session = event.session ?? getWahaSession();

  let item;
  try {
    item = createInboxItem(title, body, "whatsapp", {
      waMessageId: payload.id,
      waFrom: payload.from,
      waSession: session,
    });
  } catch (error) {
    if (isFileWritesDisabledError(error)) return fileWritesDisabledResponse();
    throw error;
  }

  void sendWhatsAppText({
    session,
    chatId: payload.from,
    text: getWhatsAppAckMessage(),
  }).catch(console.error);

  return Response.json({ item }, { status: 201 });
}
