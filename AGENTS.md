# Zoolandingpage Agent Workflow

Use this file as the repo-level entrypoint for future AI agents and new contributors.

## Read Order Before Editing

1. Read [Codex.md](./Codex.md).
2. Read [ai-notes/README.md](./ai-notes/README.md).
3. Read [ai-notes/notes/copilot-skill-routing.md](./ai-notes/notes/copilot-skill-routing.md) when the task depends on choosing among installed general skills.
4. Read the most relevant committed note under [ai-notes/](./ai-notes/).
5. If the task touches an existing local draft, inspect `drafts/{domain}/ai_notes/`, `drafts/{domain}/findings/`, and `drafts/{domain}/errors-reports/` when those folders exist.
6. Read the implementation docs that match the task, especially under [docs/](./docs/).

## Working Rules

- Treat `drafts/` as the local draft source tree and local draft-specific scratch workspace.
- Treat `drafts/{domain}/ai_notes/`, `drafts/{domain}/findings/`, and `drafts/{domain}/errors-reports/` as local-only historical, investigative, or incident material, not as canonical committed guidance.
- Treat [ai-notes/](./ai-notes/) as the shared, curated, long-lived knowledge base for reusable workflow guidance.
- Treat `devonly/` only as optional local-only untracked scratch if you need repo-level temporary investigation space.
- During work, update committed notes only when the lesson is reusable beyond one draft. Use the templates in [ai-notes/templates/](./ai-notes/templates/) instead of inventing new note shapes.
- After finishing work, distill reusable learnings back into the canonical folder and keep draft-specific detail in `drafts/{domain}/ai_notes/`, `drafts/{domain}/findings/`, or `drafts/{domain}/errors-reports/`.
- Keep note timestamps in Central Time.

## Closeout Mantra

- Before declaring a task correct, audit it, fix what you find, and rerun the audit at least three times.
- For draft-affecting work, finish with browser QA on every affected draft route in both desktop and mobile viewports and correct any issue found there before closing.

## Safety And Security Rules

- Do not store secrets, credentials, tokens, raw environment-variable values, signed URLs, private customer data, or other PII in any note.
- If a workflow depends on sensitive data, describe the dependency abstractly instead of copying the sensitive detail into committed notes.
- If code or runtime behavior disagrees with a note, do not guess. Record the mismatch and update the reusable note after verification.

## Update Triggers

Update the canonical shared notes when you:

- discover a reusable visual-parity rule or authoring constraint
- find a routing, slug, embed, or Angora limitation that will affect future work
- identify a durable QA, release, or authoring workflow improvement
- extract a reusable rule from one draft that future drafts should inherit
