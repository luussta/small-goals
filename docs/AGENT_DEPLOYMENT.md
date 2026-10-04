# Agent deployment runbook

Use this document when a user asks for a personal installation such as “Deploy me a personal version called Lucio's Small Goals on my Vercel account.” Follow the whole checklist and report the final URL. Do not stop after presenting commands.

## Deterministic checklist

1. **Clone and install.** Clone this repository to a new directory and run `npm install`. Read `AGENTS.md` and the chosen provider guide.
2. **Name it.** Set `APP_NAME` to the user's exact requested name, including punctuation. For Cloudflare export it before loading `cloudflare.config.ts` to build/deploy. For Vercel set the production environment variable.
3. **Provision storage.** Reuse a Neon project only if the user has selected it for this instance. Otherwise, if `neonctl` is authorized, create one with `npx neonctl projects create --name small-goals`. Complete `npx neonctl auth` if needed. Ask only when Neon needs authorization, a team/account choice is ambiguous, or the provider requires an actual user action. Do not create a paid resource without the account's existing permission/plan covering it.
4. **Create credentials.** Generate an `AGENT_API_TOKEN` with `npm run --silent generate-token`. Choose a separate strong `APP_ACCESS_PASSWORD` for browser access. Keep both in process memory or a secure credential manager; do not echo, commit, or report their values.
5. **Initialize the workspace.** Set local `APP_NAME` and `DATABASE_URL`, then run `npm run db:migrate`. It creates the simple Postgres table and inserts seed goals only if no workspace exists.
6. **Set provider secrets and deploy.** Follow exactly one provider guide:
   - Vercel: [DEPLOY_VERCEL.md](DEPLOY_VERCEL.md)
   - Cloudflare Workers: [DEPLOY_CLOUDFLARE.md](DEPLOY_CLOUDFLARE.md)
   If the CLI is authenticated, continue. Ask only if login/account authorization is needed or a real account/team selection cannot be inferred.
7. **Verify.** Set `DEPLOYMENT_URL` and `AGENT_API_TOKEN`; run `npm run verify:remote` and `npm run verify:remote -- --write`. If either fails, inspect deployment logs and fix it before reporting success.
8. **Connect MCP.** If the agent/client configuration is writable and permission is available, configure the local process using `SMALL_GOALS_URL=<deployment URL>` and `SMALL_GOALS_TOKEN=<agent token>`, as described by [mcp/README.md](../mcp/README.md). If it cannot be configured automatically, provide the exact snippet without token values.
9. **Check shared state.** Through MCP or the API, read `Today`; create a temporary goal and item, complete the item, and remove that test goal. Confirm browser and API use the same workspace if browser login access is available.
10. **Report clearly.** Use this format:

   ```text
   Deployment complete

   App: https://…
   Name: Lucio's Small Goals
   Provider: Vercel | Cloudflare Workers
   Agent API: Working (authenticated state read and write check passed)
   MCP: Configured | Configuration instructions provided

   Keep the browser password and agent token in your password manager.
   ```

## Rules

- Never commit or print `DATABASE_URL`, `AGENT_API_TOKEN`, `APP_ACCESS_PASSWORD`, API keys, or provider credentials.
- Never expose `AGENT_API_TOKEN` in client variables, page props, query strings, or logs.
- The database and app password are required because public writes/reads would otherwise expose or alter the personal workspace.
- Do not overwrite an existing database row or delete a provider project. Migration preserves task JSON.
- Avoid unnecessary questions. Stop only for a genuinely missing user authorization, billing/account choice, or action that requires explicit permission.
- If the MCP client is outside the writable environment, say that deployment and API verification succeeded and give the exact local MCP config instructions.
