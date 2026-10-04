import { z } from "zod";
import { checkStorage, readWorkspace } from "@/lib/db";
import { configuredAppName, hasUiSession, sessionCookie, expiredSessionCookie } from "@/lib/auth";
import { errorResponse, json, readJson, sameOrigin } from "@/lib/http";

export const runtime = "nodejs";
export async function GET() {
  const authenticated = await hasUiSession();
  let name = configuredAppName();
  let ready = false;
  if (authenticated) {
    try { const workspace = await readWorkspace(); name = workspace.name || name; ready = true; }
    catch { await checkStorage().catch(() => undefined); }
  }
  return json({ authenticated, name, ready });
}
export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) return json({ error: "Same-origin request required." }, 403);
    const body = z.object({ password: z.string().min(1).max(200) }).strict().parse(await readJson(request, 2048));
    const password = process.env.APP_ACCESS_PASSWORD;
    const cookie = sessionCookie(new URL(request.url).protocol === "https:");
    if (!password || !cookie) return json({ error: "APP_ACCESS_PASSWORD is not configured." }, 503);
    // Hash both inputs before comparison to keep equal-length constant-time comparison.
    const { createHash, timingSafeEqual } = await import("node:crypto");
    const supplied = createHash("sha256").update(body.password).digest();
    const expected = createHash("sha256").update(password).digest();
    if (!timingSafeEqual(supplied, expected)) return json({ error: "Incorrect password." }, 401);
    const workspace = await readWorkspace();
    const response = json({ authenticated: true, name: workspace.name || configuredAppName() });
    response.headers.append("Set-Cookie", `${cookie.name}=${cookie.value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${cookie.maxAge}${cookie.secure ? "; Secure" : ""}`);
    return response;
  } catch (error) { return errorResponse(error); }
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return json({ error: "Same-origin request required." }, 403);
  const cookie = expiredSessionCookie(new URL(request.url).protocol === "https");
  const response = json({ authenticated: false });
  response.headers.append("Set-Cookie", `${cookie.name}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${cookie.secure ? "; Secure" : ""}`);
  return response;
}
