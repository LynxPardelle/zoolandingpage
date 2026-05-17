Date: 2026-05-17 (Central Time)
Scope: Secure release workflow for per-draft GitHub repositories.
Status: Active
Applies To: Draft repos named `draft-*`, config authoring API, runtime-read alias resolution, GitHub Actions deployments
Source Of Truth:

- `plan/feature-secure-draft-repo-release-workflow-1.md`
- `Codex.md`
- User direction from 2026-05-16 planning conversation
- Official GitHub and AWS OIDC guidance

Confidence: Medium
Last Reviewed: 2026-05-17 (Central Time)

# Secure Draft Release Workflow

## Durable Direction

Draft publishing should move from local direct authoring API calls to post-merge GitHub Actions deployments.

The promotion path is:

1. `dev` -> pull request -> `test` -> deploy test after merge.
2. `test` -> pull request -> `main` -> deploy production after merge.

`dev` is the only intended unprotected branch and does not deploy. `test` and `main` deploy only after changes land and are protected with the required `guard` status plus one approving review. Workflows also verify merge-source history before deployment.

## OIDC And IAM Rule

Use one GitHub OIDC identity provider per AWS account, but do not use one broad production deploy role for every repository.

Preferred shape:

- one test role per draft repository
- one production role per draft repository
- trust policy constrained by GitHub repository and environment
- Lambda-side authorization constrained by action, canonical domain, aliases, and environment

This keeps blast radius small while staying operationally manageable through bootstrap automation.

Approved target: use separate deploy trust per draft repository and environment. Keep it easy to configure by generating IAM roles, GitHub Environments, environment variables, and workflow files from a repeatable bootstrap command or IaC template. Store role ARNs and domain metadata as non-secret config; do not store long-lived AWS keys.

Current hub helpers:

- `npm run drafts:repo-preflight` checks the hub repo and local sibling `draft-*` repos, pulling clean repos with `git pull --ff-only` and refusing dirty repos.
- `npm run drafts:repo-bootstrap -- --repo=../draft-example-com --domain=example.com --authoring-endpoint=https://o4upx3fsz3d3dwfwz4lbnefjze0eetyn.lambda-url.us-east-1.on.aws/` copies the standard draft repo templates.
- `npm run drafts:aws-oidc-setup` creates or updates per-draft/per-environment IAM roles and prints the Lambda authorization matrix.
- `npm run drafts:github-setup` clones/configures draft repos, writes templates, creates `dev`/`test` branches, configures GitHub Environments, sets non-secret environment variables, and attempts branch protection.

GitHub Actions deploys use the IAM-protected Lambda Function URL, not the public custom authoring API front door. The custom/API Gateway endpoint still returns `403` for unsigned requests.

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

If GitHub branch protection is unavailable for a future private repo under the active account plan, record the exact GitHub error and keep the deploy workflow guard active. That guard must reject push-triggered deploys unless `test` receives a merge commit whose second parent is on `origin/dev`, or `main` receives a merge commit whose second parent is on `origin/test`. This prevents accidental automatic deploys from direct pushes, but it is not a substitute for true branch protection because it cannot stop the push itself.

## Agent Workflow Rule

Before any Zoolanding or draft repo work, run `git pull --ff-only` in every target repo when the worktree is clean. For multi-repo work, this includes the hub repo plus every affected `draft-*` repo. If any target repo is dirty, stop for that repo and report the dirty state instead of pulling over local changes.

After this workflow is implemented, Git is the source of truth for draft content. Do not use S3 published state as the normal freshness check before work. Use S3/API inspection only for incident response, migration verification, or deploy verification.

When a new draft repo is created, copy this pull rule into that repo's `Codex.md` or equivalent repo memory so future agents do not rely only on the hub memory.

## Active State

As of 2026-05-17 CT, the authoring API requires IAM-signed requests, runtime-read supports environment-aware published pointers, OIDC roles exist for the current draft repos, and the current public `draft-*` repos have `dev`, `test`, and `main` branches plus GitHub Environment variables. GitHub Actions were bootstrapped with `[skip ci]`; no initial deploy ran during setup. A manual pilot deploy for `draft-zoolandingpage-com-mx` test passed through GitHub OIDC and published `test.zoolandingpage.com.mx` to the test environment without changing the production pointer.

After public-safety audit, the current draft repos were made public and native GitHub branch protection was applied on `test` and `main` with required `guard` status checks and one approving review.
