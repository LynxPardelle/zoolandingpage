# Zoolanding Repository Map

**Verified:** 2026-08-17 (Central Time) against GitHub repository metadata and each local README.
**Owner:** `LynxPardelle` unless a repository states otherwise.

This is the fleet router, not a release dashboard. Default branches can change and do not imply a shared promotion path. Before editing a sibling, fetch its current metadata and read its own entrypoint, branch rules, tests, deployment, and rollback guidance.

## Application And Platform Repositories

| Repository | Owns | GitHub default | Start here |
| --- | --- | --- | --- |
| [`zoolandingpage`](https://github.com/LynxPardelle/zoolandingpage) | Angular app, draft source tree, shared authoring contracts, and this fleet map | `main` | Root `AGENTS.md`, then `docs/README.md` |
| [`zoolanding-config-authoring`](https://github.com/LynxPardelle/zoolanding-config-authoring) | Signed create/pull/update/publish and lifecycle writes for versioned draft packages | `main` | Repo README and deployment/rollback guidance |
| [`zoolanding-config-runtime-read`](https://github.com/LynxPardelle/zoolanding-config-runtime-read) | Public runtime bundle resolution, routes, aliases, lifecycle fallbacks, and safe content metadata | `main` | Repo README and local agent instructions |
| [`zoolanding-api-proxy`](https://github.com/LynxPardelle/zoolanding-api-proxy) | Server-side upstream/API calls, public auth metadata, and guarded Cognito provisioning | `main` | Repo README and local trust-boundary contract |
| [`zoolanding-auth-admin`](https://github.com/LynxPardelle/zoolanding-auth-admin) | Private auth-admin BFF, sessions, account/admin flows, CSRF, MFA, and audit behavior | `main` | Repo README and security model |
| [`zoolanding-cognito-user-lifecycle`](https://github.com/LynxPardelle/zoolanding-cognito-user-lifecycle) | Cognito lifecycle triggers, approved attributes/groups, and repair behavior | `main` | Repo README |
| [`zoolanding-content-hub`](https://github.com/LynxPardelle/zoolanding-content-hub) | Generic content read/authoring BFF and publication policy | `main` | Repo README; do not edit the known detached local checkout |
| [`zoositioweb-content-factory`](https://github.com/LynxPardelle/zoositioweb-content-factory) | Local, human-gated campaign strategy, scripts, knowledge cards, render briefs, asset selection, metrics, and blog backlog for `zoositioweb.com.mx` | `main` | Private repo README; CI validates committed campaign data, while rendering, media, credentials, and optional Polly execution remain local; no AWS/OIDC deployment path exists by design |
| [`zoolanding-combo-catalog`](https://github.com/LynxPardelle/zoolanding-combo-catalog) | Reusable Angora combos, groups, draft policy, and guarded mutations | `main` | Repo `AGENTS.md`, then README |
| [`zoolanding-data-spaces`](https://github.com/LynxPardelle/zoolanding-data-spaces) | Generic draft-scoped collection schemas, records, immutable revisions, and published projections | `main` | Private repo `AGENTS.md`, then README; baseline `main`/`test`/`dev` branches are published, but application deployment remains NO-GO |
| [`zoolanding-commerce`](https://github.com/LynxPardelle/zoolanding-commerce) | Provider-neutral catalog, inventory, Checkout, subscription, event/outbox, reconciliation, and isolated manual fiscal workflows | `main` | Private repo `AGENTS.md`, then README; baseline `main`/`test`/`dev` branches are published, but application deployment remains NO-GO |
| [`zoolanding-integrations`](https://github.com/LynxPardelle/zoolanding-integrations) | Generic connection bindings, provider mappings and snapshots, webhook receipts/outboxes, Stripe adapter behavior, and provider migrations | `main` | Private repo `AGENTS.md`, then README; baseline `main`/`test`/`dev` branches are published, but application deployment and provider activation remain NO-GO |
| [`zoolanding-notifications`](https://github.com/LynxPardelle/zoolanding-notifications) | Delivery ledger, retry attempts, rate/circuit state, and bounded SMTP acceptance | `main` | Private repo `AGENTS.md`, then README; baseline `main`/`test`/`dev` branches are published, but application deployment and transport activation remain NO-GO |
| [`zoolanding-image-upload`](https://github.com/LynxPardelle/zoolanding-image-upload) | Temporary-grant validation and public image upload/compression | `main` | Repo README |
| [`zoolanding-data-dropper-lambda`](https://github.com/LynxPardelle/zoolanding-data-dropper-lambda) | Raw analytics validation and date-partitioned S3 ingestion | `main` | Repo README; hub owns the cross-platform event model |
| [`zoolanding-quick-stats-lambda`](https://github.com/LynxPardelle/zoolanding-quick-stats-lambda) | Lightweight per-app `stats.json` reads and updates | `main` | Repo README; hub owns frontend integration |
| [`zoolandingpage-aws-infra`](https://github.com/LynxPardelle/zoolandingpage-aws-infra) | Frontend SSR release infrastructure, OIDC publication roles, Lambda, CloudFront, and optional DNS aliases | `dev` | Repo README, runbooks, and local agent instructions |

Identity boundary verified 2026-08-17 (Central Time): independent test and production identity stacks for the four new service repositories are `CREATE_COMPLETE`; their 16 total roles and exact repository/Environment/branch trust are verified. Both GitHub Environments have `AWS_ROLE_ARN`, `AWS_CLOUDFORMATION_ROLE_ARN`, and `ALARM_TOPIC_ARN` configured. This is identity-only wiring, not application deployment approval: no application stack or canonical SSM dependency exists, Integrations and Notifications still lack required operator/provider values, and the configured alarm topic has zero confirmed subscribers. All four application deployments remain NO-GO.

## Draft Repositories

[docs/drafts-registry.json](./drafts-registry.json) is the canonical machine-readable draft list. Each entry owns:

- the canonical domain;
- the GitHub owner when it intentionally differs from the registry default;
- GitHub repository name and URL;
- canonical local path under `drafts/{domain}`.
- the exact allowed deployment environments (`test` only, or `test` and `production`).

Registry version 2 requires `deploymentEnvironments` on every draft. Only `['test']` and `['test', 'production']` are valid, in that order. A test-only draft remains part of public-safety and knowledge-routing audits, but operational tooling must not create its production role, GitHub Environment, deployment variables, workflow requirement, or managed alias.

Do not use `drafts/_repos`, the VS Code workspace, deployment worktrees, or a sibling-directory scan as the draft registry. An unregistered draft is a classification gap, not permission to infer ownership or publication state.

## Managed Knowledge Routing

[docs/satellite-repositories.json](./satellite-repositories.json) is the machine-readable routing and CI/CD audit source for the Runtime Read, Auth Admin, and Content Hub pilot. It does not replace this ownership map or each service's local deployment and rollback documentation.

From the hub, run `npm run fleet:knowledge` for a read-only local fleet audit. Use `npm run fleet:knowledge -- --apply --repo=<registered-repo>` only against a verified clean checkout; it updates marked routing blocks and the pinned C1 caller without committing, pushing, merging, changing GitHub settings, or touching AWS.

For independent clones kept outside the in-tree draft source, pass `--checkout-root=<directory>`; each registered repository is resolved as `<directory>/<repo-name>`. This keeps Git operations out of the hub's tracked `drafts/{domain}` content tree.

For registered drafts, apply mode also refreshes the canonical PR-source guard so branch names enter shell steps through environment variables rather than direct expression interpolation. Satellite deploy and promotion workflows remain repository-owned and are never replaced by this command.

C1 runs the draft public-safety audit only when the caller contains `draft-repo.config.json`. Full-history Gitleaks remains mandatory for every caller; a repository may suppress a verified false positive only with an exact committed `.gitleaksignore` fingerprint.

`draft-grupoastralegal-com` uses `grupoastralegal.com` as its canonical registry, local-path, authoring, and deployment identity. Do not restore the retired Astralex domain or repository identity in active configuration.

### Draft-specific safety holds

- `draft-music-lynxpardelle-com`: keep Spotify/TIDAL credentials out of draft config and browser payloads. Reactivation requires a server-only API-proxy path plus Secrets Manager references; TIDAL access remains externally blocked.
- `draft-pokeapi-demo-zoolandingpage-com-mx`: keep API labels, routes, and per-type presentation in draft mapper/config data rather than generic app code. The optional vanity hostname currently returns NXDOMAIN; do not treat it as a release blocker without reconfirming that the hostname is still wanted.
- `draft-zoositioweb-com-mx`: use the shared preview host. The dedicated test alias timed out in the 2026-07-11 audit and remains unapproved until repaired and explicitly revalidated.

## Local Working Views

- `zoolandingpage.code-workspace` is a curated convenience view for VS Code. It is intentionally not the fleet registry.
- `zoolandingpage-deploy-main` and `zoolandingpage-deploy-test` are broken legacy worktrees in the audited local workspace. Exclude them from documentation search and do not delete them until their artifact manifests prove they contain no unique work.
- Current checkout branches, dirty state, detached state, and ahead/behind counts are preflight data. They do not belong in this durable map.

## Cross-Repository Rule

Keep shared configuration and frontend contracts in this hub. Keep runtime implementation, service-specific security, deployment, rollback, and operational evidence in the owning repository. Critical safety rules must remain locally available even when a hub link cannot be opened.
