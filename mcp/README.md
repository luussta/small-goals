# Small Goals MCP server

This repository includes a stdio MCP server. It is a small authenticated client for a deployed Small Goals workspace; it does not store workspace data itself. `npm run setup` installs this server and the Small Goals skill for the current Codex user, not just in the repository checkout.

## Automatic global Codex install

After cloud deployment approval and successful API verification, setup automatically:

- copies the skill to `$CODEX_HOME/skills/small-goals` (normally `~/.codex/skills/small-goals`);
- installs a standalone MCP runtime under `$CODEX_HOME/small-goals-mcp`, so it keeps working if the repository checkout is moved or deleted;
- stores the deployed URL and token in `$CODEX_HOME/small-goals` with restrictive permissions (owner-only on POSIX); and
- registers a global `small-goals` MCP entry using `codex mcp add`, making it available to other Codex projects and threads.

The token is not embedded in `config.toml`, printed, or stored in the repository. Restart Codex or start a new thread if its MCP list does not refresh immediately. An existing unmanaged global skill/server with the same name is preserved; setup stops with a clear conflict message instead of overwriting it.

To run the global installer separately after deployment, provide the deployed URL and token through the process environment to `npm run install:codex-global`. The command requires the Codex CLI and an HTTPS deployment URL.

## Requirements

- Node.js 22.18 or newer (matches the repository runtime requirement)
- A deployed Small Goals URL
- The deployment's `AGENT_API_TOKEN`

## Run locally

From the repository root, start it with:

```sh
SMALL_GOALS_URL="https://your-small-goals.example" \
SMALL_GOALS_TOKEN="<agent-token>" \
npm run mcp
```

The environment variables must be supplied by the MCP host's private environment/secret store. Do not commit the token. `SMALL_GOALS_TOKEN` is sent as a bearer token to the configured same deployment origin; use an HTTPS URL in production.

## Example MCP client configuration

Generic JSON shape (adapt the environment syntax to the client; do not paste real credentials into a committed project file):

```json
{
  "mcpServers": {
    "small-goals": {
      "command": "npm",
      "args": ["run", "--silent", "mcp"],
      "cwd": "/absolute/path/to/small-goals",
      "env": {
        "SMALL_GOALS_URL": "https://your-small-goals.example",
        "SMALL_GOALS_TOKEN": "<store in the MCP host's secret manager>"
      }
    }
  }
}
```

Use your MCP client's secure environment-variable mechanism for the token. If the client stores configuration in a plain-text file, keep that file outside version control and restrict its permissions.

## Tools

The server exposes tools to read the full workspace, list Today/sections/goals, inspect a goal, add/update/move/delete goals, set a goal active, add/update/reorder/complete/uncomplete/delete checklist items, and create a custom section. Tool descriptions explain ID usage, derived completion, and destructive actions. Responses are compact JSON.

Authentication failures, offline deployments, invalid IDs, and API validation errors are returned as useful tool errors. The server never prints the token or authorization header. Read [../docs/AGENT_API.md](../docs/AGENT_API.md) for the HTTP contract.
