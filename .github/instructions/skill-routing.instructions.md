---
name: 'Zoolanding Skill Routing'
description: 'Use when deciding which installed general skills fit Zoolandingpage tasks. Steers the agent toward repo-relevant skills and away from irrelevant cloud or IaC workflows.'
applyTo: '**'
---

- Prefer repo-local workflows, prompts, custom agents, and vendored repo-local skills before installed global skills.
- Default to the repo-local `karpathy-guidelines` skill for Angular, tooling, and sibling-Lambda code work.
- Invoke the repo-local `systematic-debugging` skill before fixing bugs, test failures, or unexpected behavior.
- Use the repo-local `test-driven-development` skill for behavior-changing code, not for draft JSON, content, or docs-only edits.
- Use the repo-local `risk-review` skill for review-only asks, regression hunting, and findings-first diff review.
- Use the repo-local `zoolanding-browser-qa` skill as the default browser-validation workflow; pair it with `agent-browser` or `chrome-devtools` only when those globals are available.
- Use the repo-local `zoolanding-pr-followup` skill for PR follow-up workflows; pair it with GitHub globals only when they are available.
- Reach for `frontend-skill`, `harden`, and `polish` only for visual work or production-hardening passes.
- De-prioritize `cloud-design-patterns` and `terraform-skill` unless the task is explicit architecture or Terraform or IaC work.
