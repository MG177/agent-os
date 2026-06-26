const DEFAULT_TIME_ZONE = "Asia/Jakarta";

function isValidZone(zone: string): boolean {
  try {
    // Throws RangeError for an invalid zone.
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve the app timezone, tolerating platform quirks.
 *
 * Vercel runs on AWS Lambda, which forces `process.env.TZ` to `:UTC` (the
 * leading colon is a POSIX convention). `TZ` is also a *reserved* env var on
 * Vercel, so it can't be overridden there. Passing `:UTC` straight into
 * `Intl`/Google APIs throws `RangeError: Invalid time zone specified: :UTC`.
 *
 * Resolution order:
 *  1. `APP_TZ` — explicit app override; works on Vercel where `TZ` is reserved.
 *  2. `TZ` — honored only when it's a real value (VPS/Docker/local). A
 *     colon-prefixed value is the platform default, not a user choice, so it
 *     is ignored.
 *  3. `Asia/Jakarta` default.
 */
export function getAppTimeZone(): string {
  const appTz = process.env.APP_TZ?.trim();
  if (appTz && isValidZone(appTz)) return appTz;

  const tz = process.env.TZ?.trim();
  if (tz && !tz.startsWith(":") && isValidZone(tz)) return tz;

  return DEFAULT_TIME_ZONE;
}

/**
 * Resolve a timezone preferring a client-supplied candidate (e.g. the browser's
 * `Intl.DateTimeFormat().resolvedOptions().timeZone`), validated to keep
 * untrusted input out of `Intl`/Google. Falls back to the server default when
 * the candidate is missing or unusable.
 */
export function resolveTimeZone(candidate?: string | null): string {
  const c = candidate?.trim();
  if (c && !c.startsWith(":") && isValidZone(c)) return c;
  return getAppTimeZone();
}
