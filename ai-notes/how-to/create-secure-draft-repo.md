Date: 2026-05-17 (Central Time)
Scope: Repeatable setup checklist for new secure draft repositories.
Status: Active
Applies To: New `draft-*` GitHub repositories
Source Of Truth:

- `docs/11-draft-lifecycle.md`
- `ai-notes/notes/secure-draft-release-workflow.md`
- `tools/draft-github-setup.mjs`
- `tools/draft-repo-preflight.mjs`
- `tools/draft-public-safety-audit.mjs`
- `docs/drafts-registry.json`

Confidence: Medium
Last Reviewed: 2026-07-14 (Central Time)

# Create A Secure Draft Repo

Use this checklist when creating a new draft repository after the secure release workflow is implemented.

## Preconditions

- Canonical domain is known.
- Production aliases are known.
- Test aliases are known or can be generated.
- Draft payload has passed the public-safety audit against current files and git history.
- AWS OIDC provider exists in the target AWS account.
- The hub repo and any source draft repo have been updated with `git pull --ff-only` when clean.
- `docs/drafts-registry.json` has or will receive the new draft domain, repo name, GitHub clone URL, and in-tree local path under `drafts/{domain}`.

## Setup Checklist

1. Create GitHub repository named `draft-{domain}`. Prefer private during initial import, then make it public only after the public-safety audit passes.
2. Add or update the draft entry in `docs/drafts-registry.json`.
3. Add sanitized draft payload and required public asset references only.
4. Run the bootstrap helper from the hub repo:

   ```bash
   npm run drafts:repo-bootstrap -- --repo=drafts/example.com --domain=example.com --authoring-endpoint=https://api.zoolandingpage.com.mx/config-authoring
   ```

   This copies the routed `AGENTS.md`, human `README.md`, compatibility `Codex.md`, pinned C1 caller, deployment workflows, OIDC deploy script, `.gitignore`, and non-secret `draft-repo.config.json`.
5. Confirm `.gitignore` excludes:
   - `.env*`
   - private keys and certificates
   - local databases
   - logs
   - PDFs and CV/source research files unless explicitly approved for public use
   - `ai_notes/`, `findings/`, and `errors-reports/`
   - generated reports and scratch folders
   - credential JSON, local agent state, and local cloud credential folders
6. Run the public-safety audit before the first push, before changing repository visibility, and before PR/merge:

   ```bash
   node tools/draft-public-safety-audit.mjs --repo=drafts/example.com --history=true
   ```

   Treat these as blocking findings:
   - tracked local-only folders or files
   - secret-looking assignments or token formats
   - private keys, certificates, `.env*`, local databases, exports, credential JSON, PDFs, CVs, office documents, or archives
   - matching files anywhere in git history

   Treat emails, phone/WhatsApp numbers, and identity-document keywords as review findings. They are allowed only when they are intentionally public draft content.
7. Run the repo preflight so missing registered repos are cloned and clean repos are pulled:

   ```bash
   node tools/draft-repo-preflight.mjs --pull=true
   ```

8. Create branches `dev`, `test`, and `main`.
9. Set default branch according to the adopted repo policy after pilot verification.
10. Protect `test`.
11. Protect `main`.
   - Public draft repos on GitHub Free support branch protection.
   - If the repo must remain private and GitHub returns `Upgrade to GitHub Pro or make this repository public`, record branch protection as blocked by plan. In that blocked state, the deploy workflows still reject push-triggered deploys unless the push is a merge commit from the expected source branch, but GitHub cannot block the direct push itself.
   - Read both protection documents back after writing them and require the complete expected status, PR, admin, force-push, deletion, and linear-history policy before continuing.
   - Pin the required `guard` check to the verified GitHub Actions app and require empty PR bypass user/team/app lists. Do not accept `app_id: -1`, an unpinned check, or named bypass identities.
12. Add required PR source guard check:
   - PR to `test` must come from `dev`.
   - PR to `main` must come from `test`.
   - Post-merge deploy validation must find exactly one associated merged PR for the deployed commit, from the same repository and exact source/base pair.
   - For the configured merge-commit-only policy, the deployed commit must have exactly two parents, its first parent must equal both the PR base SHA and a push event's `before` SHA, and its second parent must equal the PR head.
   - The validation job may receive only `contents: read` and `pull-requests: read`; OIDC remains isolated to the dependent deploy job for the exact validated commit.
   - For a push, compute the exact first-parent `name-status` diff. Only added or modified files in the verifier's code-owned 15-path rollout closure may skip authoring; outside changes require deployment, while delete/rename/type-change of an allowlisted control fails closed. Manual dispatch always deploys.
   - Build the closed deployment plan before OIDC. Bind its artifact name and SHA-256 manifest to run ID, run attempt, and target SHA; retain it for one day. Export the single numeric artifact ID, name, captured version ID, and SHA-256 of the manifest as validation-job outputs so the digest anchor is outside the artifact.
   - Derive official version IDs from environment, full target SHA, run ID, and run attempt. Require an explicit bounded version ID for local plan mode without GitHub run metadata.
   - Write plans only to a new relative path beneath the draft root. Reject absolute/traversal paths, missing or symlink/junction parents, and existing or linked targets. If the workflow replaces `.draft-deploy`, unlink a root link without following it and recursively remove only a verified real directory.
   - Do not put the authoring API endpoint, credentials, tokens, responses, fiscal PII, or raw provider payloads in the plan. `server-only` excludes data from the public runtime projection; it is not a confidentiality label for a public repository or artifact.
   - The OIDC job must not check out or execute repository code. Its first step must validate output grammar and artifact/version coordinates before downloading exactly one artifact by ID. Require the exact two-file set, external manifest digest, strict checksum, closed schema, exact coordinates/action order, structural path-kind metadata, and current target tip before configuring credentials, then use native `curl --aws-sigv4` with redacted failure output.
