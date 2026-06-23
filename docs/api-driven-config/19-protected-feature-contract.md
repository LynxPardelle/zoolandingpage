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

## Implemented Content Hub BFF

The first protected-feature BFF implementation is the generic `zoolanding-content-hub` service.

It owns the same-origin browser endpoints expected by `ContentHubClientService`:

- `POST /features/content-hub/read`
- `POST /features/content-hub/action`

The front door must route only those exact paths to the BFF. Do not route broad `/features/*`, `/features/content-hub/*`, or unrelated feature paths to this service.

The BFF reuses auth-admin server-cookie sessions:

- `__Host-zlp_session` stays HttpOnly.
- Mutations require the readable CSRF cookie and matching `X-ZLP-CSRF` header.
- Requests include `X-ZLP-Domain`, `X-ZLP-Auth-Profile-Id`, and `X-ZLP-Content-Hub-Id`.
- The service rechecks session context, current user state, approval status, enabled status, session version, hub authorization, and action-scoped roles server-side.

Initial reads are `articleList`, `taxonomyList`, `assetList`, `revisionList`, `moderationQueue`, and `publicBundlePreview`.

Initial actions are `createArticle`, `updatePackage`, `validate`, `submitReview`, `publish`, `schedule`, `uploadAsset`, `moderateComment`, and `restoreRevision`.

