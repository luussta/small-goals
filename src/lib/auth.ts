import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "small_goals_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
function signature(secret: string) { return createHmac("sha256", secret).update("small-goals-session-v1").digest("hex"); }
function safeEqual(a: string, b: string) {
  const left = Buffer.from(a); const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
export function configuredAppName() { return process.env.APP_NAME?.trim() || "Small Goals"; }
export function checkAgentToken(value: string | null) {
  const token = process.env.AGENT_API_TOKEN;
  if (!token || !value?.startsWith("Bearer ")) return false;
  return safeEqual(value.slice(7), token);
}
export async function hasUiSession() {
  const secret = process.env.APP_ACCESS_PASSWORD;
  if (!secret) return false;
  const jar = await cookies();
  const received = jar.get(COOKIE)?.value ?? "";
  return safeEqual(received, signature(secret));
}
export function sessionCookie(secure: boolean) {
  const secret = process.env.APP_ACCESS_PASSWORD;
  if (!secret) return null;
  return { name: COOKIE, value: signature(secret), httpOnly: true, secure, sameSite: "strict" as const, path: "/", maxAge: SESSION_MAX_AGE_SECONDS };
}
export const expiredSessionCookie = (secure: boolean) => ({ name: COOKIE, value: "", httpOnly: true, secure, sameSite: "strict" as const, path: "/", maxAge: 0 });
