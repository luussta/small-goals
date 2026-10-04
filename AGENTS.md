<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Small Goals coding-agent guide

Small Goals is a personal, single-page Next.js task app. Its only product model is **section → goal → checklist items**. Black means not started, orange means active work, and green means all non-empty checklist items are done. Keep the UI quiet and implementation understandable. Do not add accounts, teams, billing, priorities, dates, tags, dashboards, extra views, or localStorage persistence.

## Architecture

- Next.js App Router, TypeScript, Tailwind, Inter.
- `src/app/page.tsx` is the client UI. It reads and writes `/api/workspace`.
- `src/app/api/agent/[[...path]]/route.ts` is the stable-ID REST API used by MCP. Every operation requires `Authorization: Bearer $AGENT_API_TOKEN`.
- `src/lib/db.ts` chooses one JSON storage adapter: Cloudflare R2 binding on Workers, private Vercel Blob on Vercel, or a local JSON file at `.small-goals/workspace.json` during local development. There is no database or browser storage.
- Workspace writes use entity tags/compare-and-swap where supported and retries on conflict. `src/lib/model.ts` validates the complete workspace. Goal completion is derived: a non-empty list with every item completed is Done, and a completed goal cannot remain active.
- The browser UI has one `APP_ACCESS_PASSWORD` login and a signed HTTP-only session cookie. It is separate from, and never receives, the agent token.
- Vercel uses standard Next.js. Cloudflare Workers uses the vinext compatibility runtime for the same App Router source. Do not restore `output: "export"` because API routes and private storage need a server runtime.
- `mcp/server.ts` is a local stdio MCP client. `skills/small-goals/SKILL.md` teaches an agent how to operate it.

## Default first install: deploy to the cloud

When a user says to install or set up Small Goals, the default is a cloud deployment, not a local development server:

1. Run `npm install` (Node.js 22.18+).
2. Run `npm run setup` in an interactive terminal. It asks for the person's name and a browser password, defaults to Cloudflare Workers, generates the agent token, and displays the cloud resources it will create.
3. Ask for approval at the setup prompt. After approval, the wizard starts provider login if needed, provisions private storage, deploys, and verifies the remote app and agent API. The user may need to complete Cloudflare/Vercel authorization in the provider's browser flow.
4. Give the user the cloud URL. Do not start `npm run dev` or switch to local storage unless the user explicitly requests local development.

An explicit provider can be selected with `npm run setup -- --provider cloudflare` or `npm run setup -- --provider vercel`. Setup always deploys remotely; it never falls back to a local-only installation.

## Optional local development

Only use this flow when the user asks to work locally:

1. Copy `.env.example` to `.env.local`; set `APP_NAME`, `AGENT_API_TOKEN`, and `APP_ACCESS_PASSWORD`.
2. Run `npm run storage:init` to seed `.small-goals/workspace.json`.
3. Run `npm run dev` and open http://localhost:3000.

Useful commands: `npm run setup`, `npm run dev`, `npm run build`, `npm run lint`, `npm run typecheck`, `npm run generate-token`, `npm run storage:init`, `npm run verify`, `npm run verify:remote`, `npm run deploy:vercel`, `npm run build:cloudflare`, `npm run preview:cloudflare`, `npm run deploy:cloudflare`, `npm run mcp`.

`npm run verify` checks local secrets and validates the local workspace file. `npm run verify:remote` needs `DEPLOYMENT_URL` and `AGENT_API_TOKEN`; pass `-- --write` to exercise and clean up a temporary goal and item.

## Persisted data

The entire `Workspace` JSON document is stored as a single object/file. No SQL, migration, database service, browser storage, external state manager, or separate task table exists. `src/lib/seed.ts` supplies first-run data. The web UI and agent API must read and update the same document and expose stable IDs.

## Personalize a deployment

Set `APP_NAME="Lucio's Small Goals"` in the provider environment; source edits are unnecessary. `OWNER_NAME` is optional. Generate the API secret with `npm run generate-token` and choose a separate browser password. The built-in setup wizard does both automatically. Keep all secrets in provider secret storage, never in `NEXT_PUBLIC_*`, committed files, URLs, or logs.

## Deploy a personal instance

When asked to deploy a personal instance:

1. Clone/install the repository.
2. Run `npm run setup` as the default install path. It chooses Cloudflare Workers unless the user selects Vercel; an explicit provider can be passed with `--provider`.
3. The wizard asks for the user's name and hidden browser password, generates an agent token, and displays the cloud deployment plan.
4. Review the displayed provider resource and deployment summary. Do not proceed until the user explicitly approves it. After approval, the wizard launches provider CLI login if required (the user completes provider authorization in the provider's browser), creates private Vercel Blob or Cloudflare R2 storage, configures provider secrets, saves the generated agent token to the Git-ignored `.small-goals/agent-token`, deploys to the cloud, and runs remote read/write verification. Setup never starts a local-only installation.
5. Configure the MCP client as described in `mcp/README.md`, if permitted. Never print or commit the token.
6. Report the deployment URL, name, provider, verification result, MCP state, and remind the user to retain their password and token securely.

There is no Neon/Postgres requirement. Read `docs/AGENT_DEPLOYMENT.md` for the detailed runbook. Do not redeploy an unrelated provider project or delete unrelated resources.

## API and MCP

Start with `GET /api/agent/state`. Other routes are documented in `docs/AGENT_API.md`. MCP tool names begin `small_goals_`; input descriptions and stable IDs are authoritative. Use MCP when available rather than editing storage directly.

## Important files and boundaries

- `src/app/page.tsx`, `src/app/globals.css`: existing product UI; improve interactions/accessibility without redesigning it.
- `src/lib/model.ts`, `src/lib/db.ts`, `src/lib/auth.ts`: validation, storage, and security boundaries.
- `src/lib/storage/`: local and Cloudflare storage adapters.
- `cloudflare.config.ts`, `vite.config.ts`: Cloudflare Worker build/deploy setup.
- `docs/`, `mcp/`, `skills/small-goals/`: deployment, agent API, MCP, and operating instructions.

Always read the relevant installed Next.js guide under `node_modules/next/dist/docs/` before changing Next.js APIs. Never remove the generated Next.js rules block above.
