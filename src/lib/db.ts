import { BlobPreconditionFailedError, get as getBlob, put as putBlob } from "@vercel/blob";
import { z } from "zod";
import { seedData } from "./seed";
import { WorkspaceDataSchema, normalize, type Workspace, type WorkspaceData } from "./model";
import { cloudflareBucket } from "./storage/cloudflare";

export class AppError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

const OBJECT_KEY = "small-goals/workspace.json";
const storedWorkspaceSchema = z.object({
  id: z.literal("default"),
  name: z.string().trim().min(1).max(120),
  data: WorkspaceDataSchema,
  version: z.number().int().positive(),
  updatedAt: z.string().datetime(),
}).strict();
type StoredRecord = { workspace: Workspace; etag: string | null };
type R2Bucket = NonNullable<ReturnType<typeof cloudflareBucket>>;

async function readR2(bucket: R2Bucket): Promise<StoredRecord | null> {
  const object = await bucket.get(OBJECT_KEY);
  if (!object) return null;
  const workspace = parseStored(await object.text());
  return { workspace, etag: object.etag };
}

async function writeR2(bucket: R2Bucket, workspace: Workspace, etag: string | null): Promise<boolean> {
  const result = await bucket.put(OBJECT_KEY, JSON.stringify(workspace), {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
    onlyIf: etag ? { etagMatches: etag } : { etagDoesNotMatch: "*" },
  });
  return result !== null;
}

async function readVercelBlob(): Promise<StoredRecord | null> {
  const result = await getBlob(OBJECT_KEY, { access: "private", useCache: false });
  if (!result) return null;
  if (result.statusCode !== 200) return null;
  const workspace = parseStored(await new Response(result.stream).text());
  return { workspace, etag: result.blob.etag };
}

async function writeVercelBlob(workspace: Workspace, etag: string | null): Promise<boolean> {
  try {
    await putBlob(OBJECT_KEY, JSON.stringify(workspace), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 60,
      contentType: "application/json; charset=utf-8",
      ...(etag ? { ifMatch: etag } : {}),
    });
    return true;
  } catch (error) {
    if (etag && error instanceof BlobPreconditionFailedError) return false;
    throw error;
  }
}

async function readLocal(): Promise<StoredRecord | null> {
  const { readLocalWorkspace } = await import("./storage/local");
  const stored = await readLocalWorkspace();
  if (!stored) return null;
  return { workspace: parseStored(stored.value), etag: stored.etag };
}

async function writeLocal(workspace: Workspace, etag: string | null): Promise<boolean> {
  const { writeLocalWorkspace } = await import("./storage/local");
  return writeLocalWorkspace(JSON.stringify(workspace), etag);
}

function parseStored(raw: string): Workspace {
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    const parsed = storedWorkspaceSchema.parse(value);
    return { ...parsed, data: normalize(parsed.data) };
  } catch {
    throw new AppError(503, "Stored workspace data is invalid. Restore a valid workspace backup before continuing.");
  }
}

function newWorkspace(): Workspace {
  return {
    id: "default",
    name: z.string().trim().min(1).max(120).parse(process.env.APP_NAME?.trim() || "Small Goals"),
    data: normalize(WorkspaceDataSchema.parse(seedData as WorkspaceData)),
    version: 1,
    updatedAt: new Date().toISOString(),
  };
}

async function readStored(): Promise<StoredRecord | null> {
  const bucket = cloudflareBucket();
  if (bucket) return readR2(bucket);
  if (process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL) return readVercelBlob();
  return readLocal();
}

async function writeStored(workspace: Workspace, etag: string | null): Promise<boolean> {
  const bucket = cloudflareBucket();
  if (bucket) return writeR2(bucket, workspace, etag);
  if (process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL) return writeVercelBlob(workspace, etag);
  return writeLocal(workspace, etag);
}

async function readOrCreate(): Promise<StoredRecord> {
  const current = await readStored();
  if (current) return current;
  const initial = newWorkspace();
  await writeStored(initial, null);
  const created = await readStored();
  if (!created) throw new AppError(503, "Persistent storage is not available.");
  return created;
}

export async function readWorkspace(): Promise<Workspace> {
  return (await readOrCreate()).workspace;
}

export async function updateWorkspace(mutate: (current: Workspace) => Workspace): Promise<Workspace> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const current = await readOrCreate();
    const next = mutate(structuredClone(current.workspace));
    next.id = "default";
    next.name = z.string().trim().min(1).max(120).parse(next.name);
    next.data = normalize(WorkspaceDataSchema.parse(next.data));
    next.version = current.workspace.version + 1;
    next.updatedAt = new Date().toISOString();
    if (await writeStored(next, current.etag)) return next;
  }
  throw new AppError(409, "Workspace changed during this request. Retry the operation.");
}

export async function checkStorage(): Promise<void> {
  await readOrCreate();
}
