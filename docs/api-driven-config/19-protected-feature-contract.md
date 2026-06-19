# Protected Feature Contract v1

Date: 2026-06-18 (Central Time)
Scope: Reusable serverless contract for draft-scoped protected features.
Status: Draft contract
Applies To: Blogs, dashboards, analytics, draft settings, uploads, client portals, and future protected tools.
Source Of Truth:

- `docs/api-driven-config/15-runtime-api-proxy-data-sources.md`
- `docs/api-driven-config/17-auth-profile-registry.md`
- `docs/api-driven-config/18-draft-auth-audit-matrix.md`
- `docs/api-driven-config/schemas/protected-features.schema.json`
- `docs/api-driven-config/schemas/auth-profile-registry.schema.json`
- `docs/api-driven-config/schemas/integrations.schema.json`
- `tools/auth-profile-registry.mjs`

Confidence: Medium; this is a reusable contract and plan-only schema, not a deployed feature runtime.
Last Reviewed: 2026-06-18 (Central Time)

## Purpose

A protected feature is any draft-scoped capability that reads or mutates non-public customer data after authentication. Examples include client blogs, dashboards, analytics, private uploads, and draft configuration panels.

The contract is serverless, generic, and per draft by default. Browser draft config may only declare public routes, public auth references, data-source/action references, labels, and rendered components. Tenant ownership, Cognito policy, DynamoDB table decisions, Lambda/BFF routing, audit rules, and authorization policy stay server-only.

## Contract Shape

Future implementations should model each feature with a server-only descriptor, for example `drafts/{domain}/server/protected-features.json`:

```json
{
  "version": 1,
  "features": [
    {
      "id": "client-blog",
      "kind": "blog",
      "authProfileId": "staff",
      "status": "planned",
      "ownership": {
        "domain": "example.com",
        "tenantId": "tenant-example",
        "isolationBoundary": "auth-profile"
      },
      "access": {
        "roles": [
          {
            "id": "reader",
            "groups": ["client"],
            "permissions": ["blog:post:read"]
          },
          {
            "id": "editor",
            "groups": ["admin"],
            "permissions": ["blog:post:read", "blog:post:write"]
          }
        ]
      },
      "resources": {
        "dynamoTables": [
          {
            "logicalName": "posts",
            "isolation": "per-auth-profile-table",
            "tableNamePattern": "zlp-{stage}-{tenantId}-{featureId}",
            "partitionKeyPrefix": "TENANT#{tenantId}",
            "sortKeyPrefixes": ["POST#", "AUTHOR#"]
          }
        ]
      },
      "endpoints": {
        "bff": {
          "basePath": "/features/client-blog",
          "sessionMode": "server-cookie"
        },
        "apis": [
          {
            "id": "listPosts",
            "method": "GET",
            "path": "/features/client-blog/posts",
            "lambdaId": "clientBlogRead",
            "authorizer": "bff-session"
          }
        ]
      },
      "audit": {
        "required": true,
        "sink": "dynamodb",
        "eventTypes": ["blog.post.read", "blog.post.write"]
      },
      "errors": {
        "format": "zlp-protected-feature-error-v1"
      },
      "rollout": {
        "promotion": "dev-test-prod",
        "applyMode": "plan-only"
      }
    }
  ]
}
```

This descriptor is not browser runtime config. It may be packaged or stored by future serverless tooling, but runtime-read must not include it in browser bundles.

## Identity

Every protected feature needs a stable identity:

- `id`: draft-local safe ID, stable across dev/test/prod.
- `kind`: product category such as `blog`, `dashboard`, `analytics`, `config`, `upload`, `admin`, or `custom`.
- `authProfileId`: the Auth Profile Registry profile that owns sign-in, sessions, groups, JWT policy, and Cognito binding.
- `ownership.domain`: canonical draft domain that owns the feature.
- `ownership.tenantId`: server-only tenant boundary from the auth profile.
- `ownership.isolationBoundary`: `draft`, `auth-profile`, or `tenant`.

