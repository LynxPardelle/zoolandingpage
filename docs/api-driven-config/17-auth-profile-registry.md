# Auth Profile Registry

Date: 2026-06-08 (Central Time)
Scope: Server-only auth registry and Cognito provisioning foundation for optional draft auth.
Status: Draft foundation
Applies To: Future authoring/runtime Lambdas, backend APIs, protected draft features, blogs, dashboards, uploads, and admin actions.
Source Of Truth:

- `Codex.md`
- `docs/api-driven-config/12-validation.md`
- `tools/auth-profile-registry.mjs`
- `tools/auth-service-handlers.mjs`
- `tools/tests/auth-profile-registry.spec.mjs`
- `tools/tests/auth-service-handlers.spec.mjs`
- `tools/tests/server-config-schema.spec.mjs`
- `docs/api-driven-config/schemas/auth-profile-registry.schema.json`
- `docs/api-driven-config/schemas/integrations.schema.json`

Confidence: Medium; this is an offline contract in the app repo, not a deployed Lambda or CDK stack.
Last Reviewed: 2026-06-09 (Central Time)

## Purpose

`runtime.auth` stays optional and browser-safe. The Auth Profile Registry is the server-only companion that future Lambdas can use to resolve a public `domain + authProfileId` reference into private operational policy.

This repo currently has no in-tree CDK app, Lambda source folder, or deployed auth service. The foundation in `tools/auth-profile-registry.mjs` is intentionally offline and side-effect free so it can be reused by a future serverless authoring/runtime/API service without creating AWS resources from this app checkout.

## Public Draft Payload

Public draft payloads may include only safe runtime metadata:

- `authProfileId`
- `provider`
- `issuer`
- `userPoolId` when it is intentionally public
- `clientId`
- `hostedUiDomain`
- `scopes`
- same-origin paths such as `redirectPath`, `logoutPath`, `loginPath`, `postLoginPath`, and `postLogoutPath`
- page IDs for login, logout, callback, or account pages
- public group claim names and UI-facing group labels when needed

Alternatively, a draft may declare a minimal remote auth reference instead of full static `runtime.auth`:

```json
{
  "runtime": {
    "authRemote": {
      "enabled": true,
      "authProfileId": "staff",
      "endpoint": "/auth/runtime-config"
    }
  }
}
```

`runtime.authRemote` may contain only `enabled`, `authProfileId`, and `endpoint`. The Angular runtime sends only `{ "domain": "...", "authProfileId": "..." }` to that endpoint, expects the API proxy response field `auth` to match the same public `runtime.auth` validator, installs the validated profile into in-memory runtime config, and removes `authRemote` from that in-memory config to avoid ambiguity. A public draft payload must not include both static `runtime.auth` and `runtime.authRemote`.

Public payloads must not include OAuth tokens, refresh tokens, Cognito client secrets, upstream credentials, signed URLs, ownership policy, IAM policy, raw environment values, or social IdP credentials.

## Generic Draft Auth Actions

Draft pages should use normal generic components and the `authAction` event handler for user-facing auth controls:

- `authAction:login` starts Cognito Managed Login through the configured public auth profile.
- `authAction:signup` opens the Cognito `/signup` managed page with the same authorize parameters.
- `authAction:forgotPassword` opens the Cognito `/forgotPassword` managed page with the same authorize parameters.
- `authAction:logout` clears local public session metadata and redirects through Cognito `/logout` when the Hosted UI profile is available.

The app generates OAuth state and PKCE verifier/challenge values in the browser for interactive Cognito redirects. The verifier/state transaction is temporary `sessionStorage` data and must be cleared after callback handling, logout, expiry, or error. The app must not persist OAuth/JWT token strings, refresh tokens, or client secrets in signal state, draft payloads, notes, or browser storage.

When auth starts from the shared testing preview host, the app preserves `draftDomain`, `debugWorkspace`, and `lang` in the exact same-origin Cognito `redirect_uri` and logout URL. The exact `redirect_uri` is stored in the PKCE transaction and reused during token exchange. Cognito app clients used for shared-host testing must allow the matching callback/logout URLs, including their query string, or Cognito will reject the Hosted UI round trip.

The `/auth/callback` route is still a draft-rendered page. Angular processes the callback only after `runtime.auth` has been resolved, exchanges the authorization code with Cognito using PKCE, validates public ID-token claims for UX session metadata, and redirects to `postLoginPath`, an account route, or the first matching protected route. This client-side session can unlock draft UI only; protected APIs must verify JWT signatures, issuer/audience, tenant, and groups server-side.

