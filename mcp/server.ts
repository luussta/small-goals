import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { z } from "zod";

const rawUrl = process.env.SMALL_GOALS_URL;
const token = process.env.SMALL_GOALS_TOKEN;
if (!rawUrl || !token) throw new Error("Set SMALL_GOALS_URL and SMALL_GOALS_TOKEN to connect to a Small Goals deployment.");
const parsedUrl = new URL(rawUrl);
if (parsedUrl.protocol !== "https:" && parsedUrl.hostname !== "localhost" && parsedUrl.hostname !== "127.0.0.1") throw new Error("SMALL_GOALS_URL must use HTTPS (except for localhost development).");
const base = parsedUrl.origin.replace(/\/$/, "");

async function api(path: string, method = "GET", body?: unknown) {
  let response: Response;
  try {
    response = await fetch(`${base}/api/agent/${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
      signal: AbortSignal.timeout(15_000),
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw new Error(`Small Goals deployment at ${base} could not be reached.`);
  }
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) throw new Error("Small Goals rejected the access token. Check SMALL_GOALS_TOKEN.");
  if (response.status === 404) throw new Error(data.error || "The requested goal, section, or item ID does not exist.");
  if (!response.ok) throw new Error(data.error || `Small Goals returned HTTP ${response.status}.`);
  return data;
}
function result(data: unknown) { return { content: [{ type: "text" as const, text: JSON.stringify(data) }], structuredContent: data as Record<string, unknown> }; }

function createServer() {
  const server = new McpServer({ name: "small-goals", version: "1.0.0" }, { capabilities: { tools: {} } });
  server.registerTool("small_goals_get_state", { description: "Read the complete canonical workspace, including every section, goal, checklist item, completion state, stable ID, and current workspace name. Use this first when you need context.", inputSchema: {}, annotations: { readOnlyHint: true } }, async () => result(await api("state")));
  server.registerTool("small_goals_list_today", { description: "List the goals in the Today section with stable IDs, progress, status, and checklist details. Use this to answer what remains today or before adding something new.", inputSchema: {}, annotations: { readOnlyHint: true } }, async () => {
    const { workspace } = await api("state"); const today = workspace.data.sections.find((section: { id: string }) => section.id === "today");
    return result({ section: today || null });
  });
  server.registerTool("small_goals_list_section", { description: "List one section and its goals/items by stable section ID. Read state first if you only know the section title.", inputSchema: { sectionId: z.string().min(1) }, annotations: { readOnlyHint: true } }, async ({ sectionId }) => result(await api(`sections/${encodeURIComponent(sectionId)}`)));
  server.registerTool("small_goals_list_goals", { description: "List goals, optionally filtered to a section. Each goal includes stable IDs and its section ID; completed is derived from all checklist items.", inputSchema: { sectionId: z.string().optional() }, annotations: { readOnlyHint: true } }, async ({ sectionId }) => result(await api(`goals${sectionId ? `?sectionId=${encodeURIComponent(sectionId)}` : ""}`)));
  server.registerTool("small_goals_get_goal", { description: "Inspect one goal by stable goal ID, including its section, active state, derived completion state, and checklist item IDs.", inputSchema: { goalId: z.string().min(1) }, annotations: { readOnlyHint: true } }, async ({ goalId }) => result(await api(`goals/${encodeURIComponent(goalId)}`)));
  server.registerTool("small_goals_add_goal", { description: "Create a goal in an existing section. Keep the user's wording. Supply concrete checklist items when the request names them; avoid inventing unnecessary substeps. Returns stable goal and item IDs.", inputSchema: { sectionId: z.string().min(1), title: z.string().trim().min(1).max(200), items: z.array(z.string().trim().min(1).max(500)).max(200).optional() }, annotations: { idempotentHint: false } }, async ({ sectionId, title, items }) => result(await api("goals", "POST", { sectionId, title, items })));
  server.registerTool("small_goals_update_goal", { description: "Rename a goal, mark it active/in progress, clear its active state, or change its collapsed state. Completion is derived and cannot be forced. Requires its stable goal ID.", inputSchema: { goalId: z.string().min(1), title: z.string().trim().min(1).max(200).optional(), active: z.boolean().optional(), collapsed: z.boolean().optional() } }, async ({ goalId, ...patch }) => result(await api(`goals/${encodeURIComponent(goalId)}`, "PATCH", patch)));
  server.registerTool("small_goals_move_goal", { description: "Move an existing goal to another section by stable goal and destination section IDs. The goal keeps its stable ID and checklist.", inputSchema: { goalId: z.string().min(1), sectionId: z.string().min(1) } }, async ({ goalId, sectionId }) => result(await api(`goals/${encodeURIComponent(goalId)}`, "PATCH", { sectionId })));
  server.registerTool("small_goals_set_active_goal", { description: "Mark a non-completed goal as the goal currently being worked on (orange). Marking another goal active does not remove other active goals. Pass active=false to stop highlighting it.", inputSchema: { goalId: z.string().min(1), active: z.boolean() } }, async ({ goalId, active }) => result(await api(`goals/${encodeURIComponent(goalId)}`, "PATCH", { active })));
  server.registerTool("small_goals_delete_goal", { description: "Permanently delete a goal and all of its checklist items. Ask the user before deletion unless they explicitly requested it.", inputSchema: { goalId: z.string().min(1) }, annotations: { destructiveHint: true, idempotentHint: true } }, async ({ goalId }) => result(await api(`goals/${encodeURIComponent(goalId)}`, "DELETE")));
  server.registerTool("small_goals_add_item", { description: "Add one concrete checklist item to a goal using its stable goal ID. Returns the new stable item ID.", inputSchema: { goalId: z.string().min(1), text: z.string().trim().min(1).max(500), position: z.number().int().min(0).optional() } }, async ({ goalId, text, position }) => result(await api(`goals/${encodeURIComponent(goalId)}/items`, "POST", { text, position })));
  server.registerTool("small_goals_update_item", { description: "Rename or reorder a checklist item by stable item ID. Use complete/uncomplete tools for completion changes so the intent is explicit.", inputSchema: { itemId: z.string().min(1), text: z.string().trim().min(1).max(500).optional(), position: z.number().int().min(0).optional() } }, async ({ itemId, ...patch }) => result(await api(`items/${encodeURIComponent(itemId)}`, "PATCH", patch)));
  server.registerTool("small_goals_complete_item", { description: "Mark one checklist item complete by its stable item ID. When every item is complete, its goal automatically becomes green and Done.", inputSchema: { itemId: z.string().min(1) } }, async ({ itemId }) => result(await api(`items/${encodeURIComponent(itemId)}`, "PATCH", { completed: true })));
  server.registerTool("small_goals_uncomplete_item", { description: "Mark one checklist item incomplete by its stable item ID. A formerly completed goal then returns to its normal non-completed status.", inputSchema: { itemId: z.string().min(1) } }, async ({ itemId }) => result(await api(`items/${encodeURIComponent(itemId)}`, "PATCH", { completed: false })));
  server.registerTool("small_goals_delete_item", { description: "Permanently delete a checklist item by stable item ID. Ask before deletion unless the user explicitly requested it.", inputSchema: { itemId: z.string().min(1) }, annotations: { destructiveHint: true, idempotentHint: true } }, async ({ itemId }) => result(await api(`items/${encodeURIComponent(itemId)}`, "DELETE")));
  server.registerTool("small_goals_create_section", { description: "Add a custom section with a concise user-provided title. The four standard sections are already present, so use this only when the user asks for another section.", inputSchema: { title: z.string().trim().min(1).max(100) } }, async ({ title }) => result(await api("sections", "POST", { title })));
  return server;
}

serveStdio(createServer, { onerror: (error) => process.stderr.write(`${error.message}\n`) });
