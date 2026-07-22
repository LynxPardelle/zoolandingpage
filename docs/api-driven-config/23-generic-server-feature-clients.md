# Generic Server Feature Clients

Date: 2026-07-21 (Central Time)
Status: Implemented and verified locally in Phase 7; not deployed.

This contract connects draft-composed pages to Data Spaces, Commerce, and Integrations without adding a Zoolandingpage administration product. Drafts continue to build public and protected routes from the existing generic components. The platform core supplies only validated bindings, safe request builders, same-origin clients, dispatch, transient handoffs, and status/data targets.

The server remains authoritative for identity, environment, tenant, draft, domain, provider connection, prices, tax, inventory, authorization, and required request fields. A browser binding selects one code-owned operation; it cannot select an endpoint or supply server scope.

## Runtime Kinds

| Kind | Binding | Browser exposure | SSR |
| --- | --- | --- | --- |
| `data-space` | `dataSpace` | Protected reads/actions; public published record list/detail only | Public reads only |
| `commerce` | `commerce` | Protected catalog/inventory/subscription operations; public offer list/detail and Checkout admission | Public reads only |
| `integrations` | `integrations` | Protected connection list/actions and Stripe onboarding handoff | Never |

Every runtime entry must contain exactly the binding that matches its `kind`. Existing `api-proxy`, `auth-admin`, `content-hub`, and `combo-catalog` entries cannot carry these bindings. A draft that does not configure these kinds is unchanged.

## Request Flow

1. A draft route composes existing table, input, modal, card, button, and text components.
2. `runtime.dataSources` and `runtime.apiActions` bind component data/events to one literal operation.
3. Validation rejects unknown kinds, operations, cross-kind bindings, protected SSR reads, unsafe gesture configuration, and unsafe input-field names.
4. The runtime builder keeps only the operation's browser-supported top-level fields and preserves generic nested Data Spaces `schema`/`data` content without rewriting it. Draft authors must never place credentials, secrets, tokens, PII, provider-account authority, signed URLs, or infrastructure metadata in that content. The Data Spaces backend explicitly rejects prohibited field classes; the browser does not silently sanitize them.
5. The client sends JSON only to a literal same-origin `/features/...` path with `credentials: "include"` and `redirect: "error"`, so an unexpected 307/308 cannot forward the mutation payload. Protected calls include the configured public Auth Profile ID; mutations also use the configured CSRF header and, where required, a 256-bit browser recovery idempotency key.
6. The owning backend derives and verifies scope and authorization, validates required fields and types, resolves server descriptors and provider bindings, and returns a bounded response.
7. Generic response mapping writes only the configured data/status target. Backend messages are replaced with localized safe errors; a safe request ID may be retained for support.

Unknown operations, binding mismatches, unsafe handoffs, and invalid local configuration fail before a network request. New feature kinds reject the legacy `proxySourceId`/`proxyActionId` aliases, and actions allow only omitted `method` or literal `POST`; the typed binding is the sole operation selector. Browser-supplied prices, currency, tenant, draft, environment, domain, provider account, credentials, endpoint, secret reference, or IAM/storage values cannot alter server authority.

For an idempotent mutation, transport failures, unreadable/malformed responses, redirects, HTTP 5xx, 408, 425, and 429 remain ambiguous and retain the exact recovery key for an exact-input retry. A successful response or a different definitive 4xx response clears it. The bounded in-memory recovery set fails closed at 20 unresolved mutations; it is browser-session recovery, not a durable queue.

## Supported Bindings

### Data Spaces

Protected reads are `collectionList`, `collectionSchema`, `recordList`, and `recordDetail`. Only `recordList` and `recordDetail` may use `access: "public"`.

Protected actions are `createCollection`, `updateCollection`, `createRecord`, `updateRecord`, `publishRecord`, and `unpublishRecord`. Every binding includes a lowercase server-feature-safe `spaceId` with at most 64 characters.

### Commerce

Protected reads are `itemList`, `itemDetail`, `offerList`, `offerDetail`, `discountList`, and `discountDetail`. Only `offerList` and `offerDetail` may use `access: "public"`.

Protected actions are:

- catalog: `createItem`, `createOfferVersion`, `createDiscountVersion`, `advanceOfferLifecycle`, `updateOfferPresentation`, `advanceDiscountLifecycle`, and `updateDiscountPresentation`;
- inventory: `adjustStock`;
- subscriptions and migration: `changePlan`, `applyDiscount`, `removeDiscount`, `pause`, `resume`, `openPortal`, `migrationPreview`, `migrationExecute`, `migrationPause`, `migrationResume`, `migrationCancel`, and read-like `migrationStatus`;
- public Checkout admission: `admitCheckout`.

Public Checkout accepts only `lines[].offerVersionId`, `lines[].quantity`, and optional `discountVersionId`. It never accepts a browser price or provider scope. On the shared test host, the client adds only the validated `draftDomain` selector required by the existing front door; production uses the canonical host without that query selector.

