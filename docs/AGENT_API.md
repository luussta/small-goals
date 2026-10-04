# Agent API

Base URL: `https://<deployment>/api/agent`. Send every request, including reads, with:

```http
Authorization: Bearer <AGENT_API_TOKEN>
Content-Type: application/json
```

The token is a server-side deployment secret. IDs are stable random IDs. Responses are JSON with `Cache-Control: no-store`. Errors have an `error` string and an HTTP status; invalid input is `400`, missing auth is `401`, missing IDs are `404`, oversized bodies are `413`, and a concurrent write conflict is `409`.

| Method | Path | Body / purpose |
| --- | --- | --- |
| `GET` | `/state` | Complete workspace `{workspace:{id,name,data:{sections},version,updatedAt}}`. |
| `PATCH` | `/state` | `{ "name": "Lucio's Small Goals" }` changes the workspace display name. |
| `GET` | `/sections` | List stable section IDs, titles, collapsed state, and goal counts. |
| `GET` | `/sections/:sectionId` | Inspect a section and its goals/items. |
| `POST` | `/sections` | `{ "title": "Someday" }` creates a custom section. |
| `GET` | `/goals?sectionId=today` | List goals, their section IDs, item states, and derived completion. Omit filter for all. |
| `GET` | `/goals/:goalId` | Inspect one goal by ID. |
| `POST` | `/goals` | `{ "sectionId": "today", "title": "Finish SEO", "items": ["Generate sitemap"] }`. `items` is optional. |
| `PATCH` | `/goals/:goalId` | Any non-empty combination of `{ "title", "sectionId", "active", "collapsed" }`; sectionId moves the goal. |
| `DELETE` | `/goals/:goalId` | Deletes the goal and its items. Confirm destructive/ambiguous actions with the user. |
| `POST` | `/goals/:goalId/items` | `{ "text": "Generate sitemap", "position": 0 }`; position is optional and zero-based. |
| `PATCH` | `/items/:itemId` | Any non-empty combination of `{ "text", "completed", "position" }`. Completion derives goal state. |
| `DELETE` | `/items/:itemId` | Deletes the item. Confirm unless explicitly requested. |

All incoming values are validated; body size is limited to 16 KiB. An item completion transition that completes its goal automatically clears that goal's active flag. A completed goal cannot be set active. A goal with no items is not considered complete. The API never accepts a forced `completed` goal state.

Examples:

```sh
curl -H "Authorization: Bearer $AGENT_API_TOKEN" "$DEPLOYMENT_URL/api/agent/state"
curl -X POST -H "Authorization: Bearer $AGENT_API_TOKEN" -H 'Content-Type: application/json' \
  -d '{"sectionId":"today","title":"Finish SEO","items":["Generate sitemap","Check metadata"]}' \
  "$DEPLOYMENT_URL/api/agent/goals"
curl -X PATCH -H "Authorization: Bearer $AGENT_API_TOKEN" -H 'Content-Type: application/json' \
  -d '{"active":true}' "$DEPLOYMENT_URL/api/agent/goals/<goal-id>"
```

Prefer the included MCP tools; they wrap these endpoints and return concise structured JSON.
