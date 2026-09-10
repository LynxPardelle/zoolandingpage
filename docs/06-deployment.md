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
- `.github/workflows/publish-ssr-artifact.yml`: runs only on pushes to `test` and `main`, or an explicit dispatch whose only choices are `test` and `production`; it obtains AWS credentials through the matching protected Environment and uploads immutable browser/server artifacts by release ID. A `dev` push cannot enter this workflow.

Required GitHub environment variables are validated by the workflow before AWS authentication. Do not replace OIDC with long-lived AWS keys or record raw variable values in documentation.

`dev` is CI/local only across the mapped platform repositories. It may run validation, but no current remote workflow may combine a `dev` trigger or Environment with OIDC or AWS credential configuration. Treat any leftover GitHub Environment named `dev` as retired metadata, not as authority to deploy: verify that no current workflow references it and that any referenced cloud role is already retired before removing its variables or secrets. Deleting an Environment is not a substitute for rotating an independently active credential.

### Runtime Read deployment identities

Runtime Read uses two identities in each remote environment. GitHub assumes an OIDC caller restricted to the exact repository, protected Environment, and deployment branch. That caller may operate only the environment's exact stack and artifact prefix and may pass only the retained CloudFormation service role. CloudFormation, not GitHub, assumes the service role to update the exact Lambda/API surface and attach only the code-owned execution boundary.

The service role must allow the exact SAM transform ARN required to create a change set. The Lambda execution boundary must be attached and simulated before the first deployment that supplies `--role-arn`. CloudFormation persists the stack `RoleARN`; a later deployment that omits `--role-arn` does not detach the role. Replace this design only with an explicit rollback/migration procedure, never by removing the flag and assuming the previous deployment identity returns.

During migration, retain the previous caller only for a time-boxed rollback window and remove every trust-policy `Allow` from it after the scoped caller succeeds. A temporary exact-role `iam:DeleteRolePermissionsBoundary` bootstrap permission may exist only while rollback can require detaching the new boundary; remove it from both environments after migration. Runtime Read application workflows must not gain IAM-policy mutation authority.

`zoolandingpage-aws-infra` consumes the immutable release coordinates and owns activation/rollback. Its default branch was `dev` when the repository map was verified; read that repository's current runbooks before any apply.

## Local Release Validation

From this repository root:

```powershell
npm ci
npm audit --omit=dev
npm run package:ssr:lambda
```

The Lambda ZIP must use relative POSIX entry names on every build host,
including Windows. Packaging creates each Windows entry explicitly to avoid
backslash paths from Windows PowerShell's directory ZIP helper. Verify the
packaging contract with `node --test tools/tests/ssr-lambda-packaging.spec.mjs`.
ZIP entry dates are fixed to the DOS epoch. The POSIX path also uses a sorted
file inventory, UTC timestamps and no extended attributes. Source/build files
are never retimed: normalization affects the staging copy or ZIP metadata only.
Compare archive digests with the same runtime and compression toolchain; this
does not claim that different operating systems or compressor versions emit
identical bytes. `manifest.json` retains the actual build time outside the ZIP.
A local build from uncommitted sources is a QA artifact, not an immutable
release: its recorded Git HEAD identifies the base only. Do not promote it
without the reviewed source/run/digest contract and intended public inventory.

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

### Isolated Journal delivery contract

SSR delivery validates the exact protected promotion, then seals every published browser file, the server ZIP, and the source manifest in `delivery.json`. Its external SHA-256, numeric GitHub artifact ID, full source SHA, run ID, and validation attempt are passed to the credential-bearing job. That job runs no downloaded repository code: it checks the complete inventory and hashes before OIDC. S3 writes use conditional creation, and the source manifest is written last as the completion marker. A partial upload is not a release; use a new release ID for a fresh attempt rather than overwriting an occupied immutable prefix.

The optional The Hair Narrative admin inventory is **off by default**. A TEST workflow dispatch must explicitly select `thn_admin_artifact`; production rejects this selection. Before OIDC, the existing publish job compares the input, sealed delivery and TEST Environment's `THN_ADMIN_ARTIFACT_ENABLED` policy. They must agree. Once that policy requires the admin artifact, a default-off push cannot publish a replacement SSR without its binding: dispatch the reviewed TEST release with the explicit selection. Ordinary default-off TEST and production publication need no new Environment association in validation, permissions or secrets. Draft publication workflows are unchanged.

The [private artifact producer](../tools/prepare-thn-admin-artifact.mjs) runs between Angular build and Lambda packaging. It emits `dist/zoolandingpage/thn-admin-release.json` using the closed version-1 contract consumed by [the front-door planner](../tools/ops/sync-thn-content-hub-v2-front-door.mjs). Its inventory includes only the compiled shell's static/literal module imports, recursive CSS dependencies, and the four THN fonts in the tracked public asset manifest. That manifest's closed font list and byte hashes are verified; CI never requires the ignored draft checkout. Local parity tests compare the reviewed draft font declarations when present. Unhashed resources receive immutable content-hash copies; public originals are unchanged. Exact filenames accept bounded hex tokens or Angular's eight-character uppercase base32 tokens. No directory wildcard or whole-browser admission is inferred. Every selected `/browser/` path must exist, have a permitted static extension and match its sealed digest.

