import { loadEnvConfig } from "@next/env";
import { z } from "zod";
import { WorkspaceDataSchema } from "../src/lib/model";
import { readLocalWorkspace } from "../src/lib/storage/local";

loadEnvConfig(process.cwd());

const missing = ["APP_NAME", "AGENT_API_TOKEN", "APP_ACCESS_PASSWORD"].filter((key) => !process.env[key]);
if (missing.length) throw new Error(`Missing required local environment variables: ${missing.join(", ")}`);

const storedWorkspaceSchema = z.object({
  id: z.literal("default"),
  name: z.string().trim().min(1).max(120),
  data: WorkspaceDataSchema,
  version: z.number().int().positive(),
  updatedAt: z.string().datetime(),
}).strict();
const stored = await readLocalWorkspace();
if (!stored) throw new Error("Local workspace is missing. Run npm run storage:init or use npm run setup to deploy to the cloud.");
try {
  storedWorkspaceSchema.parse(JSON.parse(stored.value));
} catch {
  throw new Error("Local workspace data is invalid.");
}

console.log("Local environment and workspace are valid. For a cloud deployment, use npm run verify:remote.");
