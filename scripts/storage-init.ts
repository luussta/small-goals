import { loadEnvConfig } from "@next/env";
import { z } from "zod";
import { seedData } from "../src/lib/seed";
import { normalize, WorkspaceDataSchema, type Workspace } from "../src/lib/model";
import { readLocalWorkspace, writeLocalWorkspace } from "../src/lib/storage/local";

loadEnvConfig(process.cwd());

const localWorkspaceSchema = z.object({
  id: z.literal("default"),
  name: z.string().trim().min(1).max(120),
  data: WorkspaceDataSchema,
  version: z.number().int().positive(),
  updatedAt: z.string().datetime(),
}).strict();

const existing = await readLocalWorkspace();
if (existing) {
  try {
    localWorkspaceSchema.parse(JSON.parse(existing.value));
  } catch {
    throw new Error("The existing local workspace file is invalid. Back it up before replacing it.");
  }
  console.log("Existing local workspace preserved.");
} else {
  const workspace: Workspace = {
    id: "default",
    name: z.string().trim().min(1).max(120).parse(process.env.APP_NAME?.trim() || "Small Goals"),
    data: normalize(WorkspaceDataSchema.parse(seedData)),
    version: 1,
    updatedAt: new Date().toISOString(),
  };
  const created = await writeLocalWorkspace(JSON.stringify(workspace), null);
  if (!created && !(await readLocalWorkspace())) throw new Error("Could not initialize local workspace storage.");
  console.log("Local workspace storage is ready.");
}
