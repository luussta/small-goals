import { neon } from "@neondatabase/serverless";
import type { Workspace, WorkspaceData } from "./model";

export class AppError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
function sqlClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new AppError(503, "DATABASE_URL is not configured.");
  return neon(url);
}
function rowWorkspace(row: Record<string, unknown>): Workspace {
  return { id: String(row.id), name: String(row.name), data: row.data as WorkspaceData, version: Number(row.version), updatedAt: new Date(String(row.updated_at)).toISOString() };
}
export async function readWorkspace(): Promise<Workspace> {
  const sql = sqlClient();
  const rows = await sql`SELECT id, name, data, version, updated_at FROM workspace WHERE id = 'default' LIMIT 1`;
  if (!rows.length) throw new AppError(503, "Workspace is not initialized. Run npm run db:migrate.");
  return rowWorkspace(rows[0] as Record<string, unknown>);
}
export async function updateWorkspace(mutate: (current: Workspace) => Workspace): Promise<Workspace> {
  const sql = sqlClient();
  for (let attempt = 0; attempt < 4; attempt++) {
    const current = await readWorkspace();
    const next = mutate(structuredClone(current));
    const rows = await sql`UPDATE workspace SET name = ${next.name}, data = ${JSON.stringify(next.data)}::jsonb, version = version + 1, updated_at = NOW() WHERE id = 'default' AND version = ${current.version} RETURNING id, name, data, version, updated_at`;
    if (rows.length) return rowWorkspace(rows[0] as Record<string, unknown>);
  }
  throw new AppError(409, "Workspace changed during this request. Retry the operation.");
}
export async function checkDatabase(): Promise<void> {
  const sql = sqlClient();
  await sql`SELECT id FROM workspace WHERE id = 'default' LIMIT 1`;
}
