import { randomBytes } from "node:crypto";
import { chmod, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const args = process.argv.slice(2);
const providerArg = args.find((arg) => arg.startsWith("--provider="))?.split("=")[1]
  ?? (args.includes("--provider") ? args[args.indexOf("--provider") + 1] : undefined);
const run = (command, commandArgs, options = {}) => spawnSync(command, commandArgs, { stdio: "inherit", ...options });
const safeOutput = (output, secrets = []) => secrets.reduce((text, secret) => secret ? text.split(secret).join("[redacted]") : text, output);

function runCaptured(command, commandArgs, options = {}, secrets = []) {
  const result = spawnSync(command, commandArgs, { encoding: "utf8", ...options });
  if (result.stdout) stdout.write(safeOutput(result.stdout, secrets));
  if (result.stderr) process.stderr.write(safeOutput(result.stderr, secrets));
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited with status ${result.status ?? "unknown"}.`);
  return `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
}

async function hiddenInput(label) {
  if (!stdin.isTTY || !stdin.setRawMode) throw new Error("Run npm run setup from an interactive terminal so the browser password can be entered without echoing it.");
  stdout.write(label);
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding("utf8");
  return new Promise((resolve, reject) => {
    let value = "";
    const onData = (chunk) => {
      for (const char of chunk) {
        if (char === "\u0003") {
          stdin.off("data", onData);
          stdin.setRawMode(false);
          stdout.write("\n");
          reject(new Error("Setup cancelled."));
          return;
        }
        if (char === "\r" || char === "\n") {
          stdin.off("data", onData);
          stdin.setRawMode(false);
          stdout.write("\n");
          resolve(value);
          return;
        }
        if (char === "\u007f" || char === "\b") {
          value = value.slice(0, -1);
          continue;
        }
        value += char;
      }
    };
    stdin.on("data", onData);
  });
}

function slug(value) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 28) || "personal";
}

function deploymentUrl(output, suffix) {
  const urls = output.match(/https:\/\/[a-zA-Z0-9.-]+/g) ?? [];
  return urls.find((url) => url.endsWith(suffix)) ?? null;
}

async function chooseProvider(rl) {
  if (providerArg && ["vercel", "cloudflare"].includes(providerArg)) return providerArg;
  if (providerArg) throw new Error("Use --provider vercel or --provider cloudflare.");
  const answer = await rl.question("Deploy to [1] Cloudflare Workers or [2] Vercel? [1] ");
  return answer.trim() === "2" ? "vercel" : "cloudflare";
}

async function confirmApproval(rl, name, provider, resource) {
  stdout.write("\nSetup summary\n");
  stdout.write(`  App name: ${name}\n  Provider: ${provider}\n  Storage: private ${resource}\n  Credentials: a generated agent token and your browser password\n\n`);
  stdout.write("This will create provider resources and deploy the app. Storage or hosting usage may be billed by your provider.\n");
  return (await rl.question("Approve resource creation and deployment? [y/N] ")).trim().toLowerCase() === "y";
}

async function saveAgentToken(token) {
  const directory = join(process.cwd(), ".small-goals");
  const tokenPath = join(directory, "agent-token");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await writeFile(tokenPath, `${token}\n`, { encoding: "utf8", mode: 0o600 });
  await chmod(directory, 0o700).catch(() => undefined);
  await chmod(tokenPath, 0o600).catch(() => undefined);
  return tokenPath;
}

async function ensureAuth(provider) {
  if (provider === "vercel") {
    if (run(npx, ["--yes", "vercel", "whoami"], { stdio: "ignore" }).status !== 0) {
      runCaptured(npx, ["--yes", "vercel", "login"]);
    }
    runCaptured(npx, ["--yes", "vercel", "whoami"]);
  } else {
    if (run(npx, ["--yes", "cf", "auth", "whoami"], { stdio: "ignore" }).status !== 0) {
      runCaptured(npx, ["--yes", "cf", "auth", "login"]);
    }
    runCaptured(npx, ["--yes", "cf", "auth", "whoami"]);
  }
}

