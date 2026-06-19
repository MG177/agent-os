import { createHash, timingSafeEqual } from "node:crypto";
import { isSecretConfigured } from "@/lib/dev-preview-lock/dev-preview-lock";

/** Route Handler only — uses Node crypto for SHA-256 password check. */
export function verifyDevPreviewPassword(password: string): boolean {
  const expected = process.env.DEV_PREVIEW_PASSWORD?.trim();
  if (!expected || !isSecretConfigured()) return false;

  const inputHash = createHash("sha256").update(password).digest();
  const expectedHash = createHash("sha256").update(expected).digest();

  if (inputHash.length !== expectedHash.length) return false;
  return timingSafeEqual(inputHash, expectedHash);
}
