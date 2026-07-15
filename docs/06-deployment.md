# Deployment And Release Guide

This document describes the current hub-owned release path. Service-specific deployment, IAM, rollback, and stack parameters belong to the owning repository in the [repository map](./repository-map.md).

## Current Safety Gate

`zoolanding-config-authoring` test and production were deployed on 2026-07-15 CT after authorization, alias ownership, path containment, response serialization, and the repository-root SAM `CodeUri` boundary were fixed and verified. The build now packages only the explicit allowlisted runtime files; unsigned requests remain denied. Do not restore the legacy `publishOnCreate` shortcut. Draft publication remains a separately authorized action for an explicit environment.

Future Config Authoring changes must repeat the repository's focused tests, SAM lint/build and artifact-boundary verification, promote through `dev -> test -> main`, and confirm IAM-only access after deployment. Provider activation for Commerce or Notifications remains gated separately by its provider, fiscal, volume, and secret-readiness evidence.

## Ownership

| Surface | Canonical owner |
| --- | --- |
| Angular validation and immutable SSR artifact publication | this repository |
| CloudFront, Lambda SSR, OIDC artifact roles, release activation, and infrastructure rollback | [`zoolandingpage-aws-infra`](https://github.com/LynxPardelle/zoolandingpage-aws-infra) |
| Config package writes/publication | [`zoolanding-config-authoring`](https://github.com/LynxPardelle/zoolanding-config-authoring) |
| Public runtime bundle reads | [`zoolanding-config-runtime-read`](https://github.com/LynxPardelle/zoolanding-config-runtime-read) |
| API/auth proxy, image upload, analytics, content, and admin services | each owning repository in the [repository map](./repository-map.md) |
| Draft branch promotion and static publication | each draft repository |

Never deploy a sibling by copying a command from this hub. Open the sibling as an independent repository, verify its current branch/worktree, read its local instructions, and run its own tests and rollback checks.

## Hub Branch And Artifact Flow

Preserve the protected promotion path:

```text
dev -> test -> main
```

The checked-in workflows currently provide:

- `.github/workflows/angular-validate.yml`: runs on pull requests and pushes to `dev`, `test`, and `main`; installs with `npm ci`, audits production dependencies, and builds/packages the SSR Lambda artifact.
- `.github/workflows/publish-ssr-artifact.yml`: runs on pushes to `dev`, `test`, and `main` or an explicit dispatch; maps `main` to the `production` environment, obtains AWS credentials through OIDC, and uploads immutable browser/server artifacts by release ID.

Required GitHub environment variables are validated by the workflow before AWS authentication. Do not replace OIDC with long-lived AWS keys or record raw variable values in documentation.

`zoolandingpage-aws-infra` consumes the immutable release coordinates and owns activation/rollback. Its default branch was `dev` when the repository map was verified; read that repository's current runbooks before any apply.

## Local Release Validation

From this repository root:

```powershell
npm ci
npm audit --omit=dev
npm run package:ssr:lambda
```

When server routing, forwarded headers, host validation, runtime bootstrap, or the SSR package changes, also run:

```powershell
npm run ssr:smoke
```

Run the focused unit/tool suites for every changed surface. A green build alone is not release evidence.

## Docker And Dokploy

The checked-in `Dockerfile` exposes three maintained targets:

- `development`: Angular dev server with mounted source;
- `production`: Node SSR and the default final image;
- `production-no-ssr`: explicit static/Nginx fallback.

The checked-in Compose profiles are `dev`, `prod`, and `prod-no-ssr`:

```powershell
docker compose --profile dev up --build
docker compose --profile prod up --build
docker compose --profile prod-no-ssr up --build
```

For Dokploy SSR deployments:

- use the `production` target unless the static fallback is an explicit decision;
- keep the stable public config API URL and the raw runtime-read server fallback configured through the approved environment variables;
- use `/health` or `/healthz` for container/proxy health probes so they do not invoke Angular SSR or config bootstrap;
- preserve validated `Host`/`X-Forwarded-Host` handling and keep Angular `trustProxyHeaders` aligned with Traefik;
- keep runtime config initialization in the shared app initializer for SSR and hydration;
- keep enough disk and memory/swap for an Angular SSR image build; an old healthy container can continue serving after a failed build, so verify the deployed release rather than trusting HTTP 200 alone.

If many app domains fail while API/assets remain healthy, isolate the app edge. Do not reroute healthy API/assets distributions as part of an app-host recovery.

## Draft And Alias Publication

Authoring workflow belongs in [the draft lifecycle](./11-draft-lifecycle.md). Canonical domains and aliases must be confirmed before publication.

- Use `site-config.json` for approved runtime aliases.
- Alias metadata does not create DNS, TLS, CloudFront, or Traefik configuration.
- Use [managed alias front-door guidance](./13-managed-alias-front-door.md) and the matching `tools/ops/` command.
- Do not hand-edit a host route without preserving the repeatable source change.
- Do not create a second site record merely to reuse the canonical site's configuration on an approved alias.

## Verification After Release

Public health:

```powershell
npm run ops:public-health
```

Focused hosts and Markdown evidence:

```powershell
node tools/ops/public-site-health-check.mjs --hosts <comma-separated-hosts> --fail-on-aaaa
node tools/ops/public-site-health-check.mjs --hosts <comma-separated-hosts> --fail-on-aaaa --markdown --output reports/lighthouse/public-health-latest.md
```

Verify, as applicable:

- the expected immutable release ID is active;
- `/health` or `/healthz` is lightweight and healthy;
- SSR output contains the expected rendered route, not only a small CSR shell;
- runtime bundle domain, path, language, environment, and version are correct;
- desktop and mobile routes pass browser QA after rendered behavior changes;
- API/asset endpoints and alarms remain healthy;
- no browser console request returns an unexplained `404`.

## Rollback

Rollback the smallest owning surface:

- application SSR/static release: reactivate the last verified immutable release through `zoolandingpage-aws-infra`;
- draft content: use the draft repository's verified promotion/publication procedure;
- service runtime: follow that service repository's rollback runbook;
- managed alias/front door: use the repeatable owner-repo/tooling operation, not a one-off console edit.

Do not rebuild an old source tree to approximate rollback when a verified immutable artifact exists.

## Security And Evidence

- Never paste secrets, cookies, tokens, signed URLs, raw env values, account IDs, customer data, or private endpoint credentials into commands, notes, PRs, or logs.
- Prefer placeholders for domains and hosts in reusable examples.
- Store notable release/rollback evidence in `changelog/app/` or the owning repository's changelog; keep raw local output ignored and out of default read order.
- Verify live AWS/GitHub state before claiming production readiness. If credentials or evidence are unavailable, mark the state `UNKNOWN`.
