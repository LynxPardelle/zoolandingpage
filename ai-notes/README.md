# ai-notes

Date: 2026-04-20 (Central Time)
Scope: Canonical long-lived AI and developer guidance for Zoolandingpage.
Status: Active
Applies To: Reusable workflow, authoring, QA, operations, and release guidance
Source Of Truth:

- `AGENTS.md`
- `Codex.md`
- `docs/DEVELOPER_ONBOARDING.md`
- `docs/03-development-guide.md`
- `docs/11-draft-lifecycle.md`
- Distilled knowledge from local `drafts/{domain}/ai_notes/**`, `drafts/{domain}/findings/**`, and `drafts/{domain}/errors-reports/**`
- Sanitized operational lessons promoted from local-only recovery work

Confidence: High
Last Reviewed: 2026-04-20 (Central Time)

This folder is the canonical home for reusable guidance that should survive beyond one task or one chat.

## Read This Folder In This Order

1. Read [../Codex.md](../Codex.md).
2. Read [notes/agent-task-workflow.md](./notes/agent-task-workflow.md).
3. Read [notes/copilot-skill-routing.md](./notes/copilot-skill-routing.md) when selecting among installed general skills for repo work.
4. Read [notes/workspace-ai-customization-rollout.md](./notes/workspace-ai-customization-rollout.md) when the task depends on shared workspace prompts, multi-repo AI tooling, or customization parity.
5. Read the most relevant file under [knowledge/](./knowledge/), [constraints/](./constraints/), [how-to/](./how-to/), [future-features-ideas/](./future-features-ideas/), or [error-reports/](./error-reports/).
6. If the task depends on an existing local draft, inspect `drafts/{domain}/ai_notes/`, `drafts/{domain}/findings/`, and `drafts/{domain}/errors-reports/` when those folders exist.
7. Use the templates in [templates/](./templates/) when creating new committed notes.

## What Belongs Here

- reusable draft-authoring rules and evergreen platform knowledge
- verified routing, slug, layout, embed, and readiness constraints
- repeatable procedures and checklists that future contributors should follow
- backlog-grade product or workflow ideas that help future planning
- sanitized incident reports that preserve reusable lessons without exposing sensitive specifics
- repo-level workflow and migration notes that future agents should understand

## What Does Not Belong Here

- draft-specific histories that matter only to one domain or one pass
- raw debugging transcripts, terminal dumps, or ad hoc browser observations
- secrets, credentials, tokens, raw env values, signed URLs, or PII
- volatile infrastructure identifiers that are only useful during one live incident

Keep draft-specific history in local `drafts/{domain}/ai_notes/`, `drafts/{domain}/findings/`, or `drafts/{domain}/errors-reports/`. If repo-level local-only scratch is ever needed again, keep it untracked under `devonly/`.

## Folder Map

- [notes/](./notes/): Canonical meta, workflow, and migration material
- [knowledge/](./knowledge/): Evergreen distilled reference and reusable operational knowledge
- [constraints/](./constraints/): Verified limitations, release gates, and durable rules
- [how-to/](./how-to/): Repeatable procedures, checklists, and operating playbooks
- [future-features-ideas/](./future-features-ideas/): Durable backlog-grade ideas discovered during work
- [error-reports/](./error-reports/): Sanitized incident write-ups with reusable lessons
- [templates/](./templates/): Standard note shapes for future committed notes

## Taxonomy Rules

- Use `knowledge/` for evergreen distilled reference that should stay true after the original task is forgotten.
- Use `notes/` for canonical workflow, governance, or migration context about how this repository is operated.
- Use `constraints/` when the main value is a verified limit, guardrail, or release gate.
- Use `how-to/` when the main value is a repeatable procedure or checklist.
- Use `future-features-ideas/` only for durable ideas worth revisiting later.
- Use `error-reports/` for sanitized incidents that teach a reusable lesson.

## Naming Rules

- Root folder name: `ai-notes`
- General filenames: kebab-case
- Use the existing templates before inventing a new note shape

## Standard Header

Every note in this folder should start with:

- `Date`
- `Scope`
- `Status`
- `Applies To`
- `Source Of Truth`
- `Confidence`
- `Last Reviewed`

Dates should be written in Central Time.

## When To Create Or Update A Note

Create or update a committed note when:

- a reusable authoring rule or limitation is discovered
- a routing, alias, or slug decision becomes durable across drafts
- a third-party embed or asset workflow needs repeatable handling
- a QA, release, or browser-validation rule becomes reusable
- a local draft uncovers a lesson future agents should not have to rediscover
- an incident produces a reusable operations or recovery lesson
- a feature request turns into a durable shared backlog idea

If the learning matters only to one draft, keep it local and distill only the reusable part here.

## Security Rules

- Never store secrets, tokens, credentials, raw env values, signed URLs, or PII in these notes.
- Summarize sensitive dependencies abstractly and point to durable docs instead of copying operational specifics.
- Do not promote raw incident artifacts into this folder; sanitize them first.
