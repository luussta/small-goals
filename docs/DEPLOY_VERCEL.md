# Deploy to Vercel

Small Goals runs as a dynamic Next.js app with private Vercel Blob storage. It does not use Neon, Postgres, or a separate database service.

## Automatic setup (recommended)

```sh
git clone https://github.com/luussta/small-goals.git
cd small-goals
npm install
npm run setup -- --provider vercel
```

The wizard asks for your name and browser password, sets the app name to `<Name>'s Small Goals`, and generates an agent token. It shows the resource names and asks for approval before launching Vercel login, creating a project or private Blob store, or deploying. After approval, it launches provider login if needed, stores secrets in Vercel, deploys, and verifies the API. To let the wizard select the provider, use `npm run setup`.

## Manual Vercel CLI deployment

1. Install and authenticate:

   ```sh
   npm install
   npx --yes vercel login
   npx --yes vercel whoami
   ```

2. Create a Vercel project and a private Blob store in the Vercel dashboard or CLI. Connect the Blob store to the project’s Production environment so Vercel supplies `BLOB_READ_WRITE_TOKEN` at runtime.

3. Generate an agent token and choose a separate browser password. Add `APP_NAME`, `AGENT_API_TOKEN`, and `APP_ACCESS_PASSWORD` to the project’s Production environment. Mark secrets as sensitive and never use `NEXT_PUBLIC_` prefixes.

4. Deploy:

   ```sh
   npx --yes vercel link
   npm run deploy:vercel
   ```

## Vercel dashboard deployment

1. Import the public GitHub repository into Vercel; keep the detected Next.js framework and default build command `next build`.
2. Create and connect a **private** Blob store to the project. Vercel should add the server-side `BLOB_READ_WRITE_TOKEN` environment variable.
3. Add `APP_NAME`, `AGENT_API_TOKEN`, and `APP_ACCESS_PASSWORD` as Production environment variables. Keep both credentials private and never prefix them with `NEXT_PUBLIC_`.
4. Deploy from the dashboard.

No database migration or storage bootstrap command is needed. The first app request creates the initial workspace in private Blob storage.

## Verify

Set local verification inputs without committing them:

```sh
export DEPLOYMENT_URL='https://your-project.vercel.app'
export AGENT_API_TOKEN='the-production-token'
npm run verify:remote
npm run verify:remote -- --write
```

The first command checks the page and authenticated `GET /api/agent/state`. The second also creates a uniquely named temporary goal and item, marks it complete, and deletes the goal in cleanup.

## Configure MCP

Set `SMALL_GOALS_URL` to the production URL and `SMALL_GOALS_TOKEN` to the agent token in the MCP client's private environment. Follow [../mcp/README.md](../mcp/README.md). Keep the browser password for human login; MCP uses the separate agent token.
