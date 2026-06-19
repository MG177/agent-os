import { getDb } from "@agent-os/platform/mongo";
import {
  decryptSecret,
  encryptSecret,
  hasEncryptionKey,
} from "@agent-os/core/integrations/token-crypto";
import type { GoogleCalendarTokenRecord } from "@agent-os/contracts/integrations/google-calendar/types";

const INTEGRATION_ID = "google-calendar";

type TokenDoc = GoogleCalendarTokenRecord & { _id: string };

async function collection() {
  const db = await getDb();
  return db.collection<TokenDoc>("integrations");
}

export async function loadTokenRecord(): Promise<GoogleCalendarTokenRecord | null> {
  const col = await collection();
  const doc = await col.findOne({ _id: INTEGRATION_ID });
  if (!doc) return null;
  const { _id: _ignored, ...record } = doc;
  return record as GoogleCalendarTokenRecord;
}

export async function getRefreshToken(): Promise<string | null> {
  const record = await loadTokenRecord();
  if (!record?.encryptedRefreshToken || !hasEncryptionKey()) return null;
  try {
    return decryptSecret(record.encryptedRefreshToken);
  } catch {
    return null;
  }
}

export async function saveTokenRecord(input: {
  refreshToken: string;
  email?: string;
}): Promise<GoogleCalendarTokenRecord> {
  if (!hasEncryptionKey()) {
    throw new Error("TOKEN_ENCRYPTION_KEY is not configured");
  }
  const col = await collection();
  const now = new Date().toISOString();
  const existing = await loadTokenRecord();
  const record: GoogleCalendarTokenRecord = {
    encryptedRefreshToken: encryptSecret(input.refreshToken),
    email: input.email ?? existing?.email,
    connectedAt: existing?.connectedAt ?? now,
    updatedAt: now,
  };
  await col.replaceOne(
    { _id: INTEGRATION_ID },
    { _id: INTEGRATION_ID, ...record } as unknown as TokenDoc,
    { upsert: true },
  );
  return record;
}

export async function deleteTokenRecord(): Promise<void> {
  const col = await collection();
  await col.deleteOne({ _id: INTEGRATION_ID });
}

export async function isCalendarConnected(): Promise<boolean> {
  return (await getRefreshToken()) !== null;
}
