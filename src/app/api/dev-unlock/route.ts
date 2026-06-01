import { NextRequest, NextResponse } from "next/server";
import {
  createUnlockCookieValue,
  DEV_PREVIEW_COOKIE_NAME,
  getCookieMaxAge,
  isLockActive,
  isSecretConfigured,
  sanitizeNextPath,
} from "@/lib/dev-preview-lock/dev-preview-lock";
import { verifyDevPreviewPassword } from "@/lib/dev-preview-lock/dev-preview-lock.server";

export async function POST(request: NextRequest) {
  if (!isLockActive()) {
    return NextResponse.json({ error: "Preview lock is not active" }, { status: 404 });
  }

  if (!isSecretConfigured()) {
    return NextResponse.json(
      { error: "Preview lock misconfigured: DEV_PREVIEW_SECRET required" },
      { status: 503 },
    );
  }

  let body: { password?: string; next?: string };
  try {
    body = (await request.json()) as { password?: string; next?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const password = body.password ?? "";
  if (!verifyDevPreviewPassword(password)) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const cookieValue = await createUnlockCookieValue();
  if (!cookieValue) {
    return NextResponse.json({ error: "Unable to create unlock session" }, { status: 503 });
  }

  const nextPath = sanitizeNextPath(body.next);
  const response = NextResponse.json({ ok: true, next: nextPath });

  response.cookies.set({
    name: DEV_PREVIEW_COOKIE_NAME,
    value: cookieValue,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: getCookieMaxAge(),
  });

  return response;
}
