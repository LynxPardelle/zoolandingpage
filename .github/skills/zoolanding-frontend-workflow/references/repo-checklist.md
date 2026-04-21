# Repo Checklist

## Primary Areas

- `Codex.md` and `ai-notes/` for canonical repo memory and durable workflow guidance
- `drafts/{domain}/ai_notes/`, `drafts/{domain}/findings/`, and `drafts/{domain}/errors-reports/` for local draft-specific context when it exists
- `src/app/shared/services/` for runtime, analytics, quick stats, and SEO boundaries
- `drafts/` for local draft source files
- `tools/config-draft-sync.mjs` for pack, pull, push, create, and publish flows
- `docs/` for platform-level behavior and contributor guidance

## Typical Checks

- Read the relevant AI notes before changing payloads, workflow docs, or runtime behavior.
- Run the relevant Docker lint or test task when Angular code changes.
- Use a draft preview URL with `draftDomain` and `draftPageId` when validating runtime resolution.
- Use `node tools/draft-smoke-check.mjs --local-base-url=http://127.0.0.1:4200` when draft routes or aliases change.
- Before closing a draft-affecting task, audit it three times and run browser QA in desktop and mobile viewports on every affected draft route.
- Keep docs aligned when endpoint behavior, payload contracts, or workflows move.
- Distill durable findings back into `ai-notes/` before closing the task.

## Common Pitfalls

- Mixing local draft state with authoring or published runtime state.
- Documenting CLI wrappers when the direct Node command is clearer.
- Changing cross-platform behavior in code without updating the main platform docs.