### Integrations

The protected read is `connectionList`. Protected generic actions are `disable` and `requestReconnect`. Stripe onboarding uses `stripeOnboardingStart`, `stripeOnboardingReturn`, and `stripeOnboardingDeauthorize` with a configured safe opaque `bindingId` and the dedicated onboarding route.

`state`, `code`, and provider-hosted URLs are transient browser handoff values, not runtime configuration or VariableStore data. The return handler removes `state`, `code`, `error`, `error_description`, `error_uri`, `scope`, `livemode`, and `stripe_user_id` from the current URL before calling the backend; descriptive/provider fields are ignored and never forwarded. It accepts one `state` and exactly one `code` or closed error code; `state`/`code` are bounded to 1–1024 characters, control-bearing codes fail locally, and errors are limited to `access_denied`, `invalid_scope`, `server_error`, or `temporarily_unavailable`. The browser navigates only to the exact HTTPS Stripe hosts approved for Connect, Checkout, or Billing; Checkout and Billing handoffs also require a future integer expiry.

## Pre-S3 Release Guard

Draft packages that use `data-space`, `commerce`, `integrations`, or a `route-load` action pass the dependency-free `server-feature-runtime-config-guard.mjs` before Config Authoring receives a request and before the draft-repository deployment helper can perform a signed POST. The guard enforces the same closed kinds, bindings, input matrices, SSR/public boundaries, gesture requirements, globally unique action IDs, and Stripe-return route constraints as the Angular validator. It also resolves local or packaged remote-auth callback metadata and fails closed when a return route cannot be proved distinct and protected.

Drafts that do not opt into these bindings remain unaffected. A rejection exposes only the stable `server_feature_runtime_config_failed:<count>` code; it does not echo draft values. This local gate complements, but does not replace, Config Authoring's server-side validation or the owning backend's authorization. Its template copy is part of the controlled draft-tooling rollout closure, so existing draft repositories must receive that closure before the protection is active there.

## Draft-Composed Examples

These fragments use synthetic IDs and omit unrelated site configuration. They illustrate authoring shape, not a deployable pilot package.

### Collection administration

```json
{
  "dataSources": [
    {
      "id": "admin-collections",
      "kind": "data-space",
      "dataSpace": { "read": "collectionList", "spaceId": "example-content" },
      "target": "admin.collections.items",
      "ssr": false
    }
  ],
  "apiActions": [
    {
      "id": "create-example-record",
      "kind": "data-space",
      "dataSpace": { "action": "createRecord", "spaceId": "example-content" },
      "inputFields": ["collectionId", "recordId", "data"],
      "statusTarget": "admin.records.create"
    },
    {
      "id": "publish-example-record",
      "kind": "data-space",
      "dataSpace": { "action": "publishRecord", "spaceId": "example-content" },
      "inputFields": ["collectionId", "recordId", "expectedRevision"],
      "statusTarget": "admin.records.publish"
    }
  ]
}
```

Bind the list target to a generic table and the action fields to generic inputs/buttons. Record `data` may contain draft-specific fields such as title, domain label, environment label, or calculated values. Generic nested data is transported unchanged; authors must exclude sensitive fields and the Data Spaces backend rejects prohibited server-authority and secret classes.

### Catalog and price administration

```json
{
  "dataSources": [
    {
      "id": "admin-offers",
      "kind": "commerce",
      "commerce": { "read": "offerList" },
      "target": "admin.offers.items",
      "ssr": false
    }
  ],
  "apiActions": [
    {
      "id": "create-offer-version",
      "kind": "commerce",
      "commerce": { "action": "createOfferVersion" },
      "inputFields": ["versionId", "catalogItemId", "revision", "sellableType", "unitPrice", "taxBehavior", "recurrence", "displayName", "displayDescription"],
      "statusTarget": "admin.offers.create"
    },
    {
      "id": "activate-offer-version",
      "kind": "commerce",
      "commerce": { "action": "advanceOfferLifecycle" },
      "inputFields": ["versionId", "targetState", "expectedRevision"],
      "statusTarget": "admin.offers.lifecycle"
    }
  ]
}
```

Authenticated draft administrators may author a new immutable offer version and switch lifecycle state. Public buyers still submit only an offer-version ID and quantity; Commerce resolves the authoritative price.

### Inventory adjustment

```json
{
  "apiActions": [
    {
      "id": "adjust-example-stock",
      "kind": "commerce",
      "commerce": { "action": "adjustStock" },
      "inputFields": ["stockId", "delta", "expectedRevision"],
      "statusTarget": "admin.inventory.adjust"
    }
  ]
}
```

The UI supplies the opaque stock ID, signed integer delta, and expected revision. Commerce owns concurrency and inventory invariants.

### Order and subscription review

