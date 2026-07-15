# Agent Task Workflow

Date: 2026-07-11 (Central Time)
Scope: Shared workflow for AI agents and developers working in this repo.
Status: Active
Applies To: Every new draft task, feature task, or review task
Source Of Truth:

- `AGENTS.md`
- `docs/README.md`
- `docs/DEVELOPER_ONBOARDING.md`
- `docs/03-development-guide.md`

Confidence: High
Last Reviewed: 2026-07-11 (Central Time)

## Before Work

1. Start at `AGENTS.md`, then use `docs/README.md` to open the implementation contract for the task.
2. Read `docs/repository-map.md` only for cross-repository ownership or entrypoints.
3. Read `ai-notes/README.md` and one focused note only when reusable guidance is needed.
4. For an existing draft, start with its README and curated `ai_notes/README.md`; open findings/error history only when the task needs it.
5. Read changelogs only when historical implementation, QA, release, or publication evidence is relevant.

## During Work

- Keep durable reusable guidance in `ai-notes/`.
- Keep chronological app and draft history in `changelog/app/` or `changelog/drafts/`.
- Keep draft-specific history or investigation in `drafts/{domain}/ai_notes/`, `drafts/{domain}/findings/`, or `drafts/{domain}/errors-reports/`.
- Keep repo-level raw, temporary, or operational output untracked if you need it locally; do not make it part of the committed canonical tree.
- Put all process logs under `logs/`; do not leave `*.log` files in the repo root, `Output/`, `reports/`, `devonly/`, or draft folders.
- If a new reusable rule appears, update the appropriate committed note instead of letting it live only in chat history.
- Prefer reusable repo-local skills under `.github/skills/` before relying on globally installed copies of the same workflow.
- Keep shared or community prompts in `.github/prompts/` of `zoolandingpage` when they apply to more than one Zoolanding repo.
- Prefer repo-local prompt files under `.github/prompts/` for repeated workflows before inventing fresh one-off instructions in chat.
- Prefer repo-local custom agents under `.github/agents/` for repeated higher-order review roles.
- Use `ai-notes/notes/copilot-skill-routing.md` when choosing among installed general skills so repo-local workflows stay primary.
- Use `ai-notes/notes/workspace-ai-customization-rollout.md` when deciding whether a prompt or tool belongs in the shared workspace hub or in a single repo.

## After Work

- Distill any reusable lesson from local draft notes into a committed note.
- If no suitable note exists, create one from a template.
- Add a changelog entry only when the app or a draft needs retained chronological history for the completed pass.
- Audit the work, fix findings, and rerun the audit at least three times before declaring it correct.
- For changes that affect draft payloads or rendered behavior, finish with browser QA on every affected route in desktop and mobile. Documentation-only edits use link, workflow, and public-safety checks.
- Treat optional security UIs as supplemental evidence, never as a release gate. If one is unavailable or blank, record the failure and use deterministic tests, diff and secret scans, live policy readback when applicable, and an independent security-focused review; an empty view is not a clean result.
- Do a security scrub before saving the note.

## Security Scrub

- Remove secrets, credentials, tokens, signed URLs, raw env values, and PII.
- Replace volatile infrastructure specifics with reusable generalized guidance.
- Cite the source of truth for durable claims.
- If a tool result was incomplete or environment-specific, say so explicitly instead of generalizing.