The producer also emits an optional server-only binding inside the Lambda ZIP. Packaging verifies the flag, TEST/release identity, exact map and all asset hashes before creating the ZIP. The existing shared SSR loads this binding only for the exact approved admin host; missing or invalid integrity closes that host without affecting other hosts. It projects selected asset URLs only into the private shell and trusted hydration context; font/icon services retain their public URLs elsewhere. The binding is forbidden in the public browser archive. No request or browser parameter selects the binding, QA mode or client-owner authority.

Release staging excludes only `browser/drafts/_debug`, the reserved local diagnostic workspace; source files, development output and all other paths remain byte-identical. It is not an ordinary public-page dependency and is not part of TEST or production release payloads. Other unexpected underscore/private paths still fail the sealed-delivery validator; this exception does not widen any validator or affect customer draft publication.

The [closed route inventory](../tools/ops/thn-content-hub-v2-route-manifest.json) and public-safe release inventory are both sealed with the delivery. Front-door activation must select the same immutable source/run/digest evidence and verify CloudFront behavior/function quotas for the actual inventory. Artifact publication does not activate an origin, route, DNS record, session or account. Infrastructure activation and owner MFA remain separate gates.

Successful publication records the external delivery digest and immutable coordinates in the run summary. Retain the corresponding artifact for the rollback window (the workflow requests 90 days, subject to the repository retention policy). Before a TEST rollback, retrieve the exact artifact ID and the original successful, attempt-specific workflow-run and artifact metadata from this repository; do not use latest-by-name selection. Set `ROLLBACK_ARTIFACT_ROOT`, `ROLLBACK_DELIVERY_SHA256`, `ROLLBACK_RELEASE_ID`, `ROLLBACK_SOURCE_SHA`, `ROLLBACK_SOURCE_RUN_ID`, `ROLLBACK_SOURCE_ATTEMPT`, `ROLLBACK_ARTIFACT_ID`, `ROLLBACK_RUN_METADATA_PATH`, and `ROLLBACK_ARTIFACT_METADATA_PATH` from that retained evidence, then run:

```powershell
node tools/prepare-ssr-delivery.mjs --rollback
```

The command is read-only and returns `activationAllowed:false`; the infrastructure repository still owns separately authorized activation. Missing, expired, failed, or cross-attempt evidence is rejected. A successful retry that reused another validation attempt is not automatically eligible: preserve its successful publication evidence for a separate owner review rather than silently treating a previously failed attempt as a successful rollback source. New releases do not acquire activation authority by passing these checks.

### Legacy TEST recovery snapshots

The existing TEST frontend predates `delivery.json`. Do not rebuild its source,
rewrite its original manifest, invent a current CI artifact ID, or relax the
modern rollback verifier. [The legacy snapshot verifier](../tools/prepare-legacy-ssr-recovery.mjs)
is a separate, local-only bridge pinned to the one reviewed release in
[the TEST baseline](../tools/ops/legacy-test-frontend-baseline.json).

An authorized read-only capture preserves `payload/manifest.json`,
`payload/server/ssr-handler.zip`, and every object under that release's
`payload/browser/` prefix. It checks the original manifest and server SHA-256
against the baseline and live Lambda, confirms the exact historical successful
GitHub source run, reads every object twice, and compares the bounded object
inventory and active TEST coordinates before and after capture. The sanitized
capture input records the exact fields exercised by
[the contract tests](../tools/tests/legacy-ssr-recovery.spec.mjs): source-run
coordinates, before/after observations, paths, lengths, content hashes, hashed
ETags and safe content/cache/encoding headers. Cloud credentials, raw cloud
responses and private environment values are not part of that proof.

Set `LEGACY_RECOVERY_ROOT` to the absolute local snapshot directory and
`LEGACY_RECOVERY_CAPTURE` to the separately retained capture proof, then run
`node tools/prepare-legacy-ssr-recovery.mjs --prepare`. Preparation validates all
bytes and writes `legacy-recovery.json` exclusively; an existing receipt is
never overwritten. Retain its returned SHA-256 separately. Recheck the copy
with that value in `LEGACY_RECOVERY_DIGEST` and
`node tools/prepare-legacy-ssr-recovery.mjs --verify`.

The result is always `selection-only`, `activationAllowed:false`,
`sourceClass:deployed-legacy-snapshot`, and `ciArtifactId:null`. The exact bytes
of the legacy debug workspace may be retained in this local snapshot; this is
not permission to publish it through the modern artifact pipeline. Keep these
snapshots ignored, private and outside public draft/build directories. Never
upload or commit them merely because verification passed.

This proof establishes a stable copy of the existing deployed release, not an
original CI digest for its browser files. Missing original browser/CI provenance
is stated explicitly. It does not establish a historical CDK assembly, change
the infrastructure rollback workflow, sign Workstream A, or activate the
Journal. Infrastructure recovery selection/execution and any deployment remain
separately reviewed and authorized owner-repository operations.

## Security And Evidence

- Never paste secrets, cookies, tokens, signed URLs, raw env values, account IDs, customer data, or private endpoint credentials into commands, notes, PRs, or logs.
- Prefer placeholders for domains and hosts in reusable examples.
- Store notable release/rollback evidence in `changelog/app/` or the owning repository's changelog; keep raw local output ignored and out of default read order.
- Verify live AWS/GitHub state before claiming production readiness. If credentials or evidence are unavailable, mark the state `UNKNOWN`.
