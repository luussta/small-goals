<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Small Goals coding-agent guide

Small Goals is a personal, single-page Next.js task app. Its only product model is **section → goal → checklist items**. The intended visual states are black (not started), orange (active work), and green (all non-empty checklist items complete). Keep the UI quiet and the implementation understandable. Do not add accounts, organizations, billing, priorities, dates, tags, dashboards, extra views, or localStorage persistence.

## Architecture

- Next.js App Router, TypeScript, Tailwind, Inter.
- `src/app/page.tsx` is the small client UI. It reads and writes `/api/workspace`.
- `src/app/api/agent/[[...path]]/route.ts` is the stable-ID REST API used by MCP. It requires `Authorization: Bearer $AGENT_API_TOKEN` for every operation.
- `src/lib/db.ts` uses `@neondatabase/serverless` and a single `workspace` row. `data` is the complete validated JSON document. Writes use a version compare-and-swap to avoid losing concurrent edits.
- `src/lib/model.ts` defines and validates `Section`, `Goal`, `Item`, and workspace types. Goal completion is derived: a non-empty list with every item completed is Done. A completed goal cannot remain active.
- The browser UI has one `APP_ACCESS_PASSWORD` login and a signed HTTP-only session cookie. It is separate from and never given the agent token.
- Vercel uses standard Next.js. Cloudflare Workers uses Cloudflare's recommended vinext compatibility runtime for the same Next.js App Router source; the project has a checked 100% compatibility report for its current imports. Do not restore `output: "export"` because API routes and Postgres need a server runtime.
- `mcp/server.ts` is a local stdio MCP client. `skills/small-goals/SKILL.md` teaches an agent how to use it well.

## Install and run

1. `npm install`
2. Copy `.env.example` to `.env.local` and set `APP_NAME`, `DATABASE_URL`, `AGENT_API_TOKEN`, and `APP_ACCESS_PASSWORD`.
3. Run `npm run db:migrate` to create the table and seed a first workspace. Re-running it preserves existing workspace data while applying the current `APP_NAME`.
4. Run `npm run dev` and open http://localhost:3000.

Useful commands: `npm run build`, `npm run lint`, `npm run typecheck`, `npm run generate-token`, `npm run verify`, `npm run verify:remote`, `npm run deploy:vercel`, `npm run build:cloudflare`, `npm run preview:cloudflare`, `npm run deploy:cloudflare`, `npm run mcp`.

`npm run verify` requires the three app secrets and a migrated reachable database. `npm run verify:remote` requires `DEPLOYMENT_URL` and `AGENT_API_TOKEN`; pass `-- --write` to exercise and clean up one temporary goal and item.

## Persisted data

There is no browser storage, external state manager, separate task table, or application server beyond Next.js. `db/migrations/0001_workspace.sql` creates one row with `id`, `name`, `data JSONB`, `version`, and `updated_at`. `src/lib/seed.ts` supplies first-run data. API responses identify goals/items by stable IDs. Keep the UI and agent API on this same `workspace.data.sections` state.

## Personalize a deployment

Set `APP_NAME="Lucio's Small Goals"` in the provider runtime environment. Set it before `npm run db:migrate`; migration seeds the initial workspace name and updates that name on later runs without replacing task data. `OWNER_NAME` is optional. Generate the agent secret with `npm run generate-token`; use a separate long password for `APP_ACCESS_PASSWORD`. Put all secrets in provider secret storage, never `NEXT_PUBLIC_*`, committed files, URLs, or logs.

## Deploy a personal instance

When the user asks, for example, “Deploy this as Lucio's Small Goals on Vercel,” carry the setup through rather than stopping after writing instructions:

1. Clone the repository and install with `npm install`.
2. Set `APP_NAME` to the exact requested name. Do not change source code to rename it.
3. Check whether an authorized Neon project is available. If needed, use `npx neonctl auth` then `npx neonctl projects create --name small-goals`; if the account/organization or billing choice is ambiguous, ask only for that choice. Keep the returned connection string secret.
4. Run `npm run generate-token` once and retain the token securely. Create a separate `APP_ACCESS_PASSWORD` for browser access. Never print or commit either secret.
5. Run `npm run db:migrate` against the new database with the exact `APP_NAME`.
6. Deploy to the requested provider by following [docs/DEPLOY_VERCEL.md](docs/DEPLOY_VERCEL.md) or [docs/DEPLOY_CLOUDFLARE.md](docs/DEPLOY_CLOUDFLARE.md). If its CLI is authenticated, proceed; ask only if provider/account authentication or an actual account selection is required.
7. Run `npm run verify:remote`; then run `npm run verify:remote -- --write` to confirm authenticated create, item completion, and cleanup.
8. Configure the MCP server in the user's permitted client using `SMALL_GOALS_URL` and `SMALL_GOALS_TOKEN`, following [mcp/README.md](mcp/README.md). If you cannot edit that client config, give the exact configuration snippet.
9. Report the deployment URL, exact app name, provider, agent API verification, MCP status/instructions, and tell the user to retain the browser password and agent token securely.

Do not expose Neon, agent, browser, Vercel, or Cloudflare secrets in output. Do not redeploy an unrelated existing production project. Do not select or delete an existing database/project without checking whether it belongs to this installation.

## API and MCP

Start with `GET /api/agent/state`. Other routes are documented in [docs/AGENT_API.md](docs/AGENT_API.md). MCP tool names begin `small_goals_`; input descriptions and IDs are authoritative. Use MCP tools when available rather than editing database JSON directly.

## Important files and boundaries

- `src/app/page.tsx` and `src/app/globals.css`: small existing product UI. Improve interaction/accessibility without redesigning it.
- `src/lib/model.ts`, `src/lib/db.ts`, `src/lib/auth.ts`: data/security boundaries; validate every write.
- `db/migrations/0001_workspace.sql`: only application table.
- `cloudflare.config.ts`, `vite.config.ts`: Cloudflare Worker build/deploy configuration for vinext.
- `docs/`, `mcp/`, `skills/small-goals/`: deployment, agent API, MCP, reusable operating instructions.

Always read the relevant installed Next.js guide under `node_modules/next/dist/docs/` before changing Next.js APIs; this installed Next release has breaking changes from older conventions. Never remove the generated Next.js rules block above.
