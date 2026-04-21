---
name: 'Workspace Change Summary'
description: 'Summarize cross-repo AI customization or tooling changes across the Zoolanding multi-root workspace. Use when preparing a consolidated changelog, rollout note, PR note, or handoff for shared prompts, skills, agents, or workspace settings.'
argument-hint: 'Repos, date range, diff, or summary target'
agent: 'agent'
---

Create a consolidated workspace summary with `zoolandingpage` as the hub repo.

Start from these sources:

- [Workspace File](../../zoolandingpage.code-workspace)
- [Workspace AI Customization Rollout](../../ai-notes/notes/workspace-ai-customization-rollout.md)
- [Copilot Skill Routing](../../ai-notes/notes/copilot-skill-routing.md)
- [Agent Task Workflow](../../ai-notes/notes/agent-task-workflow.md)

Then inspect the relevant `.github/` changes in this repo and any sibling repos named in the user's request.

Use the user's arguments plus the current diff or changed files.

Return:

1. an executive summary
2. highlights per repo
3. the shared or community assets now owned by `zoolandingpage`
4. the repo-local assets that remain intentionally local
5. follow-up gaps or next steps
