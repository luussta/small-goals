import { chmod, cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const codexHome = resolve(process.env.CODEX_HOME || join(homedir(), ".codex"));
const dataDirectory = join(codexHome, "small-goals");
const runtimeDirectory = join(codexHome, "small-goals-mcp");
const skillDirectory = join(codexHome, "skills", "small-goals");
const markerName = ".small-goals-managed";
const markerContents = "Managed by the Small Goals setup installer.\n";
const url = process.env.SMALL_GOALS_URL?.trim();
const token = process.env.SMALL_GOALS_TOKEN?.trim();
const codexCommand = process.env.CODEX_CLI || (process.platform === "win32" ? "codex.cmd" : "codex");
const relativeCodexHome = relative(repository, codexHome);

if (relativeCodexHome === "" || (!isAbsolute(relativeCodexHome) && relativeCodexHome !== ".." && !relativeCodexHome.startsWith(`..${sep}`))) {
  throw new Error("CODEX_HOME must be outside the repository so the skill, MCP, and agent token are installed globally and stay out of Git.");
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: "utf8", ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "").trim();
    throw new Error(`${command} exited with status ${result.status ?? "unknown"}${detail ? `: ${detail}` : ""}`);
  }
  return result.stdout || "";
}

function findServerEntry(value, name) {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findServerEntry(item, name);
      if (found !== null) return found;
    }
    return null;
  }
  if (!value || typeof value !== "object") return null;
  if (Object.hasOwn(value, name)) return value[name];
  if (value.name === name) return value;
  for (const item of Object.values(value)) {
    const found = findServerEntry(item, name);
    if (found !== null) return found;
  }
  return null;
}

async function prepareManagedDirectory(path) {
  let isManaged = false;
  try {
    await readFile(join(path, markerName), "utf8");
    isManaged = true;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  if (isManaged) {
    await rm(path, { recursive: true, force: true });
  } else {
    let exists = true;
    try {
      await stat(path);
    } catch (pathError) {
      if (pathError?.code === "ENOENT") exists = false;
      else throw pathError;
    }
    if (exists && path === skillDirectory) {
      const existing = await readFile(join(path, "SKILL.md"), "utf8").catch((error) => {
        if (error?.code === "ENOENT") return null;
        throw error;
      });
      const incoming = await readFile(join(repository, "skills", "small-goals", "SKILL.md"), "utf8");
      if (existing === incoming) return false;
    }
    if (exists) throw new Error(`Refusing to overwrite an existing, unmanaged path: ${path}`);
  }
  await mkdir(path, { recursive: true, mode: 0o700 });
  return true;
}

async function installSkill() {
  const shouldCopy = await prepareManagedDirectory(skillDirectory);
  if (!shouldCopy) return;
  await cp(join(repository, "skills", "small-goals"), skillDirectory, { recursive: true });
  await writeFile(join(skillDirectory, markerName), markerContents, { mode: 0o600 });
}

async function installMcp() {
  const shouldInstall = await prepareManagedDirectory(runtimeDirectory);
  if (!shouldInstall) return;
  await cp(join(repository, "mcp", "server.ts"), join(runtimeDirectory, "server.ts"));
  await cp(join(repository, "mcp", "launch.mjs"), join(runtimeDirectory, "launch.mjs"));
  await cp(join(repository, "mcp", "package.json"), join(runtimeDirectory, "package.json"));
  await cp(join(repository, "mcp", "package-lock.json"), join(runtimeDirectory, "package-lock.json"));
  await writeFile(join(runtimeDirectory, markerName), markerContents, { mode: 0o600 });
  run("npm", ["ci", "--prefix", runtimeDirectory, "--omit=dev", "--no-audit", "--no-fund"]);
}

function registerMcp() {
  const list = run(codexCommand, ["mcp", "list", "--json"]);
  let parsedList;
  try {
    parsedList = JSON.parse(list);
  } catch {
    throw new Error("Codex returned invalid JSON while checking global MCP registrations. No existing entry was changed.");
  }
  const existing = findServerEntry(parsedList, "small-goals");
  if (existing !== null) {
    const launcher = join(runtimeDirectory, "launch.mjs");
    const escapedLauncher = JSON.stringify(launcher).slice(1, -1);
    if (!JSON.stringify(existing).includes(escapedLauncher)) {
      throw new Error(`A Codex MCP server named small-goals already exists and is not managed by this installer. Rename or remove that entry, then rerun setup. No existing entry was changed.`);
    }
    run(codexCommand, ["mcp", "remove", "small-goals"]);
  }
  run(codexCommand, ["mcp", "add", "small-goals", "--", process.execPath, join(runtimeDirectory, "launch.mjs"), dataDirectory]);
}

if (!url || !token) throw new Error("SMALL_GOALS_URL and SMALL_GOALS_TOKEN are required to install the global Codex connection.");
let parsedUrl;
try {
  parsedUrl = new URL(url);
} catch {
  throw new Error("SMALL_GOALS_URL must be a valid HTTPS URL.");
}
if (parsedUrl.protocol !== "https:") throw new Error("The global MCP installer only accepts an HTTPS deployment URL.");
if (token.length < 32) throw new Error("SMALL_GOALS_TOKEN is too short to be a valid agent access token.");

await mkdir(codexHome, { recursive: true, mode: 0o700 });
await chmod(codexHome, 0o700).catch(() => undefined);
await installSkill();
await installMcp();
await mkdir(dataDirectory, { recursive: true, mode: 0o700 });
await writeFile(join(dataDirectory, "deployment-url"), `${url}\n`, { encoding: "utf8", mode: 0o600 });
await writeFile(join(dataDirectory, "agent-token"), `${token}\n`, { encoding: "utf8", mode: 0o600 });
await chmod(dataDirectory, 0o700).catch(() => undefined);
await chmod(join(dataDirectory, "deployment-url"), 0o600).catch(() => undefined);
await chmod(join(dataDirectory, "agent-token"), 0o600).catch(() => undefined);
registerMcp();
process.stdout.write(`Installed Small Goals skill globally at ${skillDirectory}\n`);
process.stdout.write(`Registered the Small Goals MCP globally in the Codex user configuration.\n`);
process.stdout.write(`Private deployment details are stored in ${dataDirectory} with owner-only permissions.\n`);
