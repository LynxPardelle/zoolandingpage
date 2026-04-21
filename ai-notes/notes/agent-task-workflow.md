# Agent Task Workflow

Date: 2026-04-19 (Central Time)
Scope: Shared workflow for AI agents and developers working in this repo.
Status: Active
Applies To: Every new draft task, feature task, or review task
Source Of Truth:

- `AGENTS.md`
- `Codex.md`
- `docs/DEVELOPER_ONBOARDING.md`
- `docs/03-development-guide.md`

Confidence: High
Last Reviewed: 2026-04-20 (Central Time)

## Before Work

1. Read `Codex.md`.
2. Read `ai-notes/README.md`.
3. Read the relevant committed notes for the task.
4. If the task touches an existing local draft, inspect `drafts/{domain}/ai_notes/`, `drafts/{domain}/findings/`, and `drafts/{domain}/errors-reports/` when available.
5. Read the implementation docs for the task area.

## During Work

- Keep durable reusable guidance in `ai-notes/`.
- Keep draft-specific history or investigation in `drafts/{domain}/ai_notes/`, `drafts/{domain}/findings/`, or `drafts/{domain}/errors-reports/`.
- Keep repo-level raw, temporary, or operational output untracked if you need it locally; do not make it part of the committed canonical tree.
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
- Audit the work, fix findings, and rerun the audit at least three times before declaring it correct.
- For draft-affecting tasks, finish with browser QA on every affected draft route in both desktop and mobile viewports.
- Do a security scrub before saving the note.

## Security Scrub

- Remove secrets, credentials, tokens, signed URLs, raw env values, and PII.
- Replace volatile infrastructure specifics with reusable generalized guidance.
- Cite the source of truth for durable claims.
- If a tool result was incomplete or environment-specific, say so explicitly instead of generalizing.
