import { loadEnvConfig } from "@next/env";
import { checkStorage } from "../src/lib/db";

loadEnvConfig(process.cwd());
const missing = ["APP_NAME", "AGENT_API_TOKEN", "APP_ACCESS_PASSWORD"].filter((key) => !process.env[key]);
if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
await checkStorage();
console.log("Configuration is ready and persistent workspace storage can be read.");
