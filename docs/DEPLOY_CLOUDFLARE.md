# Deploy to Cloudflare Workers

The app stays in its Next.js App Router structure. Cloudflare currently recommends **vinext** for Next.js on Workers; it reimplements the Next.js API surface on Vite and keeps the existing `src/app` UI and route handlers. Cloudflare describes vinext as beta, so this repository runs its compatibility check (currently 100% supported for the imports and features used here) and keeps `npm run dev` / `npm run build` on standard Next.js for Vercel. Read [Cloudflare's Next.js guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/) and [vinext Cloudflare deployment guide](https://vinext.dev/docs/deploying/cloudflare).

The Cloudflare typed config uses the current `cf` CLI and is in open beta. Use Node.js 22.18 or newer for Cloudflare setup and deploy commands.

## 1. Clone, install, and authorize

```sh
git clone <repository-url>
cd small-goals
npm install
npx cf auth login
```

The login opens Cloudflare authorization in a browser. If the account has multiple eligible accounts, select the one that should own this Worker. The default Worker name is `small-goals` in `cloudflare.config.ts`.

## 2. Configure Neon and app name

Create/select a Neon Postgres project. If the Neon CLI is authorized, `npx neonctl projects create --name small-goals` provisions the database and prints its connection URI. Otherwise run `npx neonctl auth`; ask only if account/team selection or account authorization is needed.

Set the exact app name and the database URL in the deployment shell, then initialize the single workspace row:

```sh
export APP_NAME="Lucio's Small Goals"
export DATABASE_URL='postgresql://…'
npm run db:migrate
```

`cloudflare.config.ts` reads `APP_NAME` and exposes it as a plain-text Worker binding. Migration seeds the workspace name and preserves existing goal data when rerun.

## 3. Store Worker secrets

Generate an agent token and choose a separate browser password. The deployment helper sends secrets in a short-lived temporary file outside the repository and deletes it after deploy:

```sh
export AGENT_API_TOKEN="$(npm run --silent generate-token)"
export APP_ACCESS_PASSWORD='choose-a-separate-long-password'
```

The Worker declares these secrets in `cloudflare.config.ts` with `bindings.secret()`. `npm run deploy:cloudflare` uploads them with the Worker version using Cloudflare's supported secrets-file interface. Never put them in config, `.dev.vars` committed to Git, or browser variables.

## 4. Build and deploy

Run the compatibility build and deploy:

```sh
npm run build:cloudflare
npm run deploy:cloudflare
```

The app name must be set in the deployment shell when `cloudflare.config.ts` is loaded. `npm run deploy:cloudflare` performs the vinext build and then deploys the Build Output to Cloudflare with the three secrets from the shell. The resulting address is usually `https://small-goals.<account-subdomain>.workers.dev`.

To preview locally in the Workers runtime, put local-only values in `.dev.vars` (this file is gitignored):

```dotenv
DATABASE_URL=postgresql://…
AGENT_API_TOKEN=local-test-token
APP_ACCESS_PASSWORD=local-test-password
```

Then run `npm run preview:cloudflare`. Keep `APP_NAME` set in the shell. Remove `.dev.vars` after local preview if it is no longer needed.

## 5. Verify

```sh
export DEPLOYMENT_URL='https://small-goals.<account-subdomain>.workers.dev'
export AGENT_API_TOKEN='the-deployment-token'
npm run verify:remote
npm run verify:remote -- --write
```

The first command checks the page and authenticated workspace read. The second creates a uniquely named temporary goal, adds an item, completes it, and deletes the goal in cleanup.

## 6. Configure MCP

Set `SMALL_GOALS_URL` and `SMALL_GOALS_TOKEN` in the MCP client's private environment. The token value is the Worker `AGENT_API_TOKEN`. Follow [../mcp/README.md](../mcp/README.md).
