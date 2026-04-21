# Shared Draft Authoring Rules

Date: 2026-04-19 (Central Time)
Scope: Shared rules for durable draft authoring and documentation workflow.
Status: Active
Applies To: All local drafts and future config-driven landing-page work
Source Of Truth:

- `docs/03-development-guide.md`
- `docs/11-draft-lifecycle.md`
- `docs/DEVELOPER_ONBOARDING.md`
- Promoted from local draft notes and findings

Confidence: High
Last Reviewed: 2026-04-20 (Central Time)

## Core Workflow

1. Start in local draft mode first.
2. Open the intended draft with explicit `draftDomain` and `draftPageId`.
3. Keep shared shell work at the domain root and page-specific work at the page root.
4. Validate locally before pushing or publishing.
5. Distill durable learnings into `ai-notes/` before closing the task.

## Ownership Rules

- Use domain-root files for shared shell, shared variables, shared combos, and shared i18n defaults.
- Use page-root files for route-specific structure, overrides, and page-level SEO or analytics.
- Prefer explicit containers and authored structure over large rich-text blobs when exact placement matters.

## Link And Navigation Rules

- Use production-safe relative paths such as `/contact` or `/servicios` inside authored payloads.
- Reserve `draftDomain` and `draftPageId` query parameters for local preview URLs only.
- When a live route needs an accented or otherwise fragile slug, use a safe internal route id and map the live-like alias in config.

## Documentation Rules

- Before new work, read the relevant committed notes and inspect local draft `ai_notes/`, `findings/`, and `errors-reports/` folders when they exist.
- After new work, update baselines, constraints, procedures, incident notes, or future ideas if the learning is durable.
- Keep repo-level local-only scratch untracked if you need it; do not commit it as canonical guidance.

## Validation Rules

- Distinguish local draft files, authoring draft state, and published runtime state.
- If a visual change is missing, verify state in that order instead of guessing.
- If notes and code disagree, verify against code and fix the note.
