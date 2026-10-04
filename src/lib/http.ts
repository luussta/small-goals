import { AppError } from "./db";

export const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
export async function readJson(request: Request, maxBytes = 16_384): Promise<unknown> {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > maxBytes) throw new AppError(413, "Request body is too large.");
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) throw new AppError(413, "Request body is too large.");
  try { return JSON.parse(text); } catch { throw new AppError(400, "Request body must be valid JSON."); }
}
export function errorResponse(error: unknown) {
  if (error instanceof AppError) return json({ error: error.message }, error.status);
  if (error && typeof error === "object" && "issues" in error) return json({ error: "Request validation failed.", details: (error as { issues: unknown }).issues }, 400);
  return json({ error: "The request could not be completed." }, 500);
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try { return new URL(origin).origin === new URL(request.url).origin; } catch { return false; }
}
