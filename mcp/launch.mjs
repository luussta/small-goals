import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const runtimeDirectory = dirname(fileURLToPath(import.meta.url));
const privateDirectory = process.argv[2];

if (!privateDirectory) {
  process.stderr.write("Small Goals MCP is missing its private configuration directory. Re-run npm run setup.\n");
  process.exit(1);
}

try {
  const [url, token] = await Promise.all([
    readFile(join(privateDirectory, "deployment-url"), "utf8"),
    readFile(join(privateDirectory, "agent-token"), "utf8"),
  ]);
  const child = spawn(process.execPath, [
    join(runtimeDirectory, "node_modules", "tsx", "dist", "cli.mjs"),
    join(runtimeDirectory, "server.ts"),
  ], {
    cwd: runtimeDirectory,
    env: {
      ...process.env,
      SMALL_GOALS_URL: url.trim(),
      SMALL_GOALS_TOKEN: token.trim(),
    },
    stdio: "inherit",
  });

  child.on("error", (error) => {
    process.stderr.write(`Could not start the Small Goals MCP server: ${error.message}\n`);
    process.exitCode = 1;
  });
  child.on("exit", (code, signal) => {
    process.exitCode = code ?? (signal ? 1 : 0);
  });
} catch {
  process.stderr.write("Small Goals MCP could not read its private setup files. Re-run npm run setup.\n");
  process.exit(1);
}
