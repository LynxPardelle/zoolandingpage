---
name: 'Workspace AI Customization Audit'
description: 'Audit shared AI customizations across the Zoolanding multi-root workspace. Use when checking drift across repo-local skills, prompts, agents, routing instructions, or workspace-level tooling conventions.'
argument-hint: 'Changed repos, customization concern, or parity scope'
agent: 'agent'
---

Review the shared AI customization layer for the Zoolanding workspace with `zoolandingpage` as the community hub.

Start from these sources:

- [Workspace File](../../zoolandingpage.code-workspace)
- [Workspace AI Customization Rollout](../../ai-notes/notes/workspace-ai-customization-rollout.md)
- [Copilot Skill Routing](../../ai-notes/notes/copilot-skill-routing.md)
- [Agent Task Workflow](../../ai-notes/notes/agent-task-workflow.md)

Then inspect the hub customizations in this repo and the local `.github/` trees in sibling repos when relevant:

- `../../../zoolanding-data-dropper-lambda/.github/`
- `../../../zoolanding-quick-stats-lambda/.github/`
- `../../../zoolanding-config-authoring/.github/`
- `../../../zoolanding-config-runtime-read/.github/`
- `../../../zoolanding-image-upload/.github/`

Use the user's arguments plus the current diff or changed files.

Check specifically for:

- drift between shared hub prompts in this repo and repo-local skills, prompts, agents, or instructions in sibling repos
- missing routing references to vendored repo-local skills or agents
- community assets that should live in this repo instead of being duplicated elsewhere
- repo-specific assets that should stay local and not move into the hub

Return:

1. findings first, ordered by severity
2. shared hub assets vs repo-local assets
3. repos or files with drift
4. the smallest sync plan
