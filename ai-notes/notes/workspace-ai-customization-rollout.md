# Workspace AI Customization Rollout

Date: 2026-04-21 (Central Time)
Scope: Shared AI customization rollout and hub responsibilities across the Zoolanding multi-root workspace.
Status: Active
Applies To: Shared prompts, workspace-level tooling, cross-repo customization audits, and multi-repo handoff notes.
Source Of Truth:

- `zoolandingpage.code-workspace`
- `AGENTS.md`
- `Codex.md`
- `ai-notes/README.md`
- `ai-notes/notes/copilot-skill-routing.md`
- `.github/prompts/`
- sibling repo `.github/` customizations in this workspace

Confidence: High
Last Reviewed: 2026-04-21 (Central Time)

## Workspace Decision

`zoolandingpage` is the canonical home for shared or community AI tooling in this workspace because it owns the checked-in `zoolandingpage.code-workspace` file used by Visual Studio Code.

Shared prompts, rollout notes, and other community guidance that apply to more than one Zoolanding repo should live here unless there is a strong reason to keep them repo-local.

## Shared Hub Assets In This Repo

- workspace file and prompt recommendations in `zoolandingpage.code-workspace`
- shared draft prompts in `.github/prompts/draft-smoke-check.prompt.md` and `.github/prompts/draft-round-trip.prompt.md`
- shared workspace prompts in `.github/prompts/workspace-ai-customization-audit.prompt.md` and `.github/prompts/workspace-change-summary.prompt.md`
- shared skill-routing and community guidance in `ai-notes/notes/`

## Repo-Local Assets That Stay Local

- service-specific deploy prompts such as each Lambda repo `sam-deploy-check.prompt.md`
- service-specific workflow skills such as each repo `zoolanding-lambda-workflow`
- repo-local agents and skills that describe one service contract or deployment surface

## Rollout Summary

- `zoolandingpage` owns the workspace file, shared prompt hub, frontend workflow skill, browser QA skill, PR follow-up skill, and canonical routing notes.
- `zoolanding-data-dropper-lambda` vendors its own Lambda workflow layer, deploy prompt, PR follow-up skill, and audit agents for the analytics sink.
- `zoolanding-quick-stats-lambda` vendors the same portable Lambda workflow layer for quick-stats behavior and deploy review.
- `zoolanding-config-authoring` vendors the same portable Lambda workflow layer for authoring contract work and deploy review.
- `zoolanding-config-runtime-read` vendors the same portable Lambda workflow layer for runtime bundle resolution and deploy review.
- `zoolanding-image-upload` vendors the same portable Lambda workflow layer for image-upload behavior, packaging, and deploy review.

## Reusable Rule

- If a prompt, note, or other AI tool applies to more than one Zoolanding repo, add the community version in `zoolandingpage` first.
- Keep only the service-specific layer inside each Lambda repo.
- Prefer referencing the shared hub asset from local repo docs instead of cloning the same community prompt into every repo.
