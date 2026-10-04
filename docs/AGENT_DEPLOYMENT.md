# Agent deployment runbook

Use this when a user asks for a personal deployment, for example: “Deploy this as Lucio's Small Goals on Cloudflare.” The repository has a built-in setup wizard. Do not provision Neon or ask the user to configure a database.

## Deterministic checklist

1. Clone the repository and run `npm install`. Read `AGENTS.md` and the selected provider guide.
2. Run `npm run setup`. It defaults to Cloudflare Workers; if the user asked for Vercel, pass `-- --provider vercel`. The user can also choose Vercel at the provider prompt.
3. The wizard asks for the user's name and a browser password (hidden input), then names the app `<Name>'s Small Goals` and generates a strong agent API token. It uses private Cloudflare R2 or private Vercel Blob; both hold the same single JSON workspace. No external database is needed.
4. The wizard prints a resource/deployment summary and waits for explicit approval before provider login, resource creation, or deployment. If declined, it exits without provisioning or deployment. Once approved, it launches the provider CLI login automatically if needed; the user completes the provider's secure browser authorization.
5. After approval, let the wizard finish. It saves the generated API token to the Git-ignored `.small-goals/agent-token` file with restrictive file permissions, creates the minimum provider resources, adds secrets server-side, deploys, and runs `npm run verify:remote -- --write` against the deployment.
6. If the wizard reports success, configure MCP in the user's authorized client with the deployment URL and agent token. Do not print the token; retrieve it from the provider's secret store only if permitted. If the client cannot be configured, give the exact placeholder-based instructions from [../mcp/README.md](../mcp/README.md).
7. Report the app URL, exact name, provider, whether the API verification passed, and MCP configuration status. Remind the user to save the browser password and agent token securely.

Expected completion format:

```text
Deployment complete

App: https://…
Name: Lucio's Small Goals
Provider: Vercel | Cloudflare Workers
Agent API: Working
MCP: Configured | Configuration instructions provided
```

## Rules

- Do not create or require a Neon, Postgres, or other database resource.
- Do not commit, print, or log `AGENT_API_TOKEN`, `APP_ACCESS_PASSWORD`, `BLOB_READ_WRITE_TOKEN`, or provider credentials. Keep `.small-goals/agent-token` private; `.small-goals/` is gitignored.
- Never expose `AGENT_API_TOKEN` in client variables, page props, query strings, or logs.
- Do not deploy until the setup wizard receives an affirmative approval after showing the resource summary.
- Do not overwrite or delete unrelated provider projects, buckets, or stores.
- Ask only when provider authentication, account selection, or another actual authorization is required.
