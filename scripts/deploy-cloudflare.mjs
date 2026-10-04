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
  const secretNames = ["AGENT_API_TOKEN", "APP_ACCESS_PASSWORD"];
  const missing = secretNames.filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`Set these secrets in the shell before deployment: ${missing.join(", ")}`);
  if (!process.env.APP_NAME?.trim()) throw new Error("APP_NAME is required.");
  if (!process.env.SMALL_GOALS_BUCKET_NAME?.trim()) throw new Error("SMALL_GOALS_BUCKET_NAME is required.");

  const cf = process.platform === "win32" ? "cf.cmd" : "cf";
  const bucketName = process.env.SMALL_GOALS_BUCKET_NAME;
  const existingBucket = spawnSync(cf, ["r2", "buckets", "get", bucketName], { stdio: "ignore", env: process.env });
  if (existingBucket.status !== 0) {
    const created = spawnSync(cf, ["r2", "buckets", "create-by-name", bucketName], { stdio: "inherit", env: process.env });
    if (created.error) throw created.error;
    if (created.status !== 0) throw new Error(`Could not create the private R2 bucket ${bucketName}.`);
  }

  const buildEnv = { ...process.env };
  for (const name of secretNames) delete buildEnv[name];
  run(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build:cloudflare"], buildEnv);

  const secretDir = await mkdtemp(join(tmpdir(), "small-goals-deploy-"));
  try {
    const secretsPath = join(secretDir, "secrets.json");
    await writeFile(secretsPath, JSON.stringify(Object.fromEntries(secretNames.map((name) => [name, process.env[name]]))));
    await chmod(secretsPath, 0o600).catch(() => undefined);
    run(cf, ["deploy", "--prebuilt", "--secrets-file", secretsPath]);
  } finally {
    await rm(secretDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Deployment failed."}\n`);
  process.exitCode = 1;
});
