---
name: 'Draft Smoke Check'
description: 'Validate Zoolanding local draft previews after frontend, payload, SSR, routing, or alias changes. Use when checking unresolved-draft failures, draft route rendering, or local-vs-live parity for managed aliases.'
argument-hint: 'Local base URL, domain filter, or changed area'
agent: 'agent'
---

Validate the affected draft preview in this repository.

Follow [Zoolanding Frontend Workflow](../skills/zoolanding-frontend-workflow/SKILL.md) and the source workflow docs:

- [Draft Lifecycle](../../docs/11-draft-lifecycle.md)
- [Shared Draft Authoring Rules](../../ai-notes/knowledge/draft-authoring-rules.md)
- [Repo Checklist](../skills/zoolanding-frontend-workflow/references/repo-checklist.md)

Use the user's arguments to identify the local base URL, target domains, changed routes, or affected files.

Prefer the smallest useful validation path:

- use `node tools/draft-smoke-check.mjs --local-base-url=...` when multiple draft routes, managed aliases, or parity checks are involved
- use a manual preview URL with `draftDomain` and `draftPageId` when a single draft or page is enough
- add `--domain=` or `--output=` only when they materially reduce noise or preserve evidence

Return:

1. the validation scope
2. the exact command(s) or preview URL(s)
3. findings or blockers first
4. the next verification step if anything remains unproven
5. whether desktop and mobile browser QA is still pending before closeout
