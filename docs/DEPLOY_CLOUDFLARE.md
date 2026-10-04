# Deploy to Cloudflare Workers

Small Goals stays in the Next.js App Router structure. This project uses Cloudflare's vinext compatibility runtime and a private R2 bucket binding for its JSON workspace. No Neon account, database URL, or migration is needed.

## Automatic setup (recommended)

```sh
git clone https://github.com/luussta/small-goals.git
cd small-goals
npm install
npm run setup -- --provider cloudflare
```

The wizard asks for your name and browser password, sets the app name to `<Name>'s Small Goals`, and generates the agent token. It shows the resource names and global Codex install, then asks for approval before launching Cloudflare login, creating a bucket, or deploying. After approval it launches provider login if needed, creates the private R2 bucket, sets worker secrets, deploys, verifies the API, installs the skill and standalone MCP in the Codex user's global folders, stores the token outside the checkout, and registers the MCP globally. To let the wizard select the provider, use `npm run setup`.

## Manual deployment

1. Install and authenticate. Node.js 22.18 or newer is required by the typed Cloudflare CLI:

   ```sh
   npm install
   npx cf auth login
   npx cf auth whoami
   ```

2. Set the deployment name, Worker name, and bucket name. Bucket names must be unique within the Cloudflare account; defaults are `small-goals` and `small-goals-data`. The setup wizard generates unique names for both resources.

   ```sh
   export APP_NAME="Lucio's Small Goals"
   export SMALL_GOALS_WORKER_NAME="small-goals-lucio"
   export SMALL_GOALS_BUCKET_NAME="small-goals-data"
   ```

3. Create the bucket and generate credentials. Keep the token/password in a secret manager or shell environment, not in Git:

   ```sh
   npx cf r2 buckets create-by-name "$SMALL_GOALS_BUCKET_NAME"
   export AGENT_API_TOKEN="$(npm run --silent generate-token)"
   # Choose a separate long browser password and export it as APP_ACCESS_PASSWORD.
   ```

4. Build and deploy. The helper uploads Worker secrets through a temporary file outside the repository and removes it afterward:

   ```sh
   npm run build:cloudflare
   npm run deploy:cloudflare
   ```

The deployed Worker is usually available at `https://small-goals.<account-subdomain>.workers.dev`. `cloudflare.config.ts` attaches the R2 bucket and binds `APP_NAME`; secrets are sent at deploy time and are not stored in the committed config.

For a local Worker preview, use ignored `.dev.vars` for `AGENT_API_TOKEN` and `APP_ACCESS_PASSWORD`, and create/attach a local R2 bucket through the Cloudflare CLI. Set `APP_NAME` and `SMALL_GOALS_BUCKET_NAME` in the shell, then run `npm run preview:cloudflare`.

## Verify

```sh
export DEPLOYMENT_URL='https://small-goals.<account-subdomain>.workers.dev'
export AGENT_API_TOKEN='the-deployment-token'
npm run verify:remote
npm run verify:remote -- --write
```

The first command checks the page and authenticated workspace read. The second also creates a temporary goal and item, completes the item, then deletes the goal.

## Configure MCP

For a manual deployment, set `SMALL_GOALS_URL` and `SMALL_GOALS_TOKEN` in a private process environment, then run `npm run install:codex-global` to install the skill and MCP into the current Codex user's global environment. The token value is the Worker `AGENT_API_TOKEN`. See [../mcp/README.md](../mcp/README.md) for other MCP clients.
