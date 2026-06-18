# Auth Profile Registry

Date: 2026-06-08 (Central Time)
Scope: Server-only auth registry and Cognito provisioning foundation for optional draft auth.
Status: Draft foundation
Applies To: Future authoring/runtime Lambdas, backend APIs, protected draft features, blogs, dashboards, uploads, and admin actions.
Source Of Truth:

- `Codex.md`
- `docs/api-driven-config/12-validation.md`
- `tools/auth-profile-registry.mjs`
- sibling repo `zoolanding-auth-admin` for the generic auth-admin BFF
- `tools/auth-service-handlers.mjs`
- `tools/tests/auth-profile-registry.spec.mjs`
- `tools/tests/auth-service-handlers.spec.mjs`
- `tools/tests/server-config-schema.spec.mjs`
- `docs/api-driven-config/schemas/components.schema.json`
- `docs/api-driven-config/schemas/auth-profile-registry.schema.json`
- `docs/api-driven-config/schemas/integrations.schema.json`

Confidence: Medium; this is an offline contract in the app repo, not a deployed Lambda or CDK stack.
Last Reviewed: 2026-06-17 (Central Time)

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

This Managed Login path is the default auth UX mode, not the only allowed mode. Drafts that need deeper personalization may use generic draft components for custom sign-in, sign-up, confirmation, password recovery, and password reset flows, backed by server-side auth Lambdas. The mode must be selected per `authProfileId`, so one draft can use Cognito Managed Login while another uses custom generic forms. Custom forms may improve UX with localized copy, show-password controls, and confirm-password fields, but they must still send only public context such as `domain`, `authProfileId`, email, password, and confirmation codes. Tenant, user-pool, group, and billing decisions must be resolved server-side.

Custom form drafts use generic inputs, buttons, visibility toggles, validation messages, and the reusable `authFormAction` event handler. The supported actions are:

- `authFormAction:signin`: posts email/password to `/auth/signin`.
- `authFormAction:signup`: posts email/password to `/auth/signup`.
- `authFormAction:confirmSignup`: posts email/code to `/auth/confirm-signup`.
- `authFormAction:resendConfirmation`: posts email to `/auth/resend-confirmation`.
- `authFormAction:forgotPassword`: posts email to `/auth/forgot-password`.
- `authFormAction:confirmForgotPassword`: posts email/code/new password to `/auth/confirm-forgot-password`.
- `authFormAction:logout`: clears local public session metadata and navigates to the configured same-origin logout/login path without calling Cognito Hosted UI.

For password UX, drafts may opt into generic-input validation checklists and generic scope validation instead of custom Angular code. Use separate validation rules for each visible requirement, including lower case, upper case, number, minimum length, and symbol requirements. Use `matchesField` to compare confirm-password fields to the password field, and use `disabledWhenInvalidScope` on submit buttons so account creation or password reset is not clickable until the interaction scope is valid. These controls are UX validation only; the backend auth service and Cognito policy must still enforce final password, tenant, and group rules server-side.

The Angular service derives `domain`, `authProfileId`, and current language from runtime state and removes client-supplied tenant, group, and policy-looking fields from requests. Confirm-password fields are local UX validation only and are never sent to the Lambda. The Lambda must read `customAuth` from the server-only profile, call Cognito with a public app client, set tenant attributes and default groups only from server-side policy, and return sanitized statuses such as `signed-in`, `confirmation-required`, `confirmed`, `code-sent`, or `password-reset`. Custom signin requires a Cognito app client that supports the configured password auth flow. Custom signin returns only public session metadata to Angular; it does not return ID, access, or refresh tokens. Backend APIs still need JWT verification for protected data/actions, so custom signin must not be treated as API authorization by itself.

After successful custom-auth actions, Angular performs same-origin UX navigation without putting the user's email in the URL. `signup` goes to the confirmation route with `authStatus=account-created`, `forgotPassword` goes to the password-code route with `authStatus=password-code-sent`, and successful `confirmSignup` or `confirmForgotPassword` return to the configured login path with `authStatus=account-confirmed` or `authStatus=password-reset`. Drafts may show static success banners with `queryEq` conditions; those query flags are display hints only and must never authorize data or actions.

The app generates OAuth state and PKCE verifier/challenge values in the browser for interactive Cognito redirects. The verifier/state transaction is temporary `sessionStorage` data and must be cleared after callback handling, logout, expiry, or error. The app must not persist OAuth/JWT token strings, refresh tokens, or client secrets in signal state, draft payloads, notes, or browser storage.

When auth starts from the shared testing preview host, the app preserves `draftDomain`, `debugWorkspace`, and `lang` in the exact same-origin Cognito `redirect_uri`. The exact `redirect_uri` is stored in the PKCE transaction and reused during token exchange. Hosted UI logout URLs preserve only allowlist-stable preview params such as `draftDomain` and `debugWorkspace`; custom-auth logout should not use Hosted UI at all. Cognito app clients used for shared-host testing must allow the matching callback/logout URLs, including their query string, or Cognito will reject the Hosted UI round trip.

