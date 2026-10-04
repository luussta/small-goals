# Small Goals

A tiny personal task system built around **section → goal → exact checklist**.

Small Goals is a quiet page for Today, This Week, This Month, and Milestones. Black means not started, orange means currently in progress, and green means every checklist item is done.

## Philosophy

This deliberately does not try to be Notion, Linear, Todoist, or Asana. It models only:

```text
Section → Goal → Items required to finish the goal
```

There are no accounts, dashboards, priorities, dates, tags, or extra views.

A new workspace starts with the four empty sections and a brief guide. Create your own goals and checklist items; no sample tasks are added.

## Quick start

Requirements: Node.js 22.18 or newer. The default installation deploys to the cloud; it does not start a local-only app.

```sh
git clone https://github.com/luussta/small-goals.git
cd small-goals
npm install
npm run setup
```

The setup wizard asks for your name and a browser password, then defaults to Cloudflare Workers (choose Vercel if preferred). It displays the planned cloud resources and the global Codex installation, then waits for your approval. After approval it starts provider sign-in if needed, deploys the app, verifies it, and installs the Small Goals skill and MCP globally for the current Codex user. You may need to finish provider authorization in the browser that opens.

## Optional local development

Use this only when you want a local development server. Local data is stored at `.small-goals/workspace.json` and does not sync to the cloud.

```sh
cp .env.example .env.local
npm run generate-token
```

Put the generated token and a separate browser password in `.env.local`, then run:

```sh
npm run storage:init
npm run dev
```

Open http://localhost:3000. `APP_NAME` sets the header text. Local workspace data stays in the ignored `.small-goals/` directory.

## Deploy your own

The setup wizard is the default install path described above. It asks for your name and browser password, generates the agent token, then shows a resource summary and waits for your approval before signing into the provider, creating private storage, and deploying. If provider login is needed, the wizard launches that login flow for you; you complete the provider's secure authorization in its browser window.

```sh
npm run setup
```

Or choose a provider non-interactively:

```sh
npm run setup -- --provider cloudflare
npm run setup -- --provider vercel
```

The wizard creates private Cloudflare R2 storage for Workers or a private Vercel Blob store for Vercel. It installs the skill at `$CODEX_HOME/skills/small-goals` and a standalone MCP runtime under `$CODEX_HOME/small-goals-mcp`, then registers `small-goals` in the user's global Codex MCP configuration. The generated token and deployment URL are saved with restrictive permissions (owner-only on POSIX) under `$CODEX_HOME/small-goals/`, outside the repository and outside Codex's TOML configuration. The global install is available across that user's projects and threads. Neither provider requires Neon or another database.

- **Vercel:** [deployment guide](docs/DEPLOY_VERCEL.md)
- **Cloudflare Workers:** [deployment guide](docs/DEPLOY_CLOUDFLARE.md)
- **Agent deployment checklist:** [docs/AGENT_DEPLOYMENT.md](docs/AGENT_DEPLOYMENT.md)

## Let an AI agent use it

The authenticated API is rooted at `/api/agent`. `GET /api/agent/state` reads the full workspace; all API reads and writes require `Authorization: Bearer <AGENT_API_TOKEN>`. See [the API reference](docs/AGENT_API.md).

The repository includes a stdio MCP server in `mcp/server.ts` and an operating guide at [skills/small-goals/SKILL.md](skills/small-goals/SKILL.md). The setup wizard actually installs both into the Codex user's global environment. To install the connection separately after deploying, use `npm run install:codex-global` with `SMALL_GOALS_URL` and `SMALL_GOALS_TOKEN` set in that process environment. Details are in [mcp/README.md](mcp/README.md).

The browser and agent API use the same server-side workspace. Browser access has a separate password gate (`APP_ACCESS_PASSWORD`); the agent token is never sent to browser code.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `APP_NAME` | Yes in deployment | Personal name shown in the header. |
| `OWNER_NAME` | No | Optional owner label. |
| `AGENT_API_TOKEN` | Yes | Generated bearer token for the server-side agent API. |
| `APP_ACCESS_PASSWORD` | Yes | Separate password for browser access. |
| `BLOB_READ_WRITE_TOKEN` | Vercel only | Private Blob credential; the setup wizard connects it automatically. |
| `DEPLOYMENT_URL` | Remote verification | Base URL for `npm run verify:remote`. |
| `SMALL_GOALS_URL` | Global MCP installer | Deployed app URL; setup passes it privately to the installer. |
| `SMALL_GOALS_TOKEN` | Global MCP installer | Agent token; setup passes it privately and saves it in the private Codex home data directory. |
| `CODEX_HOME` | Optional | Override Codex's user-global config and skill home for setup. |

Cloudflare storage is attached as a private R2 bucket binding and does not require a database URL. See [.env.example](.env.example). Never prefix secrets with `NEXT_PUBLIC_`.

## Security

The browser uses one password and a signed, HTTP-only, same-site cookie with a one-year lifetime, so the browser remembers its login without storing the password. The API uses a separate server-side bearer token with constant-time comparison. Agent reads and writes require authentication; browser writes require a session and same-origin checks. Inputs are validated and API errors do not include credentials. The setup wizard stores the MCP token outside the repository under `$CODEX_HOME/small-goals/agent-token` with restrictive permissions (owner-only on POSIX). The global MCP config contains only a command and file paths, never the token. Do not put secrets in Git, client bundles, URLs, configuration files, or logs.

## Repository map

- `src/app/` — one-page UI and Next.js route handlers
- `src/lib/` — workspace validation, seed data, auth, and provider/local JSON storage
- `src/lib/storage/` — local file and Cloudflare R2 adapters
- `scripts/` — setup wizard, token generation, storage initialization, verification, deployment
- `mcp/` — stdio MCP client and standalone global runtime package
- `skills/small-goals/` — reusable agent operating instructions
- `cloudflare.config.ts`, `vite.config.ts` — Cloudflare Worker configuration
- `docs/` — deployment, API, and agent runbooks

## Commands

`npm run setup`, `npm run bootstrap`, `npm run install:codex-global`, `npm run dev`, `npm run build`, `npm run lint`, `npm run typecheck`, `npm run generate-token`, `npm run storage:init`, `npm run verify`, `npm run verify:remote`, `npm run deploy:vercel`, `npm run dev:vinext`, `npm run build:vinext`, `npm run start:vinext`, `npm run build:cloudflare`, `npm run preview:cloudflare`, `npm run deploy:cloudflare`, `npm run mcp`.

`npm run verify` checks local secrets and validates the local workspace file. `npm run verify:remote` checks the deployed page and authenticated state read; add `-- --write` to create and clean up a temporary goal and item.

## License

MIT. See [LICENSE](LICENSE).
