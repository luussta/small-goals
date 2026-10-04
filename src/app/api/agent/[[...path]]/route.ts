import { z } from "zod";
import { checkAgentToken } from "@/lib/auth";
import { AppError, readWorkspace, updateWorkspace } from "@/lib/db";
import { errorResponse, json, readJson } from "@/lib/http";
import { isComplete, makeId, normalize, type Goal, type Section, type Workspace } from "@/lib/model";

export const runtime = "nodejs";
const text = (max: number) => z.string().trim().min(1).max(max);
const newGoal = z.object({ sectionId: text(100), title: text(200), items: z.array(text(500)).max(200).optional() }).strict();
const goalPatch = z.object({ title: text(200).optional(), sectionId: text(100).optional(), active: z.boolean().optional(), collapsed: z.boolean().optional() }).strict().refine((v) => Object.keys(v).length > 0);
const newItem = z.object({ text: text(500), position: z.number().int().min(0).optional() }).strict();
const itemPatch = z.object({ text: text(500).optional(), completed: z.boolean().optional(), position: z.number().int().min(0).optional() }).strict().refine((v) => Object.keys(v).length > 0);
const newSection = z.object({ title: text(100) }).strict();
const renameWorkspace = z.object({ name: text(120) }).strict();

function findGoal(w: Workspace, id: string): { section: Section; goal: Goal } {
  for (const section of w.data.sections) { const goal = section.goals.find((entry) => entry.id === id); if (goal) return { section, goal }; }
  throw new AppError(404, `Goal ${id} was not found.`);
}
function findItem(w: Workspace, id: string): { section: Section; goal: Goal; index: number } {
  for (const section of w.data.sections) for (const goal of section.goals) { const index = goal.items.findIndex((item) => item.id === id); if (index >= 0) return { section, goal, index }; }
  throw new AppError(404, `Checklist item ${id} was not found.`);
}
function sectionById(w: Workspace, id: string) { const section = w.data.sections.find((entry) => entry.id === id); if (!section) throw new AppError(404, `Section ${id} was not found.`); return section; }
function clean(w: Workspace) { w.data = normalize(w.data); return w; }
async function body<T>(request: Request, schema: z.ZodType<T>): Promise<T> { return schema.parse(await readJson(request)); }

async function handler(request: Request, segments: string[]) {
  const [resource, id, child] = segments;
  const method = request.method;
  if ((!resource || resource === "state") && method === "GET") return json({ workspace: await readWorkspace() });
  if ((!resource || resource === "state") && method === "PATCH") {
    const input = await body(request, renameWorkspace);
    const workspace = await updateWorkspace((current) => ({ ...current, name: input.name }));
    return json({ workspace });
  }
  if (resource === "sections") {
    if (method === "GET" && !id) return json({ sections: (await readWorkspace()).data.sections.map(({ id, title, collapsed, goals }) => ({ id, title, collapsed, goalCount: goals.length })) });
    if (method === "GET" && id && !child) return json({ section: sectionById(await readWorkspace(), id) });
    if (method === "POST" && !id) {
      const input = await body(request, newSection);
      const workspace = await updateWorkspace((current) => { current.data.sections.push({ id: makeId(), title: input.title, collapsed: false, goals: [] }); return current; });
      return json({ workspace, section: workspace.data.sections.at(-1) }, 201);
    }
  }
  if (resource === "goals") {
    if (method === "GET" && !id) {
      const workspace = await readWorkspace();
      const sectionId = new URL(request.url).searchParams.get("sectionId");
      return json({ goals: workspace.data.sections.filter((section) => !sectionId || section.id === sectionId).flatMap((section) => section.goals.map((goal) => ({ ...goal, sectionId: section.id, sectionTitle: section.title, completed: isComplete(goal) }))) });
    }
    if (method === "GET" && id && !child) { const workspace = await readWorkspace(); const found = findGoal(workspace, id); return json({ goal: { ...found.goal, sectionId: found.section.id, sectionTitle: found.section.title, completed: isComplete(found.goal) } }); }
    if (method === "POST" && !id) {
      const input = await body(request, newGoal);
      const createdGoalId = makeId();
      const workspace = await updateWorkspace((current) => {
        const section = sectionById(current, input.sectionId);
        section.collapsed = false;
        section.goals.push({ id: createdGoalId, title: input.title, collapsed: !input.items?.length, active: false, items: (input.items ?? []).map((itemText) => ({ id: makeId(), text: itemText, completed: false })) });
        return current;
      });
      const created = findGoal(workspace, createdGoalId).goal;
      return json({ goal: created }, 201);
    }
    if (method === "PATCH" && id && !child) {
      const input = await body(request, goalPatch);
      const workspace = await updateWorkspace((current) => {
        const { section, goal } = findGoal(current, id);
        if (input.title !== undefined) goal.title = input.title;
        if (input.collapsed !== undefined) goal.collapsed = input.collapsed;
        if (input.active !== undefined) {
          if (input.active && isComplete(goal)) throw new AppError(409, "A completed goal cannot be marked active.");
          goal.active = input.active;
        }
        if (input.sectionId !== undefined && input.sectionId !== section.id) {
          const destination = sectionById(current, input.sectionId);
          section.goals = section.goals.filter((entry) => entry.id !== id);
          destination.goals.push(goal);
          destination.collapsed = false;
        }
        return clean(current);
      });
      return json({ workspace, goal: findGoal(workspace, id).goal });
    }
    if (method === "DELETE" && id && !child) {
      const workspace = await updateWorkspace((current) => { findGoal(current, id).section.goals = findGoal(current, id).section.goals.filter((entry) => entry.id !== id); return current; });
      return json({ deleted: true, workspace });
    }
    if (method === "POST" && id && child === "items") {
      const input = await body(request, newItem);
      let createdId = "";
      const workspace = await updateWorkspace((current) => {
        const goal = findGoal(current, id).goal; const item = { id: makeId(), text: input.text, completed: false }; createdId = item.id;
        const position = input.position ?? goal.items.length; goal.items.splice(Math.min(position, goal.items.length), 0, item); goal.collapsed = false;
        return current;
      });
      const goal = findGoal(workspace, id).goal;
      return json({ goal, item: goal.items.find((entry) => entry.id === createdId) }, 201);
    }
  }
  if (resource === "items" && id) {
    if (method === "PATCH" && !child) {
      const input = await body(request, itemPatch);
      const workspace = await updateWorkspace((current) => {
        const { goal, index } = findItem(current, id); const [item] = goal.items.splice(index, 1);
        if (input.text !== undefined) item.text = input.text;
        if (input.completed !== undefined) item.completed = input.completed;
        if (input.position !== undefined) goal.items.splice(Math.min(input.position, goal.items.length), 0, item); else goal.items.splice(index, 0, item);
        return clean(current);
      });
      const found = findItem(workspace, id);
      return json({ item: found.goal.items[found.index], goal: found.goal, completed: isComplete(found.goal) });
    }
    if (method === "DELETE" && !child) {
      const workspace = await updateWorkspace((current) => { const found = findItem(current, id); found.goal.items.splice(found.index, 1); return clean(current); });
      return json({ deleted: true, workspace });
    }
  }
  throw new AppError(404, "Agent API route was not found.");
}

async function route(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  if (!checkAgentToken(request.headers.get("authorization"))) return json({ error: "Invalid or missing bearer token." }, 401);
  try {
    const { path = [] } = await context.params;
    return await handler(request, path);
  } catch (error) { return errorResponse(error); }
}
export const GET = route;
export const POST = route;
export const PATCH = route;
export const DELETE = route;
