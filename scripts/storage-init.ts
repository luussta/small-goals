import { loadEnvConfig } from "@next/env";
import { checkStorage } from "../src/lib/db";

loadEnvConfig(process.cwd());
await checkStorage();
console.log("Workspace storage is ready.");
