import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const filePath = join(process.cwd(), ".small-goals", "workspace.json");
let queued: Promise<void> = Promise.resolve();

export async function readLocalWorkspace(): Promise<{ value: string; etag: string } | null> {
  try {
    const value = await readFile(filePath, "utf8");
    const etag = createHash("sha256").update(value).digest("hex");
    return { value, etag };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function writeLocalWorkspace(value: string, etag: string | null): Promise<boolean> {
  let release!: () => void;
  const previous = queued;
  queued = new Promise<void>((resolve) => { release = resolve; });
  await previous;
  try {
    const existing = await readLocalWorkspace();
    if (etag ? existing?.etag !== etag : existing !== null) return false;
    await mkdir(dirname(filePath), { recursive: true });
    const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
    await writeFile(temporaryPath, value, { encoding: "utf8", mode: 0o600 });
    await rename(temporaryPath, filePath);
    return true;
  } finally {
    release();
  }
}
