---
applyTo: '**'
description: 'Use for any Zoolandingpage task that will be declared correct or complete. Enforces triple-audit closeout and browser QA for draft-affecting work.'
---

Before declaring any Zoolandingpage task correct or complete:

1. Audit the work, fix what you find, and rerun the audit at least three times.
2. Do not treat automated checks alone as sufficient when draft behavior changed.
3. If the task affects drafts, routes, payloads, rendering, or authoring workflow, finish with browser QA on every affected draft route in both desktop and mobile viewports.
4. Correct any visible, runtime, console, network, or responsiveness issue found during that browser pass before closing the task.
5. Distill reusable lessons into `ai-notes/` and keep draft-specific history local under `drafts/{domain}/ai_notes/`, `drafts/{domain}/findings/`, or `drafts/{domain}/errors-reports/`.
