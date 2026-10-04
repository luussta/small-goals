# Small Goals MCP server

This repository includes a local stdio MCP server. It is a small authenticated client for a deployed Small Goals workspace; it does not store workspace data itself.

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
