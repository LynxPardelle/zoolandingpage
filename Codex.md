# Zoolandingpage Codex Memory

## Canonical Paths

- Local draft source and scratch workspace: `drafts/`
- Local draft-specific notes: `drafts/{domain}/ai_notes/`, `drafts/{domain}/findings/`, and `drafts/{domain}/errors-reports/`
- Curated AI/developer guidance: [ai-notes/README.md](./ai-notes/README.md)
- Committed reusable rules and procedures: [ai-notes/](./ai-notes/)
- Note templates: [ai-notes/templates/](./ai-notes/templates/)
- Optional local-only scratch: `devonly/`
- Main implementation docs: `docs/`

## Current Decisions

- `drafts/` is the local authored draft tree and local per-draft scratch area.
- `drafts/{domain}/ai_notes/`, `drafts/{domain}/findings/`, and `drafts/{domain}/errors-reports/` are local-only and should not be treated as committed source of truth.
- `devonly/` is optional local-only untracked scratch if repo-level temporary investigation space is needed.
- `ai-notes/` is the curated, shared-first knowledge base that future agents and developers must read before new work.
- `AGENTS.md` plus this file are the repo-level agent hooks for v1.
- Notes should stay English-first to match repo documentation, while quoted source content may stay in its original language.
- Note headers should always include `Date`, `Scope`, `Status`, `Applies To`, `Source Of Truth`, `Confidence`, and `Last Reviewed`.
- Use Central Time for note dates and reviews.

## Naming Rules

- Iteration logs: `YYYY-MM-DD-topic.md`
- Visual baselines: `{page}-visual-baseline.md`
- General note filenames: kebab-case
- Use the existing templates before creating a new note type

## Closeout Checklist

Before ending a task:

1. Confirm the relevant shared notes were read first and inspect local draft notes when the task depends on an existing draft.
2. Update the canonical notes only if the task produced reusable guidance beyond one draft.
3. Keep draft-specific scratch notes in `drafts/{domain}/ai_notes/`, `drafts/{domain}/findings/`, or `drafts/{domain}/errors-reports/`.
4. Keep repo-level scratch or operational notes local-only if you need them; do not make them part of the committed canonical tree.
5. Remove or avoid any secrets, credentials, raw env values, signed URLs, or PII from the notes.
6. Update repo docs if the workflow changed.
7. Audit, fix, and rerun the audit at least three times before calling the work correct.
8. If draft behavior changed, finish with browser QA on every affected draft route in desktop and mobile viewports.

## Guardrails

- If notes and code disagree, verify against code and docs, then repair the notes.
- Do not let one-off debugging output become canonical guidance without distillation.
- Keep canonical notes focused on reusable decisions, constraints, QA rules, and workflows.
