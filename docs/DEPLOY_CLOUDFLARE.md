# Deploy to Cloudflare Workers

This deployment uses **Cloudflare Workers**, not static Cloudflare Pages, because the app needs Next.js route handlers and a shared Postgres database. It uses the OpenNext adapter to keep the existing Next.js framework. Cloudflare now recommends vinext for new Cloudflare Next.js projects; this repository uses the documented OpenNext adapter because it runs the existing Next app without switching its build framework. See [Cloudflare's Next.js options](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/) and [OpenNext guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/).

## 1. Clone, install, and authenticate

```sh
git clone <repository-url>
cd small-goals
npm install
npx wrangler whoami
```

If `whoami` reports no active session, run `npx wrangler login` and complete Cloudflare account authorization.

## 2. Configure Neon and app name

Create/select a Neon Postgres project. With an authorized Neon CLI, `npx neonctl projects create --name small-goals` provisions a small serverless database and prints its connection URI. If needed, authorize with `npx neonctl auth`. Use the default database/role unless the user requested another.

Set the workspace name in `wrangler.jsonc` under `vars.APP_NAME` (for example `"Lucio's Small Goals"`). Optionally add a plain-text `OWNER_NAME` variable there. Set the migration environment locally and initialize the schema/seed:

```sh
export APP_NAME="Lucio's Small Goals"
export DATABASE_URL='postgresql://…'
npm run db:migrate
```

This creates one `workspace` row and preserves its current data on later migration runs.

## 3. Store secrets in Cloudflare

Generate a strong agent token and choose a separate browser password:

```sh
export AGENT_API_TOKEN="$(npm run --silent generate-token)"
export APP_ACCESS_PASSWORD='choose-a-separate-long-password'
printf '%s' "$DATABASE_URL" | npx wrangler secret put DATABASE_URL
printf '%s' "$AGENT_API_TOKEN" | npx wrangler secret put AGENT_API_TOKEN
printf '%s' "$APP_ACCESS_PASSWORD" | npx wrangler secret put APP_ACCESS_PASSWORD
```

Wrangler stores these as Worker secrets. Never put them in `wrangler.jsonc`, `.dev.vars` committed to Git, or any `NEXT_PUBLIC_*` variable. Keep `APP_NAME` as a normal Worker variable, not a secret.

## 4. Build and deploy

`wrangler.jsonc` and `open-next.config.ts` are already configured. The worker name defaults to `small-goals`; change `name` in `wrangler.jsonc` if the account needs a different unique Worker name.

```sh
npm run build:cloudflare
npm run deploy:cloudflare
```

`deploy:cloudflare` performs the OpenNext build and then runs `wrangler deploy`. The returned Worker URL is usually `https://<worker-name>.<account-subdomain>.workers.dev`. A custom domain can be attached later in Cloudflare.

To preview in the Workers runtime before production deployment:

```sh
npm run preview:cloudflare
```

## 5. Verify

```sh
export DEPLOYMENT_URL='https://your-worker.workers.dev'
export AGENT_API_TOKEN='the-deployment-token'
npm run verify:remote
npm run verify:remote -- --write
```

This checks the homepage, authenticated workspace read, then (with `--write`) creates a temporary goal and item, completes it, and removes the goal in a cleanup step.

## 6. Configure MCP

Set `SMALL_GOALS_URL` and `SMALL_GOALS_TOKEN` in your MCP client's environment. Follow [../mcp/README.md](../mcp/README.md). The browser UI uses `APP_ACCESS_PASSWORD`; the local MCP process uses `AGENT_API_TOKEN` as `SMALL_GOALS_TOKEN`.
