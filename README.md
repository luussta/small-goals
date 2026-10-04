# Small Goals

A tiny personal task system built around **section → goal → exact checklist**.

Small Goals is a quiet page for Today, This Week, This Month, and Milestones. Black means not started, orange means currently in progress, and green means every checklist item is done.

## Philosophy

This deliberately does not try to be Notion, Linear, Todoist, or Asana. It models only:

```text
Section → Goal → Items required to finish the goal
```

There are no accounts, dashboards, priorities, dates, tags, or extra views.

## Quick start

Requirements: Node.js 22.18 or newer. The default installation deploys to the cloud; it does not start a local-only app.

```sh
git clone https://github.com/luussta/small-goals.git
cd small-goals
npm install
npm run setup
```

The setup wizard asks for your name and a browser password, then defaults to Cloudflare Workers (choose Vercel if preferred). It displays the planned cloud resources and waits for your approval. After approval it starts provider sign-in if needed, deploys the app, and verifies it. You may need to finish provider authorization in the browser that opens.

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

The wizard creates private Cloudflare R2 storage for Workers or a private Vercel Blob store for Vercel. It keeps the generated token in a permission-restricted `.small-goals/agent-token` file that Git ignores, for later MCP configuration. Neither provider requires Neon or another database.

- **Vercel:** [deployment guide](docs/DEPLOY_VERCEL.md)
- **Cloudflare Workers:** [deployment guide](docs/DEPLOY_CLOUDFLARE.md)
- **Agent deployment checklist:** [docs/AGENT_DEPLOYMENT.md](docs/AGENT_DEPLOYMENT.md)

## Let an AI agent use it

The authenticated API is rooted at `/api/agent`. `GET /api/agent/state` reads the full workspace; all API reads and writes require `Authorization: Bearer <AGENT_API_TOKEN>`. See [the API reference](docs/AGENT_API.md).

The repository includes a stdio MCP server in `mcp/server.ts` and an operating guide at [skills/small-goals/SKILL.md](skills/small-goals/SKILL.md). Configure an MCP client with `SMALL_GOALS_URL` and `SMALL_GOALS_TOKEN`; examples are in [mcp/README.md](mcp/README.md).

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
| `SMALL_GOALS_URL` | MCP | Deployed app URL provided to the MCP process. |
| `SMALL_GOALS_TOKEN` | MCP | Agent token provided to the local MCP process. |

Cloudflare storage is attached as a private R2 bucket binding and does not require a database URL. See [.env.example](.env.example). Never prefix secrets with `NEXT_PUBLIC_`.

## Security

The browser uses one password and a signed, HTTP-only, same-site cookie with a one-year lifetime, so the browser remembers its login without storing the password. The API uses a separate server-side bearer token with constant-time comparison. Agent reads and writes require authentication; browser writes require a session and same-origin checks. Inputs are validated and API errors do not include credentials. The setup wizard stores the token in the ignored, permission-restricted `.small-goals/agent-token` file. Do not put secrets in Git, client bundles, URLs, MCP config committed to Git, or logs.

## Repository map

- `src/app/` — one-page UI and Next.js route handlers
- `src/lib/` — workspace validation, seed data, auth, and provider/local JSON storage
- `src/lib/storage/` — local file and Cloudflare R2 adapters
- `scripts/` — setup wizard, token generation, storage initialization, verification, deployment
- `mcp/` — local stdio MCP client
- `skills/small-goals/` — reusable agent operating instructions
- `cloudflare.config.ts`, `vite.config.ts` — Cloudflare Worker configuration
- `docs/` — deployment, API, and agent runbooks

## Commands

`npm run setup`, `npm run bootstrap`, `npm run dev`, `npm run build`, `npm run lint`, `npm run typecheck`, `npm run generate-token`, `npm run storage:init`, `npm run verify`, `npm run verify:remote`, `npm run deploy:vercel`, `npm run dev:vinext`, `npm run build:vinext`, `npm run start:vinext`, `npm run build:cloudflare`, `npm run preview:cloudflare`, `npm run deploy:cloudflare`, `npm run mcp`.

`npm run verify` checks local secrets and validates the local workspace file. `npm run verify:remote` checks the deployed page and authenticated state read; add `-- --write` to create and clean up a temporary goal and item.

## License

MIT. See [LICENSE](LICENSE).