13. Add GitHub Environment `test`.
14. Add GitHub Environment `production`.
15. Restrict test environment deployment branches to `test`.
16. Restrict production environment deployment branches to `main`.
   - Use selected branch policies, not an unrestricted Environment or the broader "protected branches" option.
   - Read the Environment and its custom branch-policy list back after configuration; require exactly one branch rule.
17. Add non-secret environment variables:
   - canonical domain
   - deploy environment
   - role ARN
   - authoring endpoint
18. Create or attach AWS IAM test deploy role.
19. Create or attach AWS IAM production deploy role.
   - Test trust must require both `environment:test` and `ref:refs/heads/test`.
   - Production trust must require both `environment:production` and `ref:refs/heads/main`.
   - Generate the role set only from `docs/drafts-registry.json`, never by scanning arbitrary local draft folders.
   - Use the registry owner as canonical; reject a conflicting `--owner`, generated role-name collisions, invalid names, and names longer than IAM allows before any AWS mutation.
20. Generate or update role trust policies from repo/environment config, not by hand-editing unique JSON per repo.
21. Store role ARNs and domain metadata as non-secret GitHub Environment variables.
22. Confirm repo memory requires `git pull --ff-only` before work when clean, including pull checks for related draft repos in multi-repo tasks.
23. Confirm post-merge deploy workflow for `test`.
24. Confirm post-merge deploy workflow for `main`.
25. Verify test deploy against every test alias.
26. Verify production deploy against every production alias.
27. Run the hub routing audit:

   ```bash
   npm run fleet:knowledge -- --repo=draft-example-com
   ```

   When the Git checkout is an independent clone rather than the hub's in-tree draft source, add `--checkout-root=<directory-containing-repo-clones>`.

## Acceptance Checks

- No local-only folders or PII-risk files are tracked.
- `docs/drafts-registry.json` contains the draft's domain, repo, GitHub URL, and in-tree local path under `drafts/{domain}`.
- `node tools/draft-repo-preflight.mjs --pull=true` can clone missing registered repos and pull clean repos.
- `node tools/draft-public-safety-audit.mjs --history=true` passes for the draft repo before public visibility, PR, and merge.
- Direct push to `test` and `main` is blocked when native GitHub branch protection is available.
- If native branch protection is blocked by plan, direct-push deploys fail in the workflow guard and the limitation is documented.
- Public draft repos have `test` and `main` protected with required `guard` status and zero required approvals so the repository owner can merge after checks pass.
- `guard` is accepted only from the verified GitHub Actions app, and no user, team, or app has PR bypass allowance.
- Every writer/merger is explicitly treated as a trusted deployment authority while approvals remain at zero; broaden that set only after adding an independent approval or externally controlled immutable verifier.
- An applied setup reports failure when either protected branch could not be configured; it must not return a successful aggregate result based only on repository availability.
- PR from an invalid source branch is blocked by required checks.
- A synthetic merge using an older allowed source ancestor, a direct/forced push, an unrelated PR, or a fork PR cannot pass post-merge deploy provenance.
- A historical rerun fails when its commit is no longer the target branch tip, and environment-scoped concurrency prevents overlapping publishes.
- A tooling-only push skips authoring only when every change is an addition/modification in the exact rollout closure; manual dispatch and every content or non-allowlisted change deploy.
- A deployment artifact has one-day retention, a run/attempt/SHA-bound name, one numeric artifact ID, an external SHA-256 anchor for its manifest, an exact two-file set, and no authoring API endpoint, credentials, tokens, response bodies, fiscal PII, or raw provider payload.
- Plan output cannot escape the draft root or follow a symlink/junction through its parent or target, and the workflow's `.draft-deploy` replacement does not delete through a root link.
- The OIDC job has no checkout or repository-code execution and validates the closed plan plus current target tip immediately before credentials.
- Repeating validation for the same run attempt produces the same version ID; a new validation attempt produces a new version ID. Rerunning only a failed deploy consumes the captured validation artifact/name/version instead of recalculating them from the newer job attempt. `version_already_exists` remains a fail-closed error, and a partial upsert may leave an immutable unpublished version for future cleanup.
- A workflow committed only to `dev` cannot use either deployment Environment or assume either AWS deploy role.
- `dev` changes do not deploy.
- Clean target repos are pulled before work starts; dirty repos are reported before changes.
- Merge to `test` deploys only test aliases.
- Merge to `main` deploys only production aliases.
- AWS CloudTrail/API logs show assumed OIDC role, not long-lived AWS keys.
- `AGENTS.md` routes each task to one exact local or hub document; `README.md` points humans to that router; `Codex.md` does not duplicate procedures or chronology.
- The C1 caller references the reusable hub workflow by immutable commit SHA.
- `npm run fleet:knowledge -- --repo=draft-example-com` passes without changing files.

## Notes

Do not store API keys, AWS access keys, Secrets Manager values, signed URLs, or raw environment values in the repository. Store only references and non-secret configuration.
