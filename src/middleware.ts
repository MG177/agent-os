import { NextRequest, NextResponse } from "next/server";
import {
  DEV_PREVIEW_COOKIE_NAME,
  isLockActive,
  isPublicLockBypassPath,
  isSecretConfigured,
  verifyUnlockCookieValue,
} from "@/lib/dev-preview-lock/dev-preview-lock";

export async function middleware(request: NextRequest) {
  if (!isLockActive()) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (isPublicLockBypassPath(pathname)) {
    return NextResponse.next();
  }

  if (!isSecretConfigured()) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Preview lock misconfigured: DEV_PREVIEW_SECRET required" },
        { status: 503 },
      );
    }

    const url = request.nextUrl.clone();
    url.pathname = "/dev-lock";
    url.searchParams.set("next", pathname);
    url.searchParams.set("error", "misconfigured");
    return NextResponse.redirect(url);
  }

  const cookie = request.cookies.get(DEV_PREVIEW_COOKIE_NAME)?.value;
  if (await verifyUnlockCookieValue(cookie)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/dev-lock";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
