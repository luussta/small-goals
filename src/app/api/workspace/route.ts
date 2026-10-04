import { WorkspaceDataSchema, normalize } from "@/lib/model";
import { hasUiSession } from "@/lib/auth";
import { readWorkspace, updateWorkspace } from "@/lib/db";
import { errorResponse, json, readJson, sameOrigin } from "@/lib/http";

export const runtime = "nodejs";
export async function GET() {
  if (!await hasUiSession()) return json({ error: "Sign in to view this workspace." }, 401);
  try { return json({ workspace: await readWorkspace() }); } catch (error) { return errorResponse(error); }
}
export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return json({ error: "Same-origin request required." }, 403);
  if (!await hasUiSession()) return json({ error: "Sign in to edit this workspace." }, 401);
  try {
    const data = normalize(WorkspaceDataSchema.parse(await readJson(request, 65_536)));
    return json({ workspace: await updateWorkspace((current) => ({ ...current, data })) });
  } catch (error) { return errorResponse(error); }
}
