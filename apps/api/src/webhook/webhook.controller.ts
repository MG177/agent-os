import { Controller, Post, Req, Res, type RawBodyRequest } from "@nestjs/common";
import type { Request, Response } from "express";
import { createInboxItem } from "@agent-os/platform/vault";
import {
  bodyFromWhatsApp,
  titleFromCapture,
} from "@agent-os/platform/inbox-capture";
import { isFileWritesDisabledError } from "@agent-os/contracts/deployment";
import {
  getWahaSession,
  getWhatsAppAckMessage,
  isDuplicateMessage,
  sendWhatsAppText,
  shouldCaptureMessage,
  verifyWahaHmac,
  type WahaWebhookEvent,
} from "@agent-os/platform/waha";

@Controller("webhooks")
export class WebhookController {
  @Post("whatsapp")
  whatsapp(@Req() req: RawBodyRequest<Request>, @Res() res: Response) {
    const rawBody = req.rawBody?.toString("utf8") ?? "";

    const hmacHeader = req.header("x-webhook-hmac") ?? null;
    const algoHeader = req.header("x-webhook-hmac-algorithm") ?? null;

    if (!verifyWahaHmac(rawBody, hmacHeader, algoHeader)) {
      return res.status(401).json({ error: "Invalid webhook signature" });
    }

    let event: WahaWebhookEvent;
    try {
      event = JSON.parse(rawBody) as WahaWebhookEvent;
    } catch {
      return res.status(400).json({ error: "Invalid JSON" });
    }

    if (event.event !== "message") {
      return res.json({ ok: true, skipped: "not-message-event" });
    }

    const payload = event.payload;
    if (!payload?.id) {
      return res.json({ ok: true, skipped: "missing-payload" });
    }

    const decision = shouldCaptureMessage(payload);
    if (decision.action === "reject") {
      return res.status(403).json({ error: "Sender not allowed" });
    }
    if (decision.action === "skip") {
      if (decision.reason === "media-only") {
        const session = event.session ?? getWahaSession();
        void sendWhatsAppText({
          session,
          chatId: payload.from,
          text: "Text only for now — send a message with words to capture.",
        }).catch(console.error);
      }
      return res.json({ ok: true, skipped: decision.reason });
    }

    if (isDuplicateMessage(payload.id)) {
      return res.json({ ok: true, deduplicated: true });
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
      if (isFileWritesDisabledError(error)) {
        return res
          .status(503)
          .json({ error: "Filesystem writes disabled", code: "FILE_WRITES_DISABLED" });
      }
      throw error;
    }

    void sendWhatsAppText({
      session,
      chatId: payload.from,
      text: getWhatsAppAckMessage(),
    }).catch(console.error);

    return res.status(201).json({ item });
  }
}
