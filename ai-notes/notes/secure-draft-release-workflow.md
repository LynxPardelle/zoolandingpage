Date: 2026-05-17 (Central Time)
Scope: Secure release workflow for per-draft GitHub repositories.
Status: Active
Applies To: Draft repos named `draft-*`, config authoring API, runtime-read alias resolution, GitHub Actions deployments
Source Of Truth:

- `docs/11-draft-lifecycle.md`
- `docs/drafts-registry.json`
- `tools/draft-github-setup.mjs`
- `tools/draft-repo-preflight.mjs`
- `tools/draft-public-safety-audit.mjs`
- User direction from 2026-05-16 planning conversation
- Official GitHub and AWS OIDC guidance

Confidence: High
Last Reviewed: 2026-07-14 (Central Time)

# Secure Draft Release Workflow

## Durable Direction

Draft publishing should move from local direct authoring API calls to post-merge GitHub Actions deployments.

The promotion path is:

1. `dev` -> pull request -> `test` -> deploy test after merge.
2. `test` -> pull request -> `main` -> deploy production after merge.

`dev` is the only intended unprotected branch and does not deploy. `test` and `main` deploy only after changes land and are protected with the required `guard` status and zero required approvals so the repository owner can merge their own PRs after checks pass. Deployment workflows query the read-only GitHub associated-pull-request endpoint and require one exact, merged, same-repository `dev -> test` or `test -> main` PR for the deployed commit. Because draft repos allow only merge commits, they also require exactly two parents, the PR head as the second parent, and—for push events—the event's prior target SHA as the first parent.

Zero approvals makes every identity with write and merge access a trusted deployment authority: that identity can change the repository-owned workflow/verifier and promote it. This is acceptable only while all writers are fully trusted operators. If the writer set expands, add an independent required approval or host the privileged verifier in an immutable reusable workflow controlled outside each draft repo.

## OIDC And IAM Rule

Use one GitHub OIDC identity provider per AWS account, but do not use one broad production deploy role for every repository.

Preferred shape:

- one test role per draft repository
- one production role per draft repository
- required `guard` status pinned to the GitHub Actions app, with no PR bypass users, teams, or apps
- trust policy constrained by GitHub repository, environment, and exact deployment branch ref
- GitHub Environment deployment policy constrained independently to `test` for test and `main` for production
- Lambda-side authorization constrained by action, canonical domain, aliases, and environment

This keeps blast radius small while staying operationally manageable through bootstrap automation. The AWS role inventory comes only from `docs/drafts-registry.json`; a local draft folder that is not registered must never mint a role. The registry owner is canonical, and setup must reject a conflicting CLI owner, duplicate generated role names, or names outside IAM's supported bounds before it creates or changes any AWS resource.

Approved target: use separate deploy trust per draft repository and environment. Keep it easy to configure by generating IAM roles, GitHub Environments, environment variables, and workflow files from a repeatable bootstrap command or IaC template. Store role ARNs and domain metadata as non-secret config; do not store long-lived AWS keys.

Current hub helpers:

- `node tools/draft-repo-preflight.mjs --pull=true` reads `docs/drafts-registry.json`, clones missing registered `draft-*` remote repos into their in-tree `drafts/{domain}` local paths, pulls clean repos with `git pull --ff-only`, and refuses dirty or invalid repos.
- `npm run drafts:repo-bootstrap -- --repo=drafts/example.com --domain=example.com --authoring-endpoint=https://api.zoolandingpage.com.mx/config-authoring` copies the standard draft repo templates.
- `npm run drafts:aws-oidc-setup` audits every registered test/production role and prints the Lambda authorization matrix. Mutations require one explicit `--environment=test|production`; the helper resolves that environment's Config Authoring Lambda from its CloudFormation stack, verifies the exact live `AWS_IAM`/`BUFFERED` Function URL, and writes only drifted role trust or invocation policy documents.
- `npm run drafts:github-setup` clones/configures draft repos, writes templates, creates `dev`/`test` branches, configures GitHub Environments, sets non-secret environment variables, and attempts branch protection.
- `npm run fleet:knowledge` audits registered draft and pilot satellite entrypoints, exact hub routes, remotes, branches, workflows, and immutable C1 callers. `--apply` changes only marked routing blocks and C1 in explicitly selected clean repositories; it never commits, pushes, merges, or changes cloud/GitHub configuration.

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

