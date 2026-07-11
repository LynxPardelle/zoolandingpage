# Workspace AI Customization Rollout

Date: 2026-07-11 (Central Time)
Scope: Shared AI customization rollout and hub responsibilities across the Zoolanding multi-root workspace.
Status: Active
Applies To: Shared prompts, workspace-level tooling, cross-repo customization audits, and multi-repo handoff notes.
Source Of Truth:

- `AGENTS.md`
- `docs/repository-map.md`
- `docs/drafts-registry.json`
- `zoolandingpage.code-workspace`
- `ai-notes/README.md`
- `ai-notes/notes/copilot-skill-routing.md`
- `.github/prompts/`
- sibling repo `.github/` customizations in this workspace

Confidence: High
Last Reviewed: 2026-07-11 (Central Time)

## Workspace Decision

`zoolandingpage` is the canonical home for shared or community AI tooling across the mapped Zoolanding repositories. [docs/repository-map.md](../../docs/repository-map.md) and [docs/drafts-registry.json](../../docs/drafts-registry.json) define the inventory; the checked-in VS Code workspace is only a curated convenience view.

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

## Ownership Boundary

- `zoolandingpage` owns the shared prompt hub, frontend/draft workflows, fleet routing, and cross-repository audit prompts.
- Each service owns customizations that encode its runtime contract, trust boundary, validation, deployment, or rollback behavior.
- Generic engineering guidance should be referenced from the hub or a global installation, not copied into every service repository.
- A local customization is not promoted merely because two old copies happen to match; verify that the underlying repository semantics are actually shared.

## Reusable Rule

- If a prompt, note, or other AI tool applies to more than one Zoolanding repo, add the community version in `zoolandingpage` first.
- Keep only the service-specific layer inside each Lambda repo.
- Prefer referencing the shared hub asset from local repo docs instead of cloning the same community prompt into every repo.
- Derive audit scope from the repository map and draft registry, never from the VS Code workspace or a hard-coded sibling list.