The `/auth/callback` route is still a draft-rendered page. Angular processes the callback only after `runtime.auth` has been resolved, exchanges the authorization code with Cognito using PKCE, validates public ID-token claims for UX session metadata, and redirects to `postLoginPath`, an account route, or the first matching protected route. This client-side session can unlock draft UI only; protected APIs must verify JWT signatures, issuer/audience, tenant, and groups server-side.

For SSR, published `GET` and `HEAD` requests to `routes[].auth.required = true` routes are redirected before Angular renders the protected page shell. The server uses `routes[].auth.redirectTo` first, then `runtime.auth.loginPath`, requires the target to be a safe same-origin path, and preserves only `draftDomain`, `debugWorkspace`, and `lang` so shared test previews keep their context without carrying ad or sensitive query params into login routes.

## Server-Only Profile Shape

The server-only registry lives at `drafts/{domain}/server/auth-profile-registry.json`. It maps public `authProfileId` references to operational policy such as:

- tenant ID and auth profile ID
- provisioning status: `planned`, `provisioning`, `active`, `suspended`, or `failed`
- Cognito issuer, Hosted UI domain, public client ID, and accepted audiences
- callback and logout URL allowlists
- same-origin `loginPath` and `logoutPath` exposed to the browser when needed
- tenant claim, optional environment claim, group claim, and allowed groups for server-side policy
- provider references for social IdPs such as Google and Facebook
- social IdP credential references under `socialIdpSecretRefs`, never raw credential values

The default isolation and billing model is one Cognito user pool per paying client or strong draft boundary. A shared user pool with tenant claims is not the default because it complicates per-client billing, social IdP configuration, callback allowlists, blast-radius control, and user lifecycle ownership. `tenantId` and `tenantClaim` remain useful inside a user pool for finer backend permissions, specialized dashboards, internal sections, and analytics scopes, but they are a secondary authorization boundary. When a profile configures a tenant claim, backend APIs should reject missing or mismatched claims after JWT signature, issuer, and audience verification.

For a single client's testing and production users, a draft may intentionally share one Cognito user pool and declare an `environmentClaim` such as `custom:zoolanding_env`. Custom signup writes `dev`, `test`, or `prod` from the API proxy stack environment, never from browser input. Signin and JWT-protected APIs must then reject users whose verified environment claim does not match the stack. This is useful for testing/prod separation within one client pool, but it is not a replacement for per-client user pools.

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
      "environmentClaim": "custom:zoolanding_env",
      "groupClaim": "cognito:groups",
      "allowedGroups": ["Editors"],
      "customAuth": {
        "signin": {
          "enabled": true
        },
        "signup": {
          "enabled": true,
          "setTenantClaim": true,
          "setEnvironmentClaim": true,
          "defaultGroups": ["Editors"]
        },
        "passwordRecovery": {
          "enabled": true
        }
      },
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

- create or update the draft/client-specific Cognito user pool
- create the mutable environment custom attribute when `environmentClaim` is configured
- create or update user pool client
- configure Hosted UI domain
- configure social providers using secret references

The helper does not call AWS, does not deploy CDK, and does not create Cognito resources.

If CDK is added later, keep the app/Lambda boundary:

- Lambdas resolve `domain + authProfileId` server-side.
- CDK or a provisioning worker consumes the validated server-only registry.
- No draft can supply final authorization policy from the browser.
- Social provider credentials are read from a secret store by reference.
- Provisioning must remain draft/client-scoped and idempotent.
- Social IdPs are optional per auth profile; a Cognito-only profile is valid when a draft does not need Google, Facebook, or other external identity providers.

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

## Generic Auth Admin BFF

Drafts that need custom account UI, admin approval, future blog editors, analytics dashboards, uploads, or configuration panels should use the generic `zoolanding-auth-admin` BFF instead of returning Cognito tokens to browser JavaScript.

The first BFF contract creates HttpOnly sessions through custom sign-in. Cognito Managed Login / Hosted UI remains optional per draft, but it does not create the same BFF session until a future server-side callback/token-exchange endpoint is added.

The public browser contract is still minimal:

- `POST /auth/session/signin`: receives `domain`, `authProfileId`, email, password, and optional language; signs in through the server-side Cognito profile; creates a private session; and returns only sanitized session metadata.
- `GET /auth/session/me`: returns the current account profile for `/mi-cuenta`.
- `POST /auth/session/logout`: revokes the private session and clears cookies.
- `GET /auth/admin/users`: lists sanitized users for admin surfaces.
- `POST /auth/admin/users/{subject}/approve`
- `POST /auth/admin/users/{subject}/groups`
- `POST /auth/admin/users/{subject}/suspend`
- `POST /auth/admin/users/{subject}/reactivate`

