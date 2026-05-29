import fs from "fs";
import path from "path";
import { AGENT_OS_DATA } from "@/lib/data-paths";
import {
  decryptSecret,
  encryptSecret,
  hasEncryptionKey,
} from "@/lib/integrations/token-crypto";
import type { GoogleCalendarTokenRecord } from "@/lib/integrations/google-calendar/types";

const TOKEN_DIR = path.join(AGENT_OS_DATA, "integrations");
const TOKEN_PATH = path.join(TOKEN_DIR, "google-calendar.json");

function ensureTokenDir() {
  fs.mkdirSync(TOKEN_DIR, { recursive: true, mode: 0o700 });
}

export function loadTokenRecord(): GoogleCalendarTokenRecord | null {
  if (!fs.existsSync(TOKEN_PATH)) return null;
  try {
    const raw = fs.readFileSync(TOKEN_PATH, "utf8");
    return JSON.parse(raw) as GoogleCalendarTokenRecord;
  } catch {
    return null;
  }
}

export function getRefreshToken(): string | null {
  const record = loadTokenRecord();
  if (!record?.encryptedRefreshToken || !hasEncryptionKey()) return null;
  try {
    return decryptSecret(record.encryptedRefreshToken);
  } catch {
    return null;
  }
}

export function saveTokenRecord(input: {
  refreshToken: string;
  email?: string;
}): GoogleCalendarTokenRecord {
  if (!hasEncryptionKey()) {
    throw new Error("TOKEN_ENCRYPTION_KEY is not configured");
  }
  ensureTokenDir();
  const now = new Date().toISOString();
  const existing = loadTokenRecord();
  const record: GoogleCalendarTokenRecord = {
    encryptedRefreshToken: encryptSecret(input.refreshToken),
    email: input.email ?? existing?.email,
    connectedAt: existing?.connectedAt ?? now,
    updatedAt: now,
  };
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(record, null, 2), {
    encoding: "utf8",
    mode: 0o600,
  });
  return record;
}

export function deleteTokenRecord(): void {
  if (fs.existsSync(TOKEN_PATH)) {
    fs.unlinkSync(TOKEN_PATH);
  }
}

export function isCalendarConnected(): boolean {
  return getRefreshToken() !== null;
}
