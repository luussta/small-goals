import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile, chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const run = (command, args, env = process.env) => {
  const result = spawnSync(command, args, { stdio: "inherit", env });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited with status ${result.status ?? "unknown"}.`);
};

async function main() {
  const secretNames = ["DATABASE_URL", "AGENT_API_TOKEN", "APP_ACCESS_PASSWORD"];
  const missing = secretNames.filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`Set these secrets in the shell before deployment: ${missing.join(", ")}`);

  const buildEnv = { ...process.env };
  for (const name of secretNames) delete buildEnv[name];
  run(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build:cloudflare"], buildEnv);

  const secretDir = await mkdtemp(join(tmpdir(), "small-goals-deploy-"));
  try {
    const secretsPath = join(secretDir, "secrets.json");
    await writeFile(secretsPath, JSON.stringify(Object.fromEntries(secretNames.map((name) => [name, process.env[name]]))));
    await chmod(secretsPath, 0o600).catch(() => undefined);
    run(process.platform === "win32" ? "cf.cmd" : "cf", ["deploy", "--prebuilt", "--secrets-file", secretsPath]);
  } finally {
    await rm(secretDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Deployment failed."}\n`);
  process.exitCode = 1;
});