For SSR, published `GET` and `HEAD` requests to `routes[].auth.required = true` routes are redirected before Angular renders the protected page shell. The server uses `routes[].auth.redirectTo` first, then `runtime.auth.loginPath`, requires the target to be a safe same-origin path, and preserves only `draftDomain`, `debugWorkspace`, and `lang` so shared test previews keep their context without carrying ad or sensitive query params into login routes.

## Server-Only Profile Shape

The server-only registry lives at `drafts/{domain}/server/auth-profile-registry.json`. It maps public `authProfileId` references to operational policy such as:

- tenant ID and auth profile ID
- provisioning status: `planned`, `provisioning`, `active`, `suspended`, or `failed`
- Cognito issuer, Hosted UI domain, public client ID, and accepted audiences
- callback and logout URL allowlists
- same-origin `loginPath` and `logoutPath` exposed to the browser when needed
- tenant claim, group claim, and allowed groups for server-side policy
- provider references for social IdPs such as Google and Facebook
- social IdP credential references under `socialIdpSecretRefs`, never raw credential values

Minimal example:

```json
{
  "version": 1,
  "profiles": [
    {
      "authProfileId": "staff",
      "tenantId": "tenant-example",
      "status": "planned",
      "issuer": "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_EXAMPLE",
      "hostedUiDomain": "https://auth.example.com",
      "clientId": "public-client-id",
      "audiences": ["public-client-id"],
      "callbackUrls": ["https://example.com/auth/callback"],
      "logoutUrls": ["https://example.com/auth/logout"],
      "loginPath": "/login",
      "logoutPath": "/auth/logout",
      "tenantClaim": "custom:tenant_id",
      "groupClaim": "cognito:groups",
      "allowedGroups": ["Editors"],
      "socialIdpSecretRefs": {
        "google": "/zoolanding/auth/example/google"
      }
    }
  ]
}
```

Keep this registry out of runtime browser bundles. A future authoring/runtime Lambda may package it, store it in DynamoDB, or resolve it from a server-only configuration store, but runtime-read must emit only the public metadata described above.

Only profiles with `status: "active"` may generate public `runtime.auth.enabled = true`. Profiles in `planned`, `provisioning`, `suspended`, or `failed` status must remain disabled in browser payloads even when the rest of the profile shape is valid. The public `/auth/runtime-config` response should still use the Angular-valid `runtime.auth` shape for those non-active profiles, but with `enabled: false`; provisioning status and social IdP secret refs stay server-only.

## Provisioning Plan

`buildCognitoProvisioningPlan(profile)` returns a declarative `plan-only` object. It describes operations a future serverless worker can perform, including:

- create or update Cognito user pool
- create or update user pool client
- configure Hosted UI domain
- configure social providers using secret references

The helper does not call AWS, does not deploy CDK, and does not create Cognito resources.

If CDK is added later, keep the app/Lambda boundary:

- Lambdas resolve `domain + authProfileId` server-side.
- CDK or a provisioning worker consumes the validated server-only registry.
- No draft can supply final authorization policy from the browser.
- Social provider credentials are read from a secret store by reference.
- Provisioning must remain tenant-scoped and idempotent.

## Protected Integrations

Protected sources and actions live in `drafts/{domain}/server/integrations.json`. Use `access` for user/JWT authorization and keep upstream credential `auth` separate:

```json
{
  "version": 1,
  "sources": [
    {
      "id": "protectedBlogPosts",
      "method": "GET",
      "url": "https://content.example.com/posts",
      "allowedInputFields": ["category"],
      "response": {
        "allowedFields": ["items.title", "items.slug"]
      },
      "access": {
        "required": true,
        "authProfileId": "staff",
        "allowedGroups": ["Editors"]
      }
    }
  ],
  "actions": [
    {
      "id": "createPost",
      "method": "POST",
      "url": "https://content.example.com/posts",
      "allowedInputFields": ["title", "body"],
      "credentialRef": "zoolanding/upstream/content/oauth",
      "auth": {
        "type": "oauth2-client-credentials"
      },
      "access": {
        "required": true,
        "authProfileId": "staff",
        "allowedGroups": ["Editors"]
      }
    }
  ]
}
```

