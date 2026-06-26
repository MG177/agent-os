export const DEV_PREVIEW_COOKIE_NAME = "dev_preview_unlock";

const DEFAULT_COOKIE_MAX_AGE = 604800; // 7 days

export function isLockActive(): boolean {
  return Boolean(process.env.DEV_PREVIEW_PASSWORD?.trim());
}

export function isSecretConfigured(): boolean {
  const secret = process.env.DEV_PREVIEW_SECRET?.trim();
  return Boolean(secret && secret.length >= 16);
}

export function getCookieMaxAge(): number {
  const raw = process.env.DEV_PREVIEW_COOKIE_MAX_AGE?.trim();
  if (!raw) return DEFAULT_COOKIE_MAX_AGE;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_COOKIE_MAX_AGE;
}


async function hmacSign(payload: string): Promise<string | null> {
  if (!isSecretConfigured()) return null;
  const secretBytes = Uint8Array.from(new TextEncoder().encode(process.env.DEV_PREVIEW_SECRET!.trim()));

  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );

  return bufferToBase64Url(new Uint8Array(signature));
}

async function hmacVerify(payload: string, signatureB64: string): Promise<boolean> {
  if (!isSecretConfigured()) return false;
  const secretBytes = Uint8Array.from(new TextEncoder().encode(process.env.DEV_PREVIEW_SECRET!.trim()));

  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  const signature = base64UrlToBuffer(signatureB64);
  if (!signature) return false;

  const signatureBytes = Uint8Array.from(signature);

  return crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes,
    new TextEncoder().encode(payload),
  );
}

function bufferToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBuffer(value: string): Uint8Array | null {
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/");
    const padLen = (4 - (padded.length % 4)) % 4;
    const base64 = padded + "=".repeat(padLen);
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

export async function createUnlockCookieValue(): Promise<string | null> {
  if (!isSecretConfigured()) return null;

  const maxAge = getCookieMaxAge();
  const exp = Math.floor(Date.now() / 1000) + maxAge;
  const payload = JSON.stringify({ exp });
  const payloadB64 = bufferToBase64Url(new TextEncoder().encode(payload));
  const signature = await hmacSign(payloadB64);
  if (!signature) return null;

  return `${payloadB64}.${signature}`;
}

export async function verifyUnlockCookieValue(
  cookieValue: string | undefined,
): Promise<boolean> {
  if (!cookieValue || !isSecretConfigured()) return false;

  const dot = cookieValue.lastIndexOf(".");
  if (dot <= 0) return false;

  const payloadB64 = cookieValue.slice(0, dot);
  const signature = cookieValue.slice(dot + 1);
  if (!payloadB64 || !signature) return false;

  const valid = await hmacVerify(payloadB64, signature);
  if (!valid) return false;

  const payloadBytes = base64UrlToBuffer(payloadB64);
  if (!payloadBytes) return false;

  try {
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as {
      exp?: number;
    };
    if (typeof payload.exp !== "number") return false;
    return payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function sanitizeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/";
  }
  if (next.startsWith("/dev-lock")) {
    return "/";
  }
  return next;
}

export const PUBLIC_LOCK_BYPASS_PATHS = new Set([
  "/dev-lock",
  "/api/dev-unlock",
  "/api/webhooks/whatsapp",
  "/api/integrations/google-calendar/callback",
  "/api/integrations/clickup/callback",
  "/manifest.webmanifest",
  "/sw.js",
  "/icon.svg",
  "/app-icon.png",
  "/app-icon-192.png",
  "/app-icon-512.png",
  "/app-icon-180.png",
]);

export function isPublicLockBypassPath(pathname: string): boolean {
  return PUBLIC_LOCK_BYPASS_PATHS.has(pathname);
}
