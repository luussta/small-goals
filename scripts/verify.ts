import { loadEnvConfig } from "@next/env";
import { neon } from "@neondatabase/serverless";

loadEnvConfig(process.cwd());
const missing = ["DATABASE_URL", "AGENT_API_TOKEN", "APP_ACCESS_PASSWORD"].filter((key) => !process.env[key]);
if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
const sql = neon(process.env.DATABASE_URL!);
const rows = await sql`SELECT id, version, jsonb_typeof(data) AS data_type FROM workspace WHERE id = 'default' LIMIT 1`;
if (!rows.length || rows[0].data_type !== "object") throw new Error("Workspace row is missing or invalid. Run npm run db:migrate.");
console.log(`Configuration and database are ready (workspace version ${rows[0].version}).`);
