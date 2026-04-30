# Copilot Skill Routing

Date: 2026-04-21 (Central Time)
Scope: Repo-specific guidance for choosing among installed general skills in Zoolandingpage.
Status: Active
Applies To: Angular app work, draft authoring, browser QA, reviews, release checks, and cross-repo platform changes.
Source Of Truth:

- `AGENTS.md`
- `Codex.md`
- `ai-notes/README.md`
- `.github/skills/zoolanding-frontend-workflow/SKILL.md`
- `.github/agents/zoolanding-production-readiness.agent.md`
- `.github/agents/zoolanding-config-platform-audit.agent.md`

Confidence: High
Last Reviewed: 2026-04-30 (Central Time)

## Vendored Repo-Local Skills

These skills now live under `.github/skills/` so the repo carries its own reusable operating layer:

- `karpathy-guidelines` is the default execution lens for Angular, tooling, and sibling-Lambda code work.
- `systematic-debugging` should be loaded before fixing preview, SSR, config bootstrap, analytics, quick-stats, or integration failures.
- `risk-review` is the default review-only lens for diffs, regressions, and findings-first assessments.
- `test-driven-development` is the default for behavior-changing code in Angular services, tools, and Lambda handlers, but it is not the default for draft JSON, content-only, or docs-only edits.
- `zoolanding-browser-qa` is the default browser-validation workflow for draft routes, SSR output, responsive behavior, console checks, and network validation.
- `zoolanding-lighthouse-release-audit` is the default repo-local workflow for Lighthouse performance/accessibility remediation, SSR draft route regressions, language persistence, testing deploys, and Reports Lighthouse artifacts.
- `zoolanding-pr-followup` is the default repo-local entrypoint for CI, reviewer feedback, and merge-readiness follow-up on active PRs.

## Optional Global Companions

- `frontend-skill` for explicit landing-page visual design or layout work.
- `harden` for production-hardening passes, edge cases, and resilience work.
- `polish` for final UI finish work after the main implementation is stable.
- `agent-browser` for browser automation when paired with `zoolanding-browser-qa`.
- `chrome-devtools` for live inspection, console, network, DOM, or performance evidence.
- `dogfood` for exploratory QA and bug hunts that need broader reproduction evidence than the explicit affected routes.
- `audit` for explicit technical UI audits, not as the default closeout path.
- `ssr-lighthouse-release-audit` for similar SSR/Lighthouse/deploy workflows outside Zoolandingpage.
- `orchestration` for true multi-repo work that benefits from coordinated parallel execution.
- `devops-rollout-plan` for risky deploy, routing, CDN, or API front-door changes.
- `gh-pr-check`, `gh-fix-pr`, and `gh-address-comments` for active PR workflows when paired with `zoolanding-pr-followup`.

## De-prioritized Skills

- `cloud-design-patterns` is not the default choice for normal Zoolandingpage Angular, draft, or docs work.
- `terraform-skill` is not the default choice for normal Zoolandingpage Angular, draft, or docs work.

## Reusable Rule

- Prefer the repo-local frontend workflow skill, vendored repo-local skills, prompts, and custom agents first; then add only the narrowest global skill needed.
- Shared prompts or other community AI tools that apply across multiple Zoolanding repos should live in `zoolandingpage/.github/prompts/` because this repo owns the workspace file.