Publishing creates validated internal content-hub published bundles in BFF-owned storage. Public Angular SEO indexes (`runtime.contentHubs.publicArticles` and `publicTaxonomy`) still need the runtime-read/public-index bridge before newly published BFF content automatically appears in public blog routes, sitemap, feeds, and search JSON.

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
        "isolationBoundary": "auth-profile",
        "environmentClaim": "custom:zlp_env"
      },
      "access": {
        "model": "groups-to-roles",
        "defaultDecision": "deny",
        "roles": [
          {
            "id": "reader",
            "groups": ["client"],
            "permissions": ["blog:post:read"]
          },
          {
            "id": "editor",
            "groups": ["admin"],
            "permissions": ["blog:post:read", "blog:post:write", "upload:image:write"]
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
        ],
        "objectStores": [
          {
            "logicalName": "postImages",
            "isolation": "per-auth-profile-prefix",
            "bucketNamePattern": "zlp-{stage}-protected-assets",
            "keyPrefix": "TENANT#{tenantId}/FEATURE#{featureId}/",
            "signedUrlPolicy": {
              "maxTtlSeconds": 300,
              "allowedMethods": ["PUT", "GET"]
            }
          }
        ]
      },
      "endpoints": {
        "bff": {
          "basePath": "/features/client-blog",
          "sessionMode": "server-cookie",
          "csrfHeaderName": "X-ZLP-CSRF"
        },
        "apis": [
          {
            "id": "listPosts",
            "method": "GET",
            "path": "/features/client-blog/posts",
            "lambdaId": "clientBlogRead",
            "authorizer": {
              "mode": "bff-session",
              "requireFreshAccountState": true
            }
          },
          {
            "id": "createPost",
            "method": "POST",
            "path": "/features/client-blog/posts",
            "lambdaId": "clientBlogWrite",
            "authorizer": {
              "mode": "auth-profile-jwt",
              "allowedTokenUses": ["access"],
              "requireTenantClaim": true,
              "requireEnvironmentClaim": true
            }
          }
        ]
      },
      "runtimeBindings": {
        "routes": [
          {
            "path": "/blog/admin",
            "pageId": "blog-admin",
            "authRequired": true,
            "dataSourceIds": ["blogPosts"],
            "apiActionIds": ["createPost"]
          }
        ],
        "dataSources": [
          {
            "id": "blogPosts",
            "kind": "auth-admin",
            "target": "remote.blog.posts"
          }
        ],
        "apiActions": [
          {
            "id": "createPost",
            "kind": "auth-admin"
          }
        ]
      },
      "draftConfigurability": {
        "enabled": true,
        "allowedPublicFields": ["routes", "runtime.dataSources", "runtime.apiActions", "components"],
        "forbiddenPublicFields": ["tenantId", "tableNamePattern", "bucketNamePattern", "lambdaId", "authorizer"]
      },
      "audit": {
        "required": true,
        "sink": "dynamodb",
        "eventTypes": [
          {
            "name": "blog.post.write",
            "decisions": ["allowed", "denied"],
            "includeRequestId": true
          }
        ]
      },
      "errors": {
        "format": "zlp-protected-feature-error-v1",
        "response": {
          "wrapper": "error",
          "fields": ["code", "message", "requestId", "retryable"]
        }
      },
      "serverOnly": {
        "exposure": "server-only",
        "forbiddenBrowserKeys": [
          "tenantId",
          "credentialRef",
          "clientSecret",
          "accessToken",
          "refreshToken",
          "tableNamePattern",
          "bucketNamePattern"
        ]
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

- `access.model` declares the server-side authorization model: `groups-to-roles`, `owner-or-role`, or `admin-only`.
- `access.defaultDecision` must stay `deny`; allow decisions come only from matched server-side policy.
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

## Object Storage Isolation

Protected uploads use the same owner boundary as protected records. The protected feature descriptor may declare `resources.objectStores[]`, but browser config may only reference public upload actions or data sources.

Allowed object storage modes:

- `per-draft-bucket`: one bucket per canonical draft domain and stage.
- `per-auth-profile-prefix`: one shared protected-assets bucket with a stage/domain/profile prefix; this is the default for Blog MVP image uploads.
- `shared-bucket-with-tenant-prefix`: allowed only when a platform service needs shared storage and every access path enforces tenant-prefixed keys.

Use key prefixes shaped like:

```text
TENANT#{tenantId}/FEATURE#{featureId}/...
```

Signed URL policy is server-only. Public draft config must not contain bucket names, key prefixes, signed URL TTLs, credentials, or direct S3 policy.

## API, Lambda, And BFF Endpoints

Protected feature endpoints should stay same-origin from the browser:

- Use the auth-admin BFF for account/admin/session-backed features.
- Use feature-specific BFF or API routes such as `/features/{featureId}/...` for blogs, analytics, uploads, or settings.
- Keep `/auth/runtime-config` owned by the API proxy and `/auth/callback` owned by Angular.
- Do not add broad `/auth/*` or `/features/*` front-door routers that can swallow Angular routes or unrelated services.
- Prefer separate Lambdas by protected feature or feature family when IAM, scaling, or blast radius differs.
- Lambda environment and IAM policy must be stage-scoped and tenant/resource scoped; no Lambda should get wildcard data access for all drafts unless it is an explicitly reviewed platform service.
- Endpoint `authorizer` is an object policy, not only a string. `mode: "bff-session"` must revalidate the HttpOnly session and should use fresh account state for admin or mutating actions. `mode: "auth-profile-jwt"` must declare token-use and tenant/environment claim expectations in the server-only descriptor.

Browser config may reference endpoints only through existing safe surfaces:

- `site-config.json.runtime.dataSources[]` with `kind: "auth-admin"` or `kind: "api-proxy"`.
- `site-config.json.runtime.apiActions[]` with `kind: "auth-admin"` or `kind: "api-proxy"`.
- Public route `auth.required` and `allowedGroups` for UX gating.

## Route And Runtime Binding

`runtimeBindings` records the intended public surfaces without copying server policy into browser config:

- `routes[]` declares the public route path, page ID, and whether the route must be auth-gated in `site-config.json`.
- `dataSources[]` declares public runtime data-source IDs, kind, and target variable path.
- `apiActions[]` declares public runtime action IDs and kind.

These bindings are a contract check between server-only feature policy and public draft config. They do not authorize access. Handlers still resolve `domain + authProfileId + tenantId` server-side before returning data or mutating state.

## Draft Configurability

Protected features may expose configurable public UI only through `draftConfigurability.allowedPublicFields`, such as routes, components, `runtime.dataSources`, and `runtime.apiActions`.

Fields listed in `forbiddenPublicFields` must never move into draft browser payloads. At minimum, keep these server-only:

- tenant IDs and claims
- table and bucket patterns
- partition/key prefixes
- Lambda IDs and authorizer policy
- credential references, secrets, tokens, signed URL policy, and upstream URLs

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

The schema-level error policy requires the response wrapper and safe field list:

```json
{
  "format": "zlp-protected-feature-error-v1",
  "response": {
    "wrapper": "error",
    "fields": ["code", "message", "requestId", "retryable"]
  }
}
```

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

Every descriptor must also declare:

```json
{
  "serverOnly": {
    "exposure": "server-only",
    "forbiddenBrowserKeys": ["tenantId", "credentialRef", "clientSecret"]
  }
}
```

This is redundant by design. It makes the boundary testable before future packaging or deployment tooling exists.

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

`tools/tests/server-config-schema.spec.mjs` validates the core protected feature example against `protected-features.schema.json` and rejects public/server-only leakage in `runtimeBindings` and `serverOnly`.

Future implementations should add packaging-time schema validation for real `server/protected-features.json` files, plus feature-specific BFF/API tests that prove:

- public draft payloads contain no server-only protected feature policy
- unauthorized users cannot read private data
- group and tenant mismatches fail closed
- DynamoDB access includes the tenant/resource boundary
- audit events are written without secrets or raw PII
- error responses follow `zlp-protected-feature-error-v1`