Do not infer ownership from browser host alone. Serverless handlers must resolve and compare `domain + authProfileId + tenantId` server-side before returning protected data.

## Auth Profile Binding

Protected features inherit identity policy from `server/auth-profile-registry.json`:

- Cognito issuer, client IDs, callback/logout allowlists, tenant claim, environment claim, allowed token uses, admin groups, and manageable groups stay server-only.
- Public draft config may reference `runtime.authRemote` or sanitized `runtime.auth`; it must not include tenant policy, admin groups, callback allowlists beyond public paths, secrets, raw tokens, or IAM policy.
- BFF-backed features should reuse HttpOnly `__Host-zlp_session`, readable CSRF cookie plus `X-ZLP-CSRF`, and same-origin draft context headers `X-ZLP-Domain` and `X-ZLP-Auth-Profile-Id`.
- JWT-backed API features must verify signature, issuer, audience or Cognito `client_id`, subject, allowed token use, tenant claim, optional environment claim, and group policy before data access.

## Roles And Groups

Use groups from the server-only auth profile as the bridge to feature roles:

- `roles[].id` is feature-local and should describe product capability, not Cognito implementation.
- `roles[].groups` must be a subset of the profile `allowedGroups` or narrower admin policy.
- `roles[].permissions` should be action-scoped strings such as `blog:post:read`, `analytics:report:read`, or `settings:draft:write`.
- Admin pages must re-check fresh server-side account state before every mutation, not only session snapshot groups.
- Pending, suspended, rejected, expired, and environment-mismatched users must fail closed.

Browser route `routes[].auth.allowedGroups` is a UI gate only. Protected data and mutations must still pass server-side role checks.

## Resource Ownership

Feature records must carry a server-side owner boundary:

- `tenantId`: required for every protected item.
- `authProfileId`: required when the same draft can have multiple protected audiences.
- `domain`: required for cross-host and shared-preview enforcement.
- `environment`: required when one Cognito pool spans test and production through an environment claim.
- `ownerSubject`: required for user-owned resources such as profile uploads or private drafts.

Handlers should reject any request where the resolved resource owner does not match the authenticated server-side context.

## DynamoDB Isolation

Default to separate DynamoDB tables per paying client or strong draft/auth-profile boundary when the feature stores customer-owned content, dashboards, analytics, uploads, or settings.

Allowed isolation modes:

- `per-draft-table`: one table per canonical draft domain and stage.
- `per-auth-profile-table`: one table per `domain + authProfileId + stage`; this is the default for features tied to one client auth profile.
- `shared-table-with-tenant-key`: allowed only when a single serverless service needs shared operational tables; every access path must require tenant partition keys and IAM leading-key conditions where practical.

Recommended table name pattern:

```text
zlp-{stage}-{tenantId}-{featureId}
```

For shared tables, key names must still include a tenant boundary:

```text
PK = TENANT#{tenantId}
SK = FEATURE#{featureId}#...
```

Do not let the browser choose table names, tenant IDs, partition keys, or upstream DynamoDB expressions.

## API, Lambda, And BFF Endpoints

Protected feature endpoints should stay same-origin from the browser:

- Use the auth-admin BFF for account/admin/session-backed features.
- Use feature-specific BFF or API routes such as `/features/{featureId}/...` for blogs, analytics, uploads, or settings.
- Keep `/auth/runtime-config` owned by the API proxy and `/auth/callback` owned by Angular.
- Do not add broad `/auth/*` or `/features/*` front-door routers that can swallow Angular routes or unrelated services.
- Prefer separate Lambdas by protected feature or feature family when IAM, scaling, or blast radius differs.
- Lambda environment and IAM policy must be stage-scoped and tenant/resource scoped; no Lambda should get wildcard data access for all drafts unless it is an explicitly reviewed platform service.

Browser config may reference endpoints only through existing safe surfaces:

