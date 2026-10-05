import { createHmac, timingSafeEqual } from "crypto";

/**
 * Minimal signed-cookie auth for the /admin area.
 * The cookie value is an HMAC of a fixed payload keyed by ADMIN_SESSION_SECRET;
 * it proves the holder knew the admin password at login time without storing it.
 */

export const ADMIN_COOKIE = "dz_admin";
const PAYLOAD = "dazzlea-admin-v1";

function secret(): string {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "dazzlea-dev-secret";
}

export function signSession(): string {
  return createHmac("sha256", secret()).update(PAYLOAD).digest("hex");
}

export function verifySession(token: string | undefined | null): boolean {
  if (!token) return false;
  const expected = signSession();
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function checkPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
