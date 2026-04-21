---
name: zoolanding-frontend-workflow
description: 'Zoolanding Angular frontend workflow for SSR, draft preview, config-driven landing pages, authoring round-trips, and platform documentation updates. Use when changing Angular app code, draft payload behavior, runtime integration, analytics, quick stats, or local authoring tools in zoolandingpage.'
user-invocable: true
---

# Zoolanding Frontend Workflow

Use this skill for work inside the Angular app and its platform-facing docs.

## What Matters In This Repo

- This repo is the main source of truth for cross-platform behavior in the Zoolanding stack.
- Most mistakes come from confusing local draft files, authoring draft state, and published runtime state.
- Frontend changes often need matching documentation updates when payloads, endpoints, or workflows change.

## Workflow

1. Read the repo memory first.

   - Read `Codex.md`.
   - Read `ai-notes/README.md`.
   - Read the relevant committed note before editing.
   - Inspect `drafts/{domain}/ai_notes/`, `drafts/{domain}/findings/`, and `drafts/{domain}/errors-reports/` when the task depends on an existing local draft.

2. Identify which config state is involved.

   - `drafts/{domain}/...` means local draft source.
   - `drafts/{domain}/ai_notes/`, `drafts/{domain}/findings/`, and `drafts/{domain}/errors-reports/` mean local draft-specific history, investigation, or incident tracking.
   - authoring API means stored draft state.
   - runtime API means published live state.

3. Find the narrowest affected surface.

   - Angular UI and SSR behavior under `src/`
   - draft payload structure under `drafts/`
   - authoring or sync tooling under `tools/`
   - platform docs under `docs/`

4. Match existing platform conventions.

   - Reuse current runtime/config service boundaries in `src/app/shared/services/`.
   - Prefer the direct CLI form `node tools/config-draft-sync.mjs ...` when documenting authoring flows.
   - Keep platform behavior explanations in this repo when the change affects other services.

5. Verify with the smallest useful check.

   - Use the Docker tasks already defined for lint and tests when code changes affect Angular behavior.
   - Use the draft smoke check when route rendering, aliases, or draft payloads are involved.
   - Use focused manual preview URLs when a full automation path is unnecessary.
   - Before closing draft-affecting work, audit the change three times and run browser QA on every affected draft route in both desktop and mobile viewports.

6. Update docs in the same change when needed.
   - If payloads, workflows, endpoints, or platform interactions change, update the relevant docs.
   - If the work produced reusable guidance, update `ai-notes/` before closing the task and keep draft-specific detail local under `drafts/{domain}/ai_notes/`, `drafts/{domain}/findings/`, or `drafts/{domain}/errors-reports/`.

## Verification Heuristics

- SSR or host-sensitive changes: verify allowed hosts and a real draft URL.
- Draft/runtime bootstrap changes: verify the correct state source is being loaded.
- Analytics or quick-stats changes: verify frontend config gates still control network behavior.
- Tooling changes: verify the direct `node tools/config-draft-sync.mjs ...` path still works as documented.

## Resources

- [Repo Checklist](./references/repo-checklist.md)
- [Canonical AI Notes](../../../ai-notes/README.md)
