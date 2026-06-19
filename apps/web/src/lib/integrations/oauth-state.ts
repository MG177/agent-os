import crypto from "crypto";

const STATE_TTL_MS = 10 * 60 * 1000;

function stateSecret(): string {
  const secret = process.env.OAUTH_STATE_SECRET;
  if (!secret) {
    throw new Error("OAUTH_STATE_SECRET is not set");
  }
  return secret;
}

function sign(payload: string): string {
  return crypto
    .createHmac("sha256", stateSecret())
    .update(payload)
    .digest("base64url");
}

export function createOAuthState(): string {
  const issuedAt = Date.now();
  const nonce = crypto.randomBytes(16).toString("base64url");
  const payload = `${issuedAt}.${nonce}`;
  const sig = sign(payload);
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

export function verifyOAuthState(state: string): boolean {
  try {
    const decoded = Buffer.from(state, "base64url").toString("utf8");
    const lastDot = decoded.lastIndexOf(".");
    if (lastDot < 0) return false;
    const payload = decoded.slice(0, lastDot);
    const sig = decoded.slice(lastDot + 1);
    if (sig !== sign(payload)) return false;
    const issuedAt = Number(payload.split(".")[0]);
    if (!Number.isFinite(issuedAt)) return false;
    return Date.now() - issuedAt <= STATE_TTL_MS;
  } catch {
    return false;
  }
}
