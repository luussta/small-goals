# Small Goals

A tiny personal task system built around **section → goal → exact checklist**.

It is a quiet single page for Today, This Week, This Month, and Milestones. Black means not started, orange means currently in progress, and green means every checklist item is done. The interface stays intentionally small: no accounts, dashboards, priorities, tags, or calendar.

## Philosophy

Small Goals is not trying to be Notion, Linear, Todoist, or Asana. It models only:

```
Section
└── Goal
    └── Items required to finish the goal
```

The app is personal and single-workspace. A small shared Postgres JSON document is the canonical state for both the web UI and authenticated agent API.

## Quick start

Requirements: Node.js 22.18 or newer and a Neon Postgres database. Cloudflare's typed CLI requires this version; the app itself uses standard Next.js on Vercel.

```sh
git clone <repository-url>
cd small-goals
npm install
cp .env.example .env.local
npm run generate-token
```

Set `APP_NAME`, `DATABASE_URL`, `AGENT_API_TOKEN`, and `APP_ACCESS_PASSWORD` in `.env.local`. `APP_ACCESS_PASSWORD` protects the browser UI; keep it different from the agent token. Initialize the one-row workspace and start Next.js:

```sh
npm run db:migrate
npm run dev
```

Open http://localhost:3000. The starter workspace is inserted once; running migration again preserves its goals.

## Deploy your own

- **Vercel:** [docs/DEPLOY_VERCEL.md](docs/DEPLOY_VERCEL.md)
- **Cloudflare Workers:** [docs/DEPLOY_CLOUDFLARE.md](docs/DEPLOY_CLOUDFLARE.md)
- **Agent-driven deployment checklist:** [docs/AGENT_DEPLOYMENT.md](docs/AGENT_DEPLOYMENT.md)

The app now needs a server runtime and Postgres. The old static Cloudflare Pages export is intentionally removed. Cloudflare deployments use Workers with vinext's Next.js-compatible runtime; the existing `src/app` UI and route handlers stay in place.

## Let an AI agent use it

The private bearer-token API is rooted at `/api/agent`. Its read endpoint is `GET /api/agent/state`; all reads and writes require `Authorization: Bearer <AGENT_API_TOKEN>`. See [the API reference](docs/AGENT_API.md).

The repository includes a stdio MCP server in `mcp/server.ts` and an agent operating guide at [skills/small-goals/SKILL.md](skills/small-goals/SKILL.md). Configure an MCP client with `SMALL_GOALS_URL` and `SMALL_GOALS_TOKEN`; examples are in [mcp/README.md](mcp/README.md).

The browser and MCP tools call the same server-side state. Browser UI access has a separate single-password gate (`APP_ACCESS_PASSWORD`); agent API credentials never enter browser JavaScript.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `APP_NAME` | Yes | Personal name shown in the app header; seeded into the workspace at migration time. |
| `OWNER_NAME` | No | Optional owner label for external setup or future copy. |
| `DATABASE_URL` | Yes | Neon Postgres connection string; server-side secret. |
| `AGENT_API_TOKEN` | Yes | Strong bearer token for the agent API; server-side secret. |
| `APP_ACCESS_PASSWORD` | Yes | Separate browser password; stored only as a deployment secret. |
| `DEPLOYMENT_URL` | Remote verify | Base URL used by `npm run verify:remote`. |
| `SMALL_GOALS_URL` | MCP | Deployed app base URL used by the MCP process. |
| `SMALL_GOALS_TOKEN` | MCP | Agent API token supplied to the local MCP process. |

See [.env.example](.env.example). Never prefix secrets with `NEXT_PUBLIC_`.

## Security

There are no user accounts or multi-tenant features. The browser uses a single password and a signed, HTTP-only, same-site cookie. The agent API uses a separate server-side bearer token with constant-time comparison. Every agent route, including reads, requires the token; browser write requests require the session and same-origin checks. Inputs are validated, request bodies are limited, and API errors do not include credentials. Do not put secrets in the repository, client bundle, URLs, MCP config committed to Git, or logs.

## Repository map

- `src/app/` — one-page UI and Next.js route handlers
- `src/lib/` — workspace types, validation, seed data, auth, and Postgres access
- `db/migrations/` — the small workspace table
- `scripts/` — token generation, schema initialization, local and remote verification
- `mcp/` — local stdio MCP client for a deployed workspace
- `skills/small-goals/` — reusable agent operating instructions
- `cloudflare.config.ts`, `vite.config.ts` — Cloudflare Worker build/deploy configuration for vinext
- `docs/` — deployment, API, and agent runbooks

## Commands

`npm run setup`, `npm run dev`, `npm run build`, `npm run lint`, `npm run typecheck`, `npm run generate-token`, `npm run db:migrate`, `npm run verify`, `npm run verify:remote`, `npm run deploy:vercel`, `npm run dev:vinext`, `npm run build:vinext`, `npm run start:vinext`, `npm run build:cloudflare`, `npm run preview:cloudflare`, `npm run deploy:cloudflare`, `npm run mcp`.

`npm run verify` checks required app secrets plus database connectivity and workspace initialization. `verify:remote` checks public response and authenticated state read; add `-- --write` to create and always clean up a temporary goal/item while checking writes.

## License

MIT. See [LICENSE](LICENSE).
