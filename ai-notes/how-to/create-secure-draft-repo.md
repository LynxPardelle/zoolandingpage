Date: 2026-05-17 (Central Time)
Scope: Repeatable setup checklist for new secure draft repositories.
Status: Active
Applies To: New `draft-*` GitHub repositories
Source Of Truth:

- `plan/feature-secure-draft-repo-release-workflow-1.md`
- `ai-notes/notes/secure-draft-release-workflow.md`
- `Codex.md`
- `docs/drafts-registry.json`

Confidence: Medium
Last Reviewed: 2026-05-17 (Central Time)

# Create A Secure Draft Repo

Use this checklist when creating a new draft repository after the secure release workflow is implemented.

## Preconditions

- Canonical domain is known.
- Production aliases are known.
- Test aliases are known or can be generated.
- Draft payload has passed the public-safety audit against current files and git history.
- AWS OIDC provider exists in the target AWS account.
- The hub repo and any source draft repo have been updated with `git pull --ff-only` when clean.
- `docs/drafts-registry.json` has or will receive the new draft domain, repo name, GitHub clone URL, and sibling local path.

## Setup Checklist

1. Create GitHub repository named `draft-{domain}`. Prefer private during initial import, then make it public only after the public-safety audit passes.
2. Add or update the draft entry in `docs/drafts-registry.json`.
3. Add sanitized draft payload and required public asset references only.
4. Run the bootstrap helper from the hub repo:

   ```bash
   npm run drafts:repo-bootstrap -- --repo=../draft-example-com --domain=example.com --authoring-endpoint=https://o4upx3fsz3d3dwfwz4lbnefjze0eetyn.lambda-url.us-east-1.on.aws/
   ```

   This copies the standard repo memory, GitHub Actions workflow templates, OIDC deploy script, `.gitignore`, and non-secret `draft-repo.config.json`.
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
   node tools/draft-public-safety-audit.mjs --repo=../draft-example-com --history=true
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
12. Add required PR source guard check:
   - PR to `test` must come from `dev`.
   - PR to `main` must come from `test`.
13. Add GitHub Environment `test`.
14. Add GitHub Environment `production`.
15. Restrict test environment deployment branches to `test`.
16. Restrict production environment deployment branches to `main`.
17. Add non-secret environment variables:
   - canonical domain
   - deploy environment
   - role ARN
   - authoring endpoint
18. Create or attach AWS IAM test deploy role.
19. Create or attach AWS IAM production deploy role.
20. Generate or update role trust policies from repo/environment config, not by hand-editing unique JSON per repo.
21. Store role ARNs and domain metadata as non-secret GitHub Environment variables.
22. Confirm repo memory requires `git pull --ff-only` before work when clean, including pull checks for related draft repos in multi-repo tasks.
23. Confirm post-merge deploy workflow for `test`.
24. Confirm post-merge deploy workflow for `main`.
25. Verify test deploy against every test alias.
26. Verify production deploy against every production alias.

## Acceptance Checks

- No local-only folders or PII-risk files are tracked.
- `docs/drafts-registry.json` contains the draft's domain, repo, GitHub URL, and local sibling path.
- `node tools/draft-repo-preflight.mjs --pull=true` can clone missing registered repos and pull clean repos.
- `node tools/draft-public-safety-audit.mjs --history=true` passes for the draft repo before public visibility, PR, and merge.
- Direct push to `test` and `main` is blocked when native GitHub branch protection is available.
- If native branch protection is blocked by plan, direct-push deploys fail in the workflow guard and the limitation is documented.
- Public draft repos have `test` and `main` protected with required `guard` status and one approving review.
- PR from an invalid source branch is blocked by required checks.
- `dev` changes do not deploy.
- Clean target repos are pulled before work starts; dirty repos are reported before changes.
- Merge to `test` deploys only test aliases.
- Merge to `main` deploys only production aliases.
- AWS CloudTrail/API logs show assumed OIDC role, not long-lived AWS keys.

## Notes

Do not store API keys, AWS access keys, Secrets Manager values, signed URLs, or raw environment values in the repository. Store only references and non-secret configuration.
