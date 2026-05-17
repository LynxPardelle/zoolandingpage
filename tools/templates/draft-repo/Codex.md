# Draft Repo Memory

This repository follows the secure Zoolanding draft release workflow.

- Run `git pull --ff-only` before work when the worktree is clean.
- For multi-repo work, also pull the hub repo and every affected `draft-*` repo when clean.
- If the worktree is dirty, report it before pulling or changing files.
- Work on `dev`, promote with PR `dev -> test`, then PR `test -> main`.
- `dev` does not deploy.
- `test` deploys the test draft only after merge to `test`.
- `main` deploys production only after merge to `main`.
- Native GitHub branch protection should protect `test` and `main` when the account plan supports it. If GitHub blocks protection for private repos, the deploy workflow still rejects push-triggered deploys unless the commit is a merge from the expected source branch, but GitHub cannot block the push itself.
- Treat this repository as public unless verified otherwise. Before making it public, before PR, and before merge, run the hub repo public-safety audit and resolve every blocking finding.
- Do not commit secrets, tokens, API keys, signed URLs, `.env*`, local logs, PDFs/CVs, private keys, certificates, local databases, credential JSON, local agent state, `ai_notes/`, `findings/`, or `errors-reports/`.
- Public contact details in draft content are allowed only when they are intentionally client-facing; personal source files, CVs, private photos, identity documents, and raw research stay local-only.
- Deployment uses GitHub OIDC to assume AWS IAM roles split by repo and environment; do not add long-lived AWS access keys.
