Date: 2026-05-16 (Central Time)
Scope: Repeatable setup checklist for new secure draft repositories.
Status: Planned
Applies To: New `draft-*` GitHub repositories
Source Of Truth:

- `plan/feature-secure-draft-repo-release-workflow-1.md`
- `ai-notes/notes/secure-draft-release-workflow.md`
- `Codex.md`

Confidence: Medium
Last Reviewed: 2026-05-16 (Central Time)

# Create A Secure Draft Repo

Use this checklist when creating a new draft repository after the secure release workflow is implemented.

## Preconditions

- Canonical domain is known.
- Production aliases are known.
- Test aliases are known or can be generated.
- Draft payload has passed local secret/PII review.
- AWS OIDC provider exists in the target AWS account.

## Setup Checklist

1. Create private GitHub repository named `draft-{domain}`.
2. Add sanitized draft payload and required public asset references only.
3. Add `.gitignore` that excludes:
   - `.env*`
   - private keys and certificates
   - local databases
   - logs
   - PDFs and CV/source research files unless explicitly approved for public use
   - `ai_notes/`, `findings/`, and `errors-reports/`
   - generated reports and scratch folders
4. Create branches `dev`, `test`, and `main`.
5. Set default branch according to the adopted repo policy after pilot verification.
6. Protect `test`.
7. Protect `main`.
8. Add required PR source guard check:
   - PR to `test` must come from `dev`.
   - PR to `main` must come from `test`.
9. Add GitHub Environment `test`.
10. Add GitHub Environment `production`.
11. Restrict test environment deployment branches to `test`.
12. Restrict production environment deployment branches to `main`.
13. Add non-secret environment variables:
   - canonical domain
   - deploy environment
   - role ARN
   - authoring endpoint
14. Create or attach AWS IAM test deploy role.
15. Create or attach AWS IAM production deploy role.
16. Add post-merge deploy workflow for `test`.
17. Add post-merge deploy workflow for `main`.
18. Verify test deploy against every test alias.
19. Verify production deploy against every production alias.

## Acceptance Checks

- No local-only folders or PII-risk files are tracked.
- Direct push to `test` and `main` is blocked.
- PR from an invalid source branch is blocked by required checks.
- `dev` changes do not deploy.
- Merge to `test` deploys only test aliases.
- Merge to `main` deploys only production aliases.
- AWS CloudTrail/API logs show assumed OIDC role, not long-lived AWS keys.

## Notes

Do not store API keys, AWS access keys, Secrets Manager values, signed URLs, or raw environment values in the repository. Store only references and non-secret configuration.