All session/admin requests after signin must include the current draft context through same-origin request headers:

- `X-ZLP-Domain`
- `X-ZLP-Auth-Profile-Id`

The Lambda compares that context with the private session before returning account data or running admin actions. This matters on shared preview hosts where multiple drafts can render on the same browser origin.

During first-load route checks, Angular may only have the public `runtime.authRemote` reference while the public `runtime.auth` profile is still being resolved. Protected routes that use the auth-admin BFF must still attempt `/auth/session/me` before redirecting, using the resolved draft domain and `runtime.authRemote.authProfileId` for the same-origin headers. The BFF response remains the source of truth for the account and route group checks; `authRemote` only supplies public request context.

Session cookies use the `__Host-zlp_session` name with `HttpOnly`, `Secure`, `SameSite=Lax`, and `Path=/`. Mutating requests also require a readable `zlp_csrf` cookie to match the configured CSRF header, normally `X-ZLP-CSRF`, and the server-side CSRF hash. No JWT, ID token, access token, refresh token, Cognito client secret, or upstream credential is returned to Angular.

`/mi-cuenta` is for any authenticated user in the draft/profile, including users with `approvalStatus: "pending"`. `/admin/*` is for approved users with a configured admin group. Admin requests must re-check current user state, not only the session snapshot, so suspension or group removal takes effect before the next admin action.

Server-only auth profile fields for this BFF include:

- `adminGroups`
- `manageableGroups`
- `defaultUserStatus`
- `adminGroupsAutoApproved`
- `maxSessionSeconds`
- `allowedTokenUses`, restricted to `id` and/or `access`
- public-safe `session` path metadata
- public-safe `admin` path metadata

The public runtime-config response may expose the safe `session` and `admin` same-origin paths, but it must not expose `adminGroups`, `manageableGroups`, tenant policy, Cognito mutable attribute policy, IAM policy, secrets, or credential references. The BFF reads those from server-only config.

## Backend Authorization

Frontend auth state is UX metadata only. Backend APIs for blogs, dashboards, uploads, and protected actions must:

- verify JWT signature against the issuer JWKS
- require expected issuer and audience from the server-only profile, accepting `aud` for ID-token style claims or Cognito `client_id` for access-token style claims
- require a stable subject claim and an allowed Cognito `token_use`; profiles default to `["id", "access"]` unless `allowedTokenUses` is narrowed server-side
- resolve tenant ownership from `domain + authProfileId`
- enforce server-side groups or permissions from the registry
- reject requests when the draft domain, auth profile, issuer, audience, or group policy do not match
- reject requests when a configured tenant claim is missing or does not equal the server-only tenant ID

`buildJwtVerificationConfig(profile)` prepares the issuer, audience, JWKS URI, groups claim, and tenant boundary a Lambda authorizer can use. For Cognito issuers, preserve the full issuer path when deriving `/.well-known/jwks.json`. `authPolicyFromJwtClaims(profile, claims)` is only a policy evaluator for already-verified claims; it is not a cryptographic JWT verifier.

## Zoosite Auth Status

The real `drafts/zoositioweb.com.mx` nested draft repo carries the active `staff` auth profile while preserving the full commercial draft. App-level regression tests mirror the public contract in `tools/tests/fixtures/zoosite-auth-pilot/` so the hub repo does not vendor the draft repo. The public `site-config.json` uses only:

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

Zoosite exposes public custom-auth routes for `/acceso`, `/registro`, `/confirmar-cuenta`, `/recuperar-contrasena`, and `/cambiar-contrasena`; keeps `/auth/callback` available for Managed Login compatibility; protects `/mi-cuenta` for `zoosite-client` and `zoosite-admin`; and protects `/admin/usuarios` for `zoosite-admin` only. Auth routes and private account/admin routes stay excluded from the sitemap.

The server-only companion is `drafts/zoositioweb.com.mx/server/auth-profile-registry.json`. It has `status: "active"`, tenant `zoosite`, the real public Cognito profile IDs, callback/logout allowlists for the `.com.mx` domain and `.com` alias, `custom:zoolanding_env` as the environment claim, `zoosite-client` as the default custom-signup group, and the auth-admin `session`/`admin` same-origin path metadata. It must not be shipped in browser runtime bundles and must not contain raw secrets.

For local end-to-end QA, run the sibling `zoolanding-api-proxy` local auth harness with `DRY_RUN=1` and a `LOCAL_AUTH_REGISTRY_DIR` or `LOCAL_AUTH_REGISTRY_FILE` pointing at a reviewed server-only registry source, then start Angular with `npm run start:local-auth`. The Angular dev server proxies `/auth/runtime-config` to the local API proxy, so browser QA exercises browser -> Angular -> API proxy -> server-only registry -> Angular validation without publishing static `runtime.auth` in the draft payload.