1. Repo named `draft-{domain}`.
2. `docs/drafts-registry.json` entry with domain, repo, GitHub URL, and in-tree local path under `drafts/{domain}`.
3. Branches: `dev`, `test`, `main`.
4. Protected `test` and `main`.
5. Required PR source guard: only `dev -> test` and `test -> main`.
6. GitHub Environments: `test` and `production`.
7. Post-merge deploy workflows for `test` and `main`.
8. OIDC role references for each environment.
9. `.gitignore` that keeps local-only context, PII, credentials, logs, PDFs, private keys, and scratch folders out of git.
10. Secret/PII scan before deploy.

If GitHub branch protection is unavailable for a future private repo under the active account plan, record the exact GitHub error and keep the deploy workflow guard active. The setup command must return `ok: false` whenever either `test` or `main` remains unprotected, and it must not configure deployment Environments or variables after that failure. A successful protection write is not enough: setup must read the branch and Environment rules back and compare the complete required policy. The deploy guard still requires the exact associated merged PR, merge-parent evidence, and current target tip, so an invalid or historical push cannot deploy, but it is not a substitute for true branch protection because it cannot stop the push itself. Environment branch policy and the independent AWS OIDC `ref` condition remain mandatory defense in depth.

The immediate pre-OIDC tip check plus per-environment concurrency blocks ordinary historical reruns and overlapping successful promotions. A narrow residual race remains if a newer push starts but fails validation before it reaches the deploy job: the older already-running deploy can finish. This does not widen OIDC trust, but it can publish an obsolete commit. Treat a server-side latest-approved-SHA compare-and-set at the authoring boundary as the future closure if operational evidence shows this race matters.

## Agent Workflow Rule

Before any Zoolanding or draft repo work, run `node tools/draft-repo-preflight.mjs --pull=true`. It must confirm every registered draft repo is available locally, clone any missing registered repo, and run `git pull --ff-only` in every target repo when the worktree is clean. If any target repo is dirty, stop for that repo and report the dirty state instead of pulling over local changes.

After this workflow is implemented, Git is the source of truth for draft content. Do not use S3 published state as the normal freshness check before work. Use S3/API inspection only for incident response, migration verification, or deploy verification.

When a new draft repo is created, copy this pull rule into that repo's `Codex.md` or equivalent repo memory so future agents do not rely only on the hub memory.

## Active State

As of 2026-05-17 CT, the authoring API requires IAM-signed requests, runtime-read supports environment-aware published pointers, OIDC roles exist for the current draft repos, and the current public `draft-*` repos have `dev`, `test`, and `main` branches plus GitHub Environment variables. GitHub Actions were bootstrapped with `[skip ci]`; no initial deploy ran during setup. A manual pilot deploy for `draft-zoolandingpage-com-mx` test passed through GitHub OIDC and published `test.zoolandingpage.com.mx` to the test environment without changing the production pointer.

After public-safety audit, the current draft repos were made public and native GitHub branch protection was applied on `test` and `main` with required `guard` status checks and zero required approvals.

Read-only audit on 2026-07-14 CT confirmed the 22 registered `test`/`main` branch-protection endpoints require strict `guard`, a PR, admin enforcement, and no force-push/deletion or named PR bypass. All 22 currently leave `guard` unpinned to a GitHub App. It also confirmed that the 22 live GitHub Environments are still unrestricted and their 22 AWS roles still lack the exact branch `ref`; checked-out draft workflows still use the older general-ancestor proof. The exact-PR verifier, GitHub Actions app pin, selected-branch Environment policy, exact-ref IAM trust, readback checks, and concurrency are local target controls only until a separately authorized fleet rollout changes GitHub and AWS. GitHub's public app endpoint identified `github-actions` as app ID `15368` during this audit; if that identity ever changes or the API rejects it, fail closed and reverify rather than substituting an app ID.
