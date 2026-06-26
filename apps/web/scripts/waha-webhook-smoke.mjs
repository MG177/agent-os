#!/usr/bin/env node
/**
 * Smoke test for POST /api/webhooks/whatsapp (run with dev server on :3003).
 *
 *   WAHA_WEBHOOK_SECRET=test WHATSAPP_ALLOWED_JIDS=628@test.c.us \
 *   node scripts/waha-webhook-smoke.mjs
 *
 * Requires the app to load the same env (put vars in .env.local).
 */
import crypto from "crypto";

const secret = process.env.WAHA_WEBHOOK_SECRET || "test-secret";
const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:3003";
const allowedFrom = process.env.WHATSAPP_ALLOWED_JIDS?.split(",")[0]?.trim() || "628@test.c.us";

const payload = {
  event: "message",
  session: "default",
  payload: {
    id: `smoke-${Date.now()}`,
    from: allowedFrom,
    fromMe: false,
    body: "Smoke test capture from waha-webhook-smoke.mjs",
    hasMedia: false,
  },
};

const rawBody = JSON.stringify(payload);
const hmac = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");

const res = await fetch(`${baseUrl}/api/webhooks/whatsapp`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Webhook-Hmac": hmac,
    "X-Webhook-Hmac-Algorithm": "sha512",
  },
  body: rawBody,
});

const text = await res.text();
console.log(`Status: ${res.status}`);
console.log(text);

if (!res.ok) {
  process.exit(1);
}

// Dedupe: same payload again should 200 without second file
const res2 = await fetch(`${baseUrl}/api/webhooks/whatsapp`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Webhook-Hmac": hmac,
    "X-Webhook-Hmac-Algorithm": "sha512",
  },
  body: rawBody,
});
const text2 = await res2.text();
console.log(`Dedupe status: ${res2.status}`);
console.log(text2);

if (!res2.ok) {
  process.exit(1);
}

const parsed = JSON.parse(text2);
if (!parsed.deduplicated) {
  console.error("Expected deduplicated: true on retry");
  process.exit(1);
}

console.log("Smoke OK");
