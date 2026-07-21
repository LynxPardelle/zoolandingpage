# Zoolanding Repository Map

**Verified:** 2026-07-21 (Central Time) for the Phase 4 local service entries; previously listed GitHub metadata was not reclassified by this documentation closeout.
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
| [`zoolanding-combo-catalog`](https://github.com/LynxPardelle/zoolanding-combo-catalog) | Reusable Angora combos, groups, draft policy, and guarded mutations | `main` | Repo `AGENTS.md`, then README |
| `zoolanding-data-spaces` (local only; no GitHub remote) | Generic draft-scoped collection schemas, records, immutable revisions, and published projections | n/a | Local `AGENTS.md`, then README; Phase 2 forbids AWS deployment |
| `zoolanding-commerce` (local only; no GitHub remote) | Provider-neutral catalog, inventory, Checkout, subscription, Integrations gateway, event/outbox, reconciliation, and isolated manual fiscal workflows | n/a | Local `AGENTS.md`, then README; Phase 4 Commerce wiring is complete locally and AWS deployment remains blocked |
| `zoolanding-integrations` (local only; no GitHub remote) | Generic connection registry, Stripe Connect onboarding/adapter, provider mappings, hosted Checkout/portal commands, webhook normalization, and Integrations event outbox | n/a | Local `AGENTS.md`, then README; Phase 4 is complete locally, migrations remain fail closed until Phase 5, and AWS/provider activation remains blocked |
| [`zoolanding-image-upload`](https://github.com/LynxPardelle/zoolanding-image-upload) | Temporary-grant validation and public image upload/compression | `main` | Repo README |
| [`zoolanding-data-dropper-lambda`](https://github.com/LynxPardelle/zoolanding-data-dropper-lambda) | Raw analytics validation and date-partitioned S3 ingestion | `main` | Repo README; hub owns the cross-platform event model |
| [`zoolanding-quick-stats-lambda`](https://github.com/LynxPardelle/zoolanding-quick-stats-lambda) | Lightweight per-app `stats.json` reads and updates | `main` | Repo README; hub owns frontend integration |
| [`zoolandingpage-aws-infra`](https://github.com/LynxPardelle/zoolandingpage-aws-infra) | Frontend SSR release infrastructure, OIDC publication roles, Lambda, CloudFront, and optional DNS aliases | `dev` | Repo README, runbooks, and local agent instructions |

## Draft Repositories

[docs/drafts-registry.json](./drafts-registry.json) is the canonical machine-readable draft list. Each entry owns:

- the canonical domain;
- GitHub repository name and URL;
- canonical local path under `drafts/{domain}`.

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