- `site-config.json.runtime.dataSources[]` with `kind: "auth-admin"` or `kind: "api-proxy"`.
- `site-config.json.runtime.apiActions[]` with `kind: "auth-admin"` or `kind: "api-proxy"`.
- Public route `auth.required` and `allowedGroups` for UX gating.

## Audit Log

Every protected feature should define audit requirements before implementation.

Audit each mutating action and sensitive admin action with:

- timestamp
- request ID
- domain
- authProfileId
- tenantId
- featureId
- actor subject
- actor groups or role IDs
- action
- target type and target ID
- decision: allowed or denied
- sanitized error code when denied

Audit records must not include passwords, TOTP secrets, OAuth/JWT tokens, raw Cognito sessions, HttpOnly cookie values, CSRF cookie values, signed URLs, raw uploaded content, raw PII payloads, or secret-store references.

## Error Contract

Protected feature APIs should return controlled JSON errors:

```json
{
  "error": {
    "code": "forbidden",
    "message": "You do not have access to this resource.",
    "requestId": "request-id",
    "retryable": false
  }
}
```

Use stable safe codes:

- `auth_required`
- `forbidden`
- `tenant_mismatch`
- `environment_mismatch`
- `group_mismatch`
- `validation_error`
- `not_found`
- `conflict`
- `rate_limited`
- `upstream_unavailable`
- `internal_error`

Messages may be localized in draft UI. Error bodies must not echo raw backend exceptions, Cognito sessions, tokens, cookies, credentials, table names when sensitive, or policy internals.

## Public Vs Server-Only Boundaries

Public draft config may contain:

- route paths, page IDs, labels, and `routes[].auth` UI gates
- `runtime.authRemote` with only `enabled`, `authProfileId`, and endpoint
- sanitized `runtime.auth` generated by the server
- `runtime.dataSources` and `runtime.apiActions` references
- component config, safe mapper fields, empty/loading/error UI, and localized copy

Server-only config must contain:

- tenant IDs and tenant claims
- Cognito provisioning status and callback/logout allowlists
- admin groups, manageable groups, default user status, allowed token uses
- feature role-to-group policy
- DynamoDB table patterns, key policies, and indexes
- Lambda IDs, IAM policy, authorizer policy, and resource ownership rules
- audit sink and audit event policy
- upstream URLs, credentials, secret refs, signed URL policy, and raw error mappings

If a field can grant access, select a tenant, choose a table, choose an upstream URL, or reveal credentials, it is server-only.

## Rollout Flow

Use the same promotion shape for protected features:

1. Draft the server-only protected feature descriptor with `status: "planned"` and `rollout.applyMode: "plan-only"`.
2. Validate schemas and offline contract tests. No AWS calls are required for this step.
3. Create or update auth profile policy in the server-only registry.
4. Produce a plan-only infrastructure diff for Cognito, DynamoDB, Lambdas, IAM, front-door routes, and audit sinks.
5. Apply only to dev or isolated test stack after review.
6. Wire public draft config to safe `runtime.dataSources`, `runtime.apiActions`, and protected routes only after the server-side policy exists.
7. Run the auth audit matrix from `18-draft-auth-audit-matrix.md`, including desktop/mobile browser QA for every affected route.
8. Promote through `dev -> test -> prod`; do not skip straight to production.
9. Keep `applyMode` disabled or plan-only in production until the promotion review explicitly allows apply.

No protected feature rollout should expose a browser route before the server-side authorization and resource isolation path is ready.

## Validation

Current minimum local checks for this contract:

```powershell
node --test tools/tests/server-config-schema.spec.mjs tools/tests/auth-profile-registry.spec.mjs tools/tests/site-config-schema.spec.mjs
```

Future implementations should add real schema validation for `server/protected-features.json` before packaging, plus feature-specific BFF/API tests that prove:

- public draft payloads contain no server-only protected feature policy
- unauthorized users cannot read private data
- group and tenant mismatches fail closed
- DynamoDB access includes the tenant/resource boundary
- audit events are written without secrets or raw PII
- error responses follow `zlp-protected-feature-error-v1`
