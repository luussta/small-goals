import { loadEnvConfig } from "@next/env";
import { neon } from "@neondatabase/serverless";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { seedData } from "../src/lib/seed";

loadEnvConfig(process.cwd());
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required. Copy .env.example to .env.local and set it first.");
const sql = neon(connectionString);
const migration = await readFile(resolve("db/migrations/0001_workspace.sql"), "utf8");
await sql.query(migration);
await sql`INSERT INTO workspace (id, name, data, version) VALUES ('default', ${process.env.APP_NAME?.trim() || "Small Goals"}, ${JSON.stringify(seedData)}::jsonb, 1) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`;
console.log("Workspace table is ready. Existing goals were preserved.");