Phase 7 does not invent order-list, order-detail, subscription-list, or subscription-detail browser routes because the current Commerce backend does not expose them. A draft may display the bounded result of an immediately completed Checkout or subscription command and may poll `migrationStatus` as shown below. True order/subscription browsing requires a separately implemented backend read contract before a binding can be added.

```json
{
  "apiActions": [
    {
      "id": "open-customer-portal",
      "kind": "commerce",
      "commerce": { "action": "openPortal" },
      "inputFields": ["subscriptionId"],
      "requiresUserGesture": true,
      "statusTarget": "admin.subscription.portal"
    }
  ]
}
```

The portal response is consumed as a transient navigation handoff and is never persisted in the status target.

### Migration preview and approval

```json
{
  "apiActions": [
    {
      "id": "preview-example-migration",
      "kind": "commerce",
      "commerce": { "action": "migrationPreview" },
      "inputFields": ["sourceOfferVersionId", "targetOfferVersionId"],
      "statusTarget": "admin.migration.preview"
    },
    {
      "id": "execute-example-migration",
      "kind": "commerce",
      "commerce": { "action": "migrationExecute" },
      "inputFields": ["commercialRequestId", "dryRunRevision", "dryRunHash", "confirmation"],
      "statusTarget": "admin.migration.execute"
    },
    {
      "id": "review-example-migration",
      "kind": "commerce",
      "commerce": { "action": "migrationStatus" },
      "inputFields": ["commercialRequestId", "limit", "cursor"],
      "statusTarget": "admin.migration.status"
    }
  ]
}
```

`migrationExecute` must reuse the exact protected dry-run identifiers returned by the server. `migrationStatus` is read-like and does not create a mutation idempotency key.

### Integration status and onboarding

```json
{
  "routes": [
    {
      "path": "/integraciones/stripe/retorno",
      "pageId": "stripe-return",
      "auth": { "required": true, "allowedGroups": ["draft-owner"] }
    }
  ],
  "dataSources": [
    {
      "id": "admin-connections",
      "kind": "integrations",
      "integrations": { "read": "connectionList" },
      "target": "admin.connections.items",
      "ssr": false
    }
  ],
  "apiActions": [
    {
      "id": "start-example-stripe-onboarding",
      "kind": "integrations",
      "integrations": { "action": "stripeOnboardingStart", "bindingId": "stripe-main" },
      "requiresUserGesture": true,
      "statusTarget": "admin.connections.onboarding"
    },
    {
      "id": "return-example-stripe-onboarding",
      "kind": "integrations",
      "integrations": { "action": "stripeOnboardingReturn", "bindingId": "stripe-main" },
      "trigger": "route-load",
      "pageIds": ["stripe-return"],
      "statusTarget": "admin.connections.onboardingReturn"
    }
  ]
}
```

The binding ID is an opaque server-owned reference. The return action runs automatically only in the browser, once per runtime initialization and globally unique action ID, after route authorization and validated site configuration but before page/component/i18n fetches. It must declare exactly one target page, that page must resolve to exactly one protected route, only one route-load callback consumer may target it, and its normalized route must not equal or match the configured Cognito callback page/path. No Stripe account ID, token, client secret, return URL, OAuth value, or arbitrary endpoint belongs in the draft.

## Error, Retry, And Status Rules

- HTTP success may be `{ "data": ..., "requestId": "..." }`; `ok` is optional. An explicit `ok: false`, HTTP error, or error object is a failure.
- Raw backend/provider errors are never rendered. The client emits a localized category message and retains only a syntactically safe request ID.
- Mutating Data Spaces and Commerce calls use a random 32-byte base64url idempotency key. The exact key is reused only after an ambiguous exact retry and is cleared after a definitive response body is read and parsed.
- At most 20 ambiguous mutation keys remain in browser memory. The client fails closed at the cap rather than evicting an unresolved key.
- Network/body-stream ambiguity and timeout do not imply business failure. The owning backend remains the source of truth.
- OAuth codes, state, Checkout URLs, Billing URLs, Connect URLs, and fiscal access proofs are transient and must not be written to draft files, runtime configuration, logs, status targets, or VariableStore.
- Bootstrap may reset runtime variables after the early OAuth exchange. The runtime restores only the closed onboarding status projection (`pending|ready`, four readiness booleans, and a bounded requirement count) or a localized safe error/request ID. It never restores OAuth input, provider text, account references, or redirect URLs.

## Verification Boundary

Phase 7 verifies schema/semantic validation, exact dispatch, operation field selection, protected/public headers, CSRF, idempotency recovery, safe errors, SSR restrictions, OAuth cleanup, and redirect allowlists with synthetic local tests. It creates no AWS resource, provider call, connected account, secret, customer record, draft route, or deployment.

Infrastructure routes, deployed identities, transformed IAM, alarms, cross-service smoke/failure injection, and provider-backed test evidence remain Phase 8. Pilot draft routes/configuration remain Phase 9.
