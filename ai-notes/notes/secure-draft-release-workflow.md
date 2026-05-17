Date: 2026-05-16 (Central Time)
Scope: Secure release workflow for per-draft GitHub repositories.
Status: Planned
Applies To: Draft repos named `draft-*`, config authoring API, runtime-read alias resolution, GitHub Actions deployments
Source Of Truth:

- `plan/feature-secure-draft-repo-release-workflow-1.md`
- `Codex.md`
- User direction from 2026-05-16 planning conversation
- Official GitHub and AWS OIDC guidance

Confidence: Medium
Last Reviewed: 2026-05-16 (Central Time)

# Secure Draft Release Workflow

## Durable Direction

Draft publishing should move from local direct authoring API calls to post-merge GitHub Actions deployments.

The promotion path is:

1. `dev` -> pull request -> `test` -> deploy test after merge.
2. `test` -> pull request -> `main` -> deploy production after merge.

`dev` is the only unprotected branch and does not deploy. `test` and `main` are protected and deploy only after changes land.

## OIDC And IAM Rule

Use one GitHub OIDC identity provider per AWS account, but do not use one broad production deploy role for every repository.

Preferred shape:

- one test role per draft repository
- one production role per draft repository
- trust policy constrained by GitHub repository and environment
- Lambda-side authorization constrained by action, canonical domain, aliases, and environment

This keeps blast radius small while staying operationally manageable through bootstrap automation.

## Alias And Environment Rule

Production aliases resolve to the production published draft. Test aliases resolve to the test published draft.

Examples for `pamelabetancourt.com`:

- production: `pamelabetancourt.com`
- test: `test.pamelabetancourt.com`
- test: `test.pamelabetancourt.zoolandingpage.com.mx`

Runtime resolution should use alias metadata to select the environment-specific published pointer.

## New Draft Repo Rule

When a new draft is created, create and configure its GitHub repository as part of the draft setup:

1. Private repo named `draft-{domain}`.
2. Branches: `dev`, `test`, `main`.
3. Protected `test` and `main`.
4. Required PR source guard: only `dev -> test` and `test -> main`.
5. GitHub Environments: `test` and `production`.
6. Post-merge deploy workflows for `test` and `main`.
7. OIDC role references for each environment.
8. `.gitignore` that keeps local-only context, PII, credentials, logs, PDFs, private keys, and scratch folders out of git.
9. Secret/PII scan before deploy.

## Agent Workflow Rule

Before draft repo work, run `git pull --ff-only` when the worktree is clean. If the worktree is dirty, stop and report the dirty state instead of pulling over local changes.

After this workflow is implemented, Git is the source of truth for draft content. Do not use S3 published state as the normal freshness check before work. Use S3/API inspection only for incident response, migration verification, or deploy verification.

## Not Yet Active

This is the target workflow, not the current deployed system. Current active docs still contain local authoring API push/publish commands until the API hardening, workflows, branch protections, and runtime alias changes are implemented and verified.