`access.required: true` requires `access.authProfileId`. `access.allowedGroups` must contain non-empty group names when present. The existing `auth` block is reserved for upstream credentials (`bearer`, `api-key-header`, or `oauth2-client-credentials`), while `credentialRef` stays at the integration root so it matches the API proxy contract.

The authoring package may include `server/auth-profile-registry.json` as kind `server-auth-profile-registry` and `server/integrations.json` as kind `server-integrations`. Static local `/drafts` serving and browser runtime bundles must not expose either file.

## Generic Auth Service Handlers

`tools/auth-service-handlers.mjs` is an offline Lambda-style scaffold for the future generic Auth service. It exports `createAuthServiceHandlers(...)` and requires the real serverless host to inject:

- `loadRegistry`: loads the private Auth Profile Registry from a server-only store.
- `isTrustedServerRequest`: decides whether a caller may request a provisioning plan.
- `verifyJwt`: verifies JWT signature and standard claims before policy evaluation.

The scaffold provides:

- `GET` or `POST /auth/runtime-config`: resolves `domain + authProfileId` and returns only safe public `runtime.auth` metadata.
- `POST /auth/provisioning-plan`: returns the `plan-only` Cognito provisioning operations only for a trusted server-side caller.
- `jwtAuthorizerHandler(event)`: API Gateway Lambda-authorizer-style policy evaluation after the injected verifier returns already-verified claims.

The runtime-config endpoint rejects unsupported browser-supplied fields instead of silently accepting policy or secret-looking inputs. The provisioning endpoint is denied by default so accidentally exposing the scaffold as a public route does not leak server-only provisioning details.

## Backend Authorization

Frontend auth state is UX metadata only. Backend APIs for blogs, dashboards, uploads, and protected actions must:

- verify JWT signature against the issuer JWKS
- require expected issuer and audience from the server-only profile, accepting `aud` for ID-token style claims or Cognito `client_id` for access-token style claims
- resolve tenant ownership from `domain + authProfileId`
- enforce server-side groups or permissions from the registry
- reject requests when the draft domain, auth profile, issuer, audience, or group policy do not match
- reject requests when the configured tenant claim is present and does not equal the server-only tenant ID

`buildJwtVerificationConfig(profile)` prepares the issuer, audience, JWKS URI, groups claim, and tenant boundary a Lambda authorizer can use. For Cognito issuers, preserve the full issuer path when deriving `/.well-known/jwks.json`. `authPolicyFromJwtClaims(profile, claims)` is only a policy evaluator for already-verified claims; it is not a cryptographic JWT verifier.

## Zoosite Pilot Status

The real `drafts/zoositioweb.com.mx` nested draft repo carries a plan-only optional-auth pilot while preserving the full commercial draft. App-level regression tests mirror the public contract in `tools/tests/fixtures/zoosite-auth-pilot/` so the hub repo does not vendor the draft repo. The public `site-config.json` uses only:

```json
{
  "runtime": {
    "authRemote": {
      "enabled": true,
      "authProfileId": "staff",
      "endpoint": "/auth/runtime-config"
    }
  }
}
```

The pilot adds public `/acceso` and `/auth/callback` routes and protects `/mi-cuenta` with `routes[].auth.required = true`, `redirectTo = "/acceso"`, and the groups `zoosite-client` and `zoosite-admin`. These pages are plan-only, contain no private data or protected actions, and use `noindex,nofollow`.

The server-only companion is `drafts/zoositioweb.com.mx/server/auth-profile-registry.json`. It stays plan-only with `status: "planned"`, tenant `zoosite`, callback/logout allowlists for the `.com.mx` domain and `.com` alias, and social provider secret references such as `/zoolanding/auth/zoosite/staff/google`. It must not be shipped in browser runtime bundles, must not contain raw secrets, and does not create AWS or Cognito resources.

For local end-to-end QA, run the sibling `zoolanding-api-proxy` local auth harness with `DRY_RUN=1` and a `LOCAL_AUTH_REGISTRY_DIR` or `LOCAL_AUTH_REGISTRY_FILE` pointing at a reviewed server-only registry source, then start Angular with `npm run start:local-auth`. The Angular dev server proxies `/auth/runtime-config` to the local API proxy, so browser QA exercises browser -> Angular -> API proxy -> server-only registry -> Angular validation without publishing static `runtime.auth` in the draft payload.
