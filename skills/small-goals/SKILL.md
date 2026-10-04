---
name: small-goals
description: Organize a user's personal Small Goals workspace through its MCP tools or authenticated agent API. Use when they ask to inspect, add, edit, complete, activate, or move goals and checklist items.
---

# Small Goals

Operate the user's one personal workspace through the installed `small_goals_*` MCP tools when available. Otherwise use the documented authenticated API at `/api/agent`; never inspect or edit the database directly.

The product is deliberately just **section → small goal → exact checklist items required to finish it**. Preserve that shape and the user's words. Do not add dates, priorities, tags, assignees, project metadata, or an elaborate plan.

## Status meaning

- **Black**: not started.
- **Orange**: currently being worked on. This is a focus signal, not priority.
- **Green**: every checklist item is checked. Completion is derived and overrides active state.

An empty goal is not complete. Checklist items remain plain binary tasks; never mark them orange.

## Workflow

1. Read `small_goals_get_state` or the relevant section before changing anything. Use stable IDs from returned data, not title guesses. If the request may refer to duplicates, inspect first and clarify only if it remains ambiguous.
2. Reuse a matching section and existing goal when possible. Avoid duplicate goals/items. Preserve user wording and current order where practical.
3. For a broad outcome, create one clear goal and a short list of concrete, finishable items. Example: “prepare launch” might be a goal with “write launch post”, “verify production”, and “check metadata”. Do not fragment a trivial one-step task or invent details the user did not imply.
4. When the user says they are working on something now, call `small_goals_set_active_goal`. Do not mark a goal active merely because it is newly created or urgent. Setting another active goal does not silently clear prior active goals.
5. Check or uncheck individual items with `small_goals_complete_item` and `small_goals_uncomplete_item`. Never force goal completion directly; all checked items make it green automatically.
6. Move unfinished goals with `small_goals_move_goal`, preserving their checklist. Do not move a completed goal unless requested.
7. Ask before destructive or ambiguous changes (deleting goals/items, merging duplicates, replacing a checklist, or moving unclear content). If the user explicitly asked for that exact deletion, proceed.
8. After changes, read back the affected goal/section and briefly summarize the concrete edits. Mention any ambiguity or failed request; do not claim a write succeeded without the response confirming it.

## Examples

“Add ‘finish SEO’ to Today.”

- Inspect Today first.
- If no matching goal exists, create “finish SEO” under the `today` section ID. Add only checklist items the user named or clearly implied.

“Mark the sitemap task complete.”

- Read the workspace, find the exact matching item and use its stable item ID. If multiple sitemap items match, ask which one.

“Add these five subtasks under Launch.”

- Find the Launch goal ID and add each requested item, preserving their wording and order.

“What do I still have to do today?”

- Read Today and report unchecked items grouped by goal. Exclude checked items. Mention active goals when useful.

## MCP tools

Prefer these tools when installed: `small_goals_get_state`, `small_goals_list_today`, `small_goals_list_section`, `small_goals_list_goals`, `small_goals_get_goal`, `small_goals_add_goal`, `small_goals_update_goal`, `small_goals_move_goal`, `small_goals_set_active_goal`, `small_goals_delete_goal`, `small_goals_add_item`, `small_goals_update_item`, `small_goals_complete_item`, `small_goals_uncomplete_item`, `small_goals_delete_item`, and `small_goals_create_section`.

If MCP is unavailable, see the repository's `docs/AGENT_API.md` for bearer authentication, request shapes, and status rules. Never place its token in browser code, a URL, or a checked-in config file.
