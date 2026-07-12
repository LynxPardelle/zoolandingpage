# Zoolanding Repository Map

**Verified:** 2026-07-11 (Central Time) against GitHub repository metadata and each local README.
**Owner:** `LynxPardelle` unless a repository states otherwise.

This is the fleet router, not a release dashboard. Default branches can change and do not imply a shared promotion path. Before editing a sibling, fetch its current metadata and read its own entrypoint, branch rules, tests, deployment, and rollback guidance.

## Application And Platform Repositories

| Repository | Owns | GitHub default | Start here |
| --- | --- | --- | --- |
| [`zoolandingpage`](https://github.com/LynxPardelle/zoolandingpage) | Angular app, draft source tree, shared authoring contracts, and this fleet map | `main` | Root `AGENTS.md`, then `docs/README.md` |
| [`zoolanding-config-authoring`](https://github.com/LynxPardelle/zoolanding-config-authoring) | Signed create/pull/update/publish and lifecycle writes for versioned draft packages | `main` | Repo README; deployment is blocked until the validated security-hardening lane closes |
| [`zoolanding-config-runtime-read`](https://github.com/LynxPardelle/zoolanding-config-runtime-read) | Public runtime bundle resolution, routes, aliases, lifecycle fallbacks, and safe content metadata | `main` | Repo README and local agent instructions |
| [`zoolanding-api-proxy`](https://github.com/LynxPardelle/zoolanding-api-proxy) | Server-side upstream/API calls, public auth metadata, and guarded Cognito provisioning | `main` | Repo README and local trust-boundary contract |
| [`zoolanding-auth-admin`](https://github.com/LynxPardelle/zoolanding-auth-admin) | Private auth-admin BFF, sessions, account/admin flows, CSRF, MFA, and audit behavior | `main` | Repo README and security model |
| [`zoolanding-cognito-user-lifecycle`](https://github.com/LynxPardelle/zoolanding-cognito-user-lifecycle) | Cognito lifecycle triggers, approved attributes/groups, and repair behavior | `main` | Repo README |
| [`zoolanding-content-hub`](https://github.com/LynxPardelle/zoolanding-content-hub) | Generic content read/authoring BFF and publication policy | `main` | Repo README; do not edit the known detached local checkout |
| [`zoolanding-combo-catalog`](https://github.com/LynxPardelle/zoolanding-combo-catalog) | Reusable Angora combos, groups, draft policy, and guarded mutations | `main` | Repo `AGENTS.md`, then README |
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

`draft-grupoastralegal-com` is in a verified domain transition: its GitHub identity and canonical local path use `grupoastralegal`, while the registered production domain remains `despacholegalastralex.com`; `dev` and `test` currently carry `grupoastralegal.com`. Bulk setup is blocked for this mismatch. Do not change production domain, aliases, roles, or environment variables until that promotion is explicitly approved and verified.

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
