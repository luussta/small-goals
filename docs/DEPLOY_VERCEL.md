# Deploy to Vercel

This is a normal dynamic Next.js app on Vercel with a Neon Postgres database. The CLI flow below leaves every credential in provider secret storage or a short-lived shell variable.

## Before deploying

1. Clone and install:

   ```sh
   git clone <repository-url>
   cd small-goals
   npm install
   ```

2. Create or select a Neon project. If Neon CLI is authenticated, `npx neonctl projects create --name small-goals` creates a database and returns its connection string. Otherwise run `npx neonctl auth` and complete account authorization. Use an existing database only after confirming it is intended for this deployment.

3. Set up deployment values in the current shell without committing them:

   ```sh
   export APP_NAME="Lucio's Small Goals"
   export DATABASE_URL='postgresql://…'
   export APP_ACCESS_PASSWORD='choose-a-separate-long-password'
   export AGENT_API_TOKEN="$(npm run --silent generate-token)"
   npm run db:migrate
   ```

   `db:migrate` creates the `workspace` table and inserts the starter workspace. It is safe to rerun and does not replace existing goals.

4. Ensure Vercel CLI is authenticated (`npx vercel whoami`). If it is not, run `npx vercel login` and complete the account authorization.

## A. Vercel CLI deployment

1. Link this directory to a Vercel project. This creates a new project if needed and asks for a team only if the account has more than one eligible scope:

   ```sh
   npx vercel link
   ```

2. Add values to Production. Vercel prompts for each value; paste from the current shell or the secure credential store. Use `--sensitive` on secrets:

   ```sh
   printf '%s' "$APP_NAME" | npx vercel env add APP_NAME production
   printf '%s' "$DATABASE_URL" | npx vercel env add DATABASE_URL production --sensitive
   printf '%s' "$AGENT_API_TOKEN" | npx vercel env add AGENT_API_TOKEN production --sensitive
   printf '%s' "$APP_ACCESS_PASSWORD" | npx vercel env add APP_ACCESS_PASSWORD production --sensitive
   ```

   Repeat for Preview/Development only if those deployments should have access to this same personal workspace. Otherwise keep credentials production-only.

3. Deploy the production build:

   ```sh
   npm run deploy:vercel
   ```

   The command is `npx --yes vercel --prod`; it uses the project linked in step 1. Use the production URL printed by Vercel.

## B. Vercel dashboard deployment

1. Import the repository from GitHub in the Vercel dashboard. Keep the detected Next.js framework and default build command `next build`.
2. Add `APP_NAME`, `DATABASE_URL`, `AGENT_API_TOKEN`, and `APP_ACCESS_PASSWORD` in **Project Settings → Environment Variables** for Production. Mark the three secrets sensitive/private. Do not prefix them with `NEXT_PUBLIC_`.
3. In a local checkout, set `APP_NAME` and `DATABASE_URL` in `.env.local` and run `npm run db:migrate` once against that Neon database. Do not commit `.env.local`.
4. Deploy from the dashboard or run `npx vercel --prod` after linking the local checkout.

## Verify

Set these in the same local shell (or source an untracked `.env.local`):

```sh
export DEPLOYMENT_URL='https://your-project.vercel.app'
export AGENT_API_TOKEN='the-production-token'
npm run verify:remote
npm run verify:remote -- --write
```

The first command checks the page and authenticated `GET /api/agent/state`. The second also creates a uniquely named temporary goal, adds an item, marks it complete, and deletes the goal in a `finally` cleanup. Keep the production URL and token out of committed files and logs.

## Configure MCP

Set `SMALL_GOALS_URL` to the production URL and `SMALL_GOALS_TOKEN` to the same agent token in the MCP client's environment. Follow [../mcp/README.md](../mcp/README.md). Keep `APP_ACCESS_PASSWORD` for the human browser login; MCP uses the agent token.
