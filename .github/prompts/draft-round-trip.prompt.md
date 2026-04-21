---
name: 'Draft Round Trip'
description: 'Plan or verify a Zoolanding draft pull, create, push, pack, unpack, or publish workflow. Use when syncing local draft files with the config authoring API or preparing a publish from zoolandingpage.'
argument-hint: 'Domain, endpoint, or desired state transition'
agent: 'agent'
---

Help with a draft round-trip in this repository.

Follow [Zoolanding Frontend Workflow](../skills/zoolanding-frontend-workflow/SKILL.md) and these source docs:

- [Draft Lifecycle](../../docs/11-draft-lifecycle.md)
- [Deployment Guide](../../docs/06-deployment.md)
- [Shared Draft Authoring Rules](../../ai-notes/knowledge/draft-authoring-rules.md)

First distinguish which state the user is talking about:

- local draft files
- authoring draft state
- published runtime state

Then choose the narrowest needed operation: `pull`, `create`, `push`, `publish`, `pack`, or `unpack`.

Prefer the direct CLI form `node tools/config-draft-sync.mjs ...` over wrapper scripts when showing commands.

Use the user's arguments to determine the domain, endpoint, stage, and verification scope.

Return:

1. current state and target state
2. exact commands to run or inspect
3. blockers or risk first
4. the verification step after the state change
5. any doc updates needed if the workflow itself changed
6. any remaining closeout work needed to satisfy the repo rule: triple audit plus desktop/mobile browser QA when the task affects draft behavior