async function deployCloudflare(values) {
  const bucket = values.bucketName;
  const get = spawnSync(npx, ["--yes", "cf", "r2", "buckets", "get", bucket], { encoding: "utf8" });
  if (get.status !== 0) runCaptured(npx, ["--yes", "cf", "r2", "buckets", "create-by-name", bucket]);
  const output = runCaptured("npm", ["run", "deploy:cloudflare"], {
    env: {
      ...process.env,
      APP_NAME: values.name,
      AGENT_API_TOKEN: values.agentToken,
      APP_ACCESS_PASSWORD: values.password,
      SMALL_GOALS_BUCKET_NAME: bucket,
      SMALL_GOALS_WORKER_NAME: values.workerName,
    },
  }, [values.agentToken, values.password]);
  return deploymentUrl(output, ".workers.dev");
}

async function deployVercel(values) {
  const projectName = values.projectName;
  const storeName = `${projectName}-data`;
  runCaptured(npx, ["--yes", "vercel", "project", "create", projectName]);
  runCaptured(npx, ["--yes", "vercel", "link", "--yes", "--project", projectName]);
  runCaptured(npx, ["--yes", "vercel", "blob", "create-store", storeName, "--access", "private", "--yes", "--environment", "production"]);

  const addEnv = (key, value, visibility) => {
    runCaptured(npx, ["--yes", "vercel", "env", "add", key, "production", "--visibility", visibility], { input: `${value}\n` }, [value]);
  };
  addEnv("APP_NAME", values.name, "config");
  addEnv("OWNER_NAME", values.ownerName, "config");
  addEnv("AGENT_API_TOKEN", values.agentToken, "secret");
  addEnv("APP_ACCESS_PASSWORD", values.password, "secret");

  const output = runCaptured(npx, ["--yes", "vercel", "--prod"], {}, [values.agentToken, values.password]);
  return deploymentUrl(output, ".vercel.app");
}

async function main() {
  const namePrompt = createInterface({ input: stdin, output: stdout });
  const ownerName = (await namePrompt.question("What's your name? ")).trim();
  namePrompt.close();
  if (!ownerName || ownerName.length > 100) throw new Error("Enter a name between 1 and 100 characters.");
  const name = `${ownerName}'s Small Goals`;

  let password = await hiddenInput("Choose a browser password (12+ characters; input hidden): ");
  while (password.length < 12 || password.length > 200) {
    stdout.write("Use a password between 12 and 200 characters.\n");
    password = await hiddenInput("Browser password: ");
  }

  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const provider = await chooseProvider(rl);
    const suffix = randomBytes(3).toString("hex");
    const identifier = `${slug(name)}-${suffix}`;
    const values = {
      name,
      ownerName,
      password,
      provider,
      agentToken: randomBytes(32).toString("base64url"),
      projectName: `small-goals-${identifier}`,
      bucketName: `small-goals-${identifier}`,
      workerName: `small-goals-${identifier}`,
    };

    const resource = provider === "vercel"
      ? `Vercel project ${values.projectName} and private Blob store ${values.projectName}-data`
      : `Cloudflare Worker ${values.workerName} and private R2 bucket ${values.bucketName}`;
    const approved = await confirmApproval(rl, name, provider, resource);
    if (!approved) {
      stdout.write("No project or storage resources were created, and nothing was deployed.\n");
      return;
    }

    await ensureAuth(provider);
    const tokenPath = await saveAgentToken(values.agentToken);
    const url = provider === "vercel" ? await deployVercel(values) : await deployCloudflare(values);
    if (!url) throw new Error("Deployment finished, but its URL could not be detected from the provider output. Set DEPLOYMENT_URL and run npm run verify:remote.");
    runCaptured("node", ["scripts/verify-remote.mjs", "--write"], {
      env: { ...process.env, DEPLOYMENT_URL: url, AGENT_API_TOKEN: values.agentToken },
    }, [values.agentToken]);
    stdout.write(`\nDeployment complete\nApp: ${url}\nName: ${name}\nProvider: ${provider === "vercel" ? "Vercel" : "Cloudflare Workers"}\nAgent API: verified\n`);
    stdout.write(`The agent token is stored as a provider secret and in the Git-ignored file ${tokenPath}. Keep that file and your browser password safe.\n`);
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Setup failed."}\n`);
  process.exitCode = 1;
});
