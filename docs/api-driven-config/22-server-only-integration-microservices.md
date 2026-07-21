# Server-Only Integration Foundation

Date: 2026-07-20 (Central Time)
Scope: Draft-scoped server-only descriptors and the approved service boundaries that consume them.
Status: Phase 1 contract/authoring boundary is active; Data Spaces is implemented locally only; no Data Spaces AWS stack or live provider path is deployed by this document.
Source Of Truth:

- [Approved implementation plan](../../plan/infrastructure-server-only-integrations-1.md)
- [Data Spaces schema](./schemas/data-spaces.schema.json)
- [Commerce schema](./schemas/commerce.schema.json)
- [Integration Bindings schema](./schemas/integration-bindings.schema.json)
- [Notification Policies schema](./schemas/notification-policies.schema.json)
- [Protected Feature Contract](./19-protected-feature-contract.md)
- [`draft-feature-readiness.mjs`](../../tools/draft-feature-readiness.mjs)
- [Repository map](../repository-map.md)

Confidence: High for the Phase 1 descriptor/readiness/authoring contract, local Data Spaces implementation, and local Commerce TASK-025 through TASK-029 foundation; planned for live service infrastructure and provider behavior.
Last Reviewed: 2026-07-20 (Central Time)

## Contract Status

This document separates what exists in the current Zoolandingpage worktree from the approved target architecture.

| Surface | Current status |
| --- | --- |
| Four closed, bounded JSON Schemas | Present locally in Phase 1 |
| Dependency-free schema and semantic readiness validation | Present locally in Phase 1 |
| Pre-S3 enforcement in Config Authoring | Active in test and production from an explicit allowlisted SAM artifact; invalid packages and stored-package publication failures are fail-closed |
| Browser/SSR draft artifact boundary | Sanitized boundary-fix releases are active and private-path probes return `404`; incident closure remains gated by historical access limitations and final browser/risk acceptance evidence |
| Runtime Read public/server boundary and deployment identities | Active in test and production with exact GitHub OIDC callers, retained CloudFormation service roles, code-owned execution boundaries, unchanged Lambda/API physical IDs, bounded public/S3 work, verified denial of server-only descriptor reads, and exact `GET /runtime-bundle` throttle 25/burst 50 |
| Data Spaces service | Implemented and verified in the local `Z:\GitHub\zoolanding-data-spaces` repository; no remote or AWS resource exists yet |
| Commerce service | TASK-025 through TASK-034 are implemented and verified locally in `Z:\GitHub\zoolanding-commerce`: policy resolution, retained storage, provider-neutral domain rules, eight literal browser routes, authorization, catalog/inventory/Checkout, integration-event inbox and notification outbox, subscription projection, reconciliation, and isolated manual fiscal intake; no remote or AWS deployment exists yet |
| Integrations and Notifications services | Approved target for later phases; not implemented or deployed by this contract |
| Stripe Connect, Checkout, Billing, and webhook handling | Stripe-specific adapter target; live setup is gated |
| SMTP2GO outbound delivery | The standalone test account and `zoolandingpage.com.mx` sender domain are verified, and two sandboxed pilot-specific SMTP users exist. Credential rotation into canonical Secrets Manager bindings, final recipient policy, quota/cost approval, and acceptance/delivery evidence remain gated |

A descriptor authorizes nothing by itself. It is policy input that a service must load from the exact published package version and enforce server-side.

## Platform Boundary

Zoolandingpage remains a generic renderer, component configurator, and action/data-source orchestrator. It does not own a central platform-administration UI. A draft may compose its own public or protected administration routes from generic components, and drafts that do not need integrations may omit all four new descriptors.

The platform core is provider-neutral:

- Data Spaces owns bounded generic collection policy and records.
- Commerce owns sellables, offer versions, stock, orders, fulfillment, commercial subscription state, and isolated fiscal requests.
- Integrations owns connection bindings, provider mappings, provider snapshots, webhook receipts, and provider-side migration execution.
- Notifications owns delivery attempts, retry/circuit state, and the final `accepted_by_smtp` status.

Stripe is the first Integrations adapter, not the architecture. Stripe-specific choices stay inside the `stripe` binding block and the Integrations adapter: merchant accounts, direct charges, connected-account fee payer, Stripe tax mode, hosted onboarding/Checkout/Portal, signature verification, and provider resource mappings. The verified implementation pair is `stripe==15.3.1` with API/webhook behavior pinned to `2026-06-24.dahlia`; both require current official-source revalidation before every test or production deployment. The adapter has explicit Accounts v2 and Accounts v1 paths: v2 activation remains blocked until Stripe Sandbox proof covers Mexico, required capabilities, and the selected topology; the fallback is Accounts v1/OAuth for an externally owned account, with Account Links only where current official controller properties allow them. A future provider requires a code-owned adapter, allowlisted egress and redirects, bounded timeouts and responses, and contract tests. A draft can never supply an arbitrary URL, hostname, secret path, or credential-forwarding target.

SMTP2GO is the first Notifications transport, not the notification contract. Draft descriptors continue to request the generic `email.smtp` provider and `accepted_by_smtp` result; the owning services select the code-owned `smtp2go-smtp-v1` adapter, endpoint, port, account binding, and credential. Test uses the standalone SMTP2GO account designated for `zoolandingpage.com.mx`, once provisioned and verified, with a unique SMTP user/credential, connection, and server-enforced sender/rate namespace per test draft. Public plan documentation lists unlimited SMTP users; if the live account contradicts that entitlement, activation fails closed and the plan is repriced rather than sharing a credential. Production uses one standalone SMTP2GO account and credential set per `draftId + canonical sending domain`; production account or credential reuse across drafts or sending domains is forbidden. A second production sending domain requires a separately approved connection rather than implicit reuse.

SMTP2GO is outbound-only in this contract. Existing inbound MX/mailbox service remains independent, and receiving, synchronization, replies, IMAP, and mailbox UI remain deferred. The MVP does not add SMTP2GO REST sending, provider webhooks, archiving, open tracking, or click tracking.

## Service Ownership

The approved target uses four independently deployable repositories, with multiple small Lambdas inside each service boundary when IAM, exposure, scaling, timeout, or blast radius differs.

| Service | Exclusive ownership | Does not own |
| --- | --- | --- |
| `zoolanding-data-spaces` | Collection schemas, generic records, public projection, revisions, and record/schema audit | Prices, stock, payments, subscriptions, fiscal data, or credentials |
| `zoolanding-commerce` | Catalog projection, immutable `OfferVersion` and `DiscountVersion`, stock/reservations, orders, fulfillment, commercial payment/subscription projection, migration requests/approval, and fiscal requests | Canonical Stripe state, provider credentials, or generic content storage |
| `zoolanding-integrations` | Generic connections/bindings, provider mappings and snapshots, webhook receipts/outboxes, Stripe adapter, and provider migration jobs/items | Commercial order/access decisions or draft publication |
| `zoolanding-notifications` | Delivery ledger, retry attempts, rate/circuit state, and SMTP acceptance | Payment truth, arbitrary recipients, mailbox reading, or customer receipts |

Services do not read each other's domain tables. Exact AWS IAM-protected APIs carry synchronous commands; publisher-owned SNS topics and consumer-owned SQS queues/DLQs carry confirmed asynchronous state. The only inherited read-only dependencies are the existing Auth Admin session/current-state contract and the exact Config Registry/S3 published descriptor lookup.

## Server Descriptor Files

The packaging kind map is exact. Unknown `server/*.json` files and caller-supplied kind mismatches must fail validation.

| Draft file | Package kind | Contract |
| --- | --- | --- |
| `server/auth-profile-registry.json` | `server-auth-profile-registry` | Existing auth policy |
| `server/integrations.json` | `server-integrations` | Existing API-proxy integration policy |
| `server/data-spaces.json` | `server-data-spaces` | New Data Spaces policy |
| `server/commerce.json` | `server-commerce` | New Commerce policy |
| `server/integration-bindings.json` | `server-integration-bindings` | New provider binding policy |
| `server/notification-policies.json` | `server-notification-policies` | New notification policy |

Every new descriptor uses `version: 1` and the same closed scope:

```json
{
  "environment": "test",
  "tenantId": "tenant-example",
  "draftId": "draft-example",
  "domain": "example.com"
}
```

`environment` is only `test` or `production`. IDs are bounded lowercase ASCII identifiers. A descriptor scope that disagrees with the requested environment or canonical domain is blocking.

### Data Spaces

`server/data-spaces.json` declares one or more spaces, whether each is active, optional Auth Profile access and action-scoped capabilities, public-read policy, allowed `public`/`internal` classifications, and hard limits. It does not declare tables, keys, indexes, expressions, executable code, or unrestricted queries.

Phase 1 accepts only the code-owned capabilities `data-space:record:read`, `data-space:record:write`, `data-space:schema:write`, and `data-space:publish`. Adding a future operation requires a reviewed schema/validator/service release; a draft cannot mint a capability string.

The MVP isolates each new Data Space by `environment + tenantId + draftId`. Existing Content Hub blogs continue unchanged. Cross-draft Data Space sharing is not inferred from matching IDs or domains and requires a separately approved owner/share-binding contract.

The completed local Phase 2 service uses one PAY_PER_REQUEST/SSE/PITR table with server-derived keys, conditional transactions, immutable schema/record revisions, and TTL only on 90-day idempotency receipts. Protected reads/actions reuse fresh Auth Admin state and the exact code-owned capabilities above; mutations also require CSRF. Public reads use only explicit published projections and have an exact API Gateway method throttle in the undeployed template. Once records exist, schema evolution preserves every existing field definition so an already-public value cannot survive a later `public -> internal` reclassification. The AWS_IAM snapshot path additionally requires the exact configured trusted Commerce role, an exact revision and field allowlist, and returns a canonical SHA-256 content hash. This is implementation evidence, not deployment evidence: no Data Spaces AWS resource, public route, remote repository, or production data exists yet. Free-text PII/secret detection is defense-in-depth rather than proof; Data Spaces remains operationally prohibited for customer PII or sensitive submissions.

### Commerce

`server/commerce.json` declares the enabled sellable types (`physical`, `service`, `subscription`, and `add_on`), an opaque payment `bindingId`, supported payment operations, inventory/shipping policy, optional manual fiscal-request policy, and same-origin Checkout/legal/support paths. `payments.supportedCurrencies` is required and contains 1-16 unique uppercase ISO-style three-letter codes selected by the draft policy; Commerce validates that allowlist again at runtime and rejects browser input or stored economic records whose currency is outside it. `notificationPolicyIds` remains optional but contains at most one policy ID in this phase because Checkout emits one pinned notification target per operation.

Prices, stock, orders, payment/subscription projections, and fiscal data stay out of Data Spaces. Money uses integer minor units in Commerce implementation. Physical products require enabled inventory and shipping; backorders, multi-warehouse inventory, physical recurring offers, and mixed physical/subscription carts are outside the MVP.

The completed local TASK-027 domain layer keeps sellable, shipping, fiscal-disclosure, and tax-behavior registries closed; requires immutable non-negative integer money and quantities; calculates line totals without floating point; and rejects physical recurring offers. Every money value must also carry the immutable currency allowlist resolved by its owning server-side policy, so a well-formed but unsupported three-letter code fails closed without coupling the core to Stripe or embedding a stale currency registry.

The completed local TASK-028 layer adds immutable catalog items for all four sellable types, exact variants/SKUs, and optional identifier-only references to one pinned Data Spaces record revision and field allowlist. Immutable OfferVersions support one-time or fixed-semantics monthly/yearly recurrence; immutable DiscountVersions support one percentage or positive single-currency fixed amount, closed duration, eligible offers, limit/deadline, and an optional exact customer-facing code. Canonical provider fingerprints cover the full approved economic/restriction snapshot while excluding lifecycle, presentation, identity, and the policy currency allowlist. Lifecycle follows `draft -> provisioning -> active -> existing_only -> retired`; lifecycle and bounded plain-text presentation use independent monotonic revisions. Activation-time Data Spaces snapshots, handlers, authorization, provider calls, and all AWS deployment remain assigned to later tasks.

The completed local TASK-029 layer adds the provider-neutral inventory transaction contract. Tracked stock maintains exact integer on-hand/reserved/available state and conditional revisions; untracked lines create no stock mutation. Reservation aggregates shared stock targets and writes stock, immutable movements, the Catalog reservation/due marker, Operations order, scoped PaymentAttempt binding, and 90-day idempotency receipt atomically. Twenty distinct tracked OfferVersions produce 45 unique actions, below the verified DynamoDB limit. The code-owned storage/abuse ceiling is 1,000,000 units per Checkout line; drafts and provider adapters may enforce lower business limits. The initial Checkout/reconciliation times are exactly `created + 2,100 + 300` seconds from one server timestamp. Commit/release are mutually exclusive, update the order atomically, and require a closed canonical completion reason; ambiguous outcomes hold stock, reconcile the receipt, and never become a release. A still-uncertain due reservation moves its scoped marker forward exactly five minutes rather than relying on a scan or TTL. TASK-030 owns server-derived browser handlers, least IAM, and durable exact-replay receipts for Catalog mutations. Protected and public Catalog lists use opaque HMAC-SHA256 cursors bound to the cursor version, kind, last resource ID, and exact published scope/version; tokens expose neither DynamoDB keys nor tenant/draft IDs, and field or signature changes fail closed. The server-only `COMMERCE_CURSOR_SIGNING_KEY` is a canonical unpadded base64url value of 32-128 characters, must differ between test and production, and is never returned or logged. Missing or malformed key material makes list requests fail with a sanitized `503`; rotating the key intentionally invalidates short-lived outstanding cursors. Deployment wiring remains pending: each environment must inject the key through an approved server-only `NoEcho`/secret-resolution path without placing it in drafts, artifacts, logs, or versioned files. One public request inspects at most two DynamoDB pages and 200 offers. When that budget contains no active offer but more records exist, the response is empty and its cursor advances from the last inspected offer so the caller can continue without an unbounded Lambda loop. TASK-032 owns a sparse `KEYS_ONLY` `ReservationDueIndex` (`duePartition` + `dueKey`), inbox/outbox, operational conflict reread/retry, and a five-minute schedule that stays disabled until TASK-040 wires the canonical status gateway and deployment explicitly enables it. TASK-040 owns that provider-status command and evidence adapter. No Config Registry or domain-table scan is an approved due-work enumeration mechanism.

The completed local TASK-030 through TASK-034 layer adds the eight literal routes and least-privilege Lambda boundaries, fresh Auth Admin/CSRF checks, server-derived and currency-allowlisted Checkout admission, exact-replay catalog receipts, normalized draft/environment-scoped event consumption, deterministic notification outbox records, server-time subscription projections, and isolated due-item reconciliation. Public Checkout recovery uses a distinct internal idempotency namespace and accepts only one canonical unpadded base64url capability representing 32 browser-generated cryptographically random bytes; the raw header is never persisted or logged. The `KEYS_ONLY` due index is treated only as a locator: Commerce strongly rereads and validates each base marker before acting. Runtime workers accept only the template's exact `test -> test` and `prod -> production` mappings, and partial-batch failures use the native SQS message ID or DynamoDB sequence number. The schedule remains disabled until TASK-040 provides canonical provider status. This is local implementation evidence only; no Commerce AWS resource, provider connection, credential, or customer data has been created.

Fiscal collection is opt-in, manual, and isolated. Enabling it requires `adminAccess.mode = auth-profile` and the code-owned `commerce:fiscal:manage` capability; publication and Commerce runtime both reject an enabled fiscal policy without that operator boundary, while fiscal-disabled drafts may keep `adminAccess.mode = none`. In test, a fiscal-enabled Checkout returns a random opaque proof while Commerce stores only its hash in an order-bound `pending_payment` record. The proof has no authority until a verified paid or refund-confirmed event atomically opens the 24-hour request window; terminal unpaid makes it ineligible. An exact Checkout replay before payment conditionally rotates the stored hash and returns a replacement proof, which recovers a lost response without persisting the raw value; that rotation requires the exact high-entropy public Checkout recovery capability described above. Redemption is same-origin, single-use, attempt-bounded, idempotent, and writes customer fiscal fields only to the isolated Fiscal table. Production remains blocked by a code-owned gate until retention/deletion and accountant-access controls are implemented and approved; draft fields and deployment parameters cannot enable it. No PAC integration, CFDI generation, or automatic invoice delivery is part of this contract.

The only Phase 1 fiscal disclosure ID is `manual-invoice-v1`. Commerce administration accepts only the code-owned capabilities `commerce:catalog:read`, `commerce:catalog:write`, `commerce:inventory:write`, `commerce:subscription:manage`, and the Phase 3 addition `commerce:fiscal:manage`. Only the fiscal admin boundary uses the latter; the public fiscal claim flow does not. Declaring `subscription` as a sellable type requires recurring payments to be enabled. These registries are extensible through versioned platform releases, not draft-authored strings.

### Integration Bindings

The Phase 4 contract extends `server/integration-bindings.json` with generic `adminAccess` alongside provider, adapter version, opaque `connectionId`, status, mode, and provider capabilities. The hub and Config Authoring schemas now carry the same reviewed local contract; no protected Integrations browser route or production path becomes active until the later deployment and live gates close. `adminAccess` reuses Commerce's closed shape: `mode` is `none` or `auth-profile`, and the latter carries one `authProfileId` plus only `integration:read` and/or `integration:manage`. Provider capabilities describe adapter operations and never grant human authorization. A referenced Auth Profile must be active and match the descriptor scope, must declare nonempty `allowedGroups` and `adminGroups`, and every admin group must be allowed. The descriptor never contains a provider account ID, credential value, access token, webhook secret, arbitrary endpoint, or secret path.

The first adapter-specific block is Stripe:

```json
{
  "version": 1,
  "scope": {
    "environment": "test",
    "tenantId": "tenant-example",
    "draftId": "draft-example",
    "domain": "example.com"
  },
  "adminAccess": {
    "mode": "auth-profile",
    "authProfileId": "staff",
    "capabilities": ["integration:read", "integration:manage"]
  },
  "bindings": [{
    "id": "stripe-primary",
    "provider": "stripe",
    "adapterVersion": "v1",
    "connectionId": "stripe-primary",
    "status": "active",
    "mode": "test",
    "capabilities": ["connect-onboarding", "checkout", "subscriptions"],
    "stripe": {
      "accountModel": "merchant",
      "chargeType": "direct",
      "feePayer": "connected-account",
      "taxMode": "unconfigured",
      "platformFeeMode": "disabled",
      "webhookIngress": "direct-integrations-api",
      "onboardingRoutes": {
        "returnPath": "/admin/integrations/stripe/return",
        "refreshPath": "/admin/integrations/stripe/refresh"
      }
    }
  }]
}
```

This synthetic example is valid for local/test authoring only when the referenced server-only Auth Profile satisfies the group policy; it is not a production approval. `connect-onboarding` requires `integration:manage` and both route values are bounded same-origin paths, never URLs or origins. A draft-supplied `taxApprovalId` never proves approval: production stays blocked by a server-controlled live gate until the tax decision is recorded outside the draft and checked by the owning service. `platformFeeMode` remains `disabled`. Real Stripe account ownership and webhook account binding are later server-side Integrations checks, not draft fields.

### Notification Policies

`server/notification-policies.json` declares notification types, code-owned template IDs, opaque SMTP connection ID, immutable recipient-set/member IDs, retry limit, and `accepted_by_smtp`. It never contains an email address, SMTP credential, message body, fiscal field, provider payload, or secret reference.

One recipient-set version contains exactly one recipient in the MVP. The actual address is provisioned separately as a secret and is never printed or copied into draft files. Phase 1 supports only `payment-succeeded` -> `payment-succeeded-v1` and `payment-failed` -> `payment-failed-v1`; type/template sets must match exactly. At most 20 unique active SMTP plus recipient secret references may be checked per package. A draft-supplied `transportApprovalId` never opens production; the server-controlled transport live gate remains blocking.

Complete synthetic examples live under [`tools/tests/fixtures/server-features/valid/example.com/server/`](../../tools/tests/fixtures/server-features/valid/example.com/server/).

## Secret Boundary

Real credentials belong only in AWS Secrets Manager. Operational records and descriptors use opaque IDs.

For Phase 1 publication readiness, notification secret names are derived only from these templates after strict lowercase ID validation:

```text
/zoolanding/{environment}/{tenantId}/{draftId}/notifications/smtp/{connectionId}
/zoolanding/{environment}/{tenantId}/{draftId}/notifications/recipients/{recipientSetId}/{recipientSetVersion}/{recipientMemberId}
```

Publication checks may call `DescribeSecret` only; they must never call `GetSecretValue`. Every notification secret requires exact ownership tags:

- `zoolanding:environment`
- `zoolanding:tenant-id`
- `zoolanding:draft-id`
- `zoolanding:secret-purpose`
- `zoolanding:enabled=true`

SMTP secrets additionally require `zoolanding:connection-id`. Recipient secrets require `zoolanding:recipient-set-id`, `zoolanding:recipient-set-version`, and `zoolanding:recipient-member-id`. Missing or mismatched tags, `DeletedDate`, or an enabled tag absent/not exactly `true` must fail closed. Error output must not contain a secret name, ARN, tag set, descriptor value, or provider response.

The connection registry binds each notification secret to the code-owned SMTP2GO adapter and expected sending domain without exposing a provider account identifier to the draft. Before test activation, operators verify the `zoolandingpage.com.mx` test account, its selected plan limits, sender authentication, and recipient policy. Before production activation, operators verify a standalone account owned for that exact draft/domain, a unique credential, the exact verified sender domain, and sender restrictions. The contract does not assume a stable provider account identifier until SMTP2GO documents and the implementation validates one, so account separation is an explicit audited live gate; deterministic secret paths and server-side sender enforcement remain mandatory defense in depth.

## Authorization

Authorization is enforced at the service boundary, never by route visibility or descriptor presence.

- Every protected read and mutation resolves and compares `domain + authProfileId + tenantId + environment` server-side and defaults to deny.
- A protected Data Spaces, Commerce, or Integrations policy must reference an existing active profile in `server/auth-profile-registry.json`; its tenant and optional domain must match the descriptor scope. Missing, inactive, or cross-scope profiles block publication.
- Drafts that include protected user administration reuse Auth Admin HttpOnly sessions. Mutations require CSRF, fresh account state, and an action-scoped capability.
- Data Spaces capabilities approved in the plan are `data-space:record:read`, `data-space:record:write`, `data-space:schema:write`, and `data-space:publish`.
- Integrations `adminAccess` uses `integration:read` and `integration:manage`; its provider capability list is a separate adapter contract and never authorizes a person. Bulk migration execution additionally requires `subscription:migration:execute`, a fresh authorization check, exact dry-run revision matching, and explicit confirmation.
- Public actions use only an allowlisted configured action, server-resolved prices/policies, origin binding, rate/payload limits, and abuse controls. A browser-supplied price, tenant, provider account, table, key, or authorization decision is untrusted.
- Auth is optional at draft level, but only genuinely public operations may run without it. A draft without user management does not gain an implicit administration bypass.

Public runtime bindings may identify only configured data-source/action IDs, safe targets, and the planned kinds `data-space`, `commerce`, and `integrations`; existing `api-proxy` and `auth-admin` kinds remain supported. Runtime bindings are UI wiring, not authorization.

## Approved Route Surface

These are approved target paths for later service phases. They are not evidence that an endpoint is currently deployed.

### Browser-facing exact paths

| Service | Exact path | Exposure |
| --- | --- | --- |
| Data Spaces | `/features/data-spaces/read` | Protected read |
| Data Spaces | `/features/data-spaces/action` | Protected mutation |
| Data Spaces | `/features/data-spaces/public-read` | Sanitized published read |
| Commerce | `/features/commerce/public-read` | Sanitized active catalog read |
| Commerce | `/features/commerce/read` | Protected read |
| Commerce | `/features/commerce/catalog/action` | Protected catalog mutation |
| Commerce | `/features/commerce/inventory/action` | Protected inventory mutation |
| Commerce | `/features/commerce/subscription/action` | Protected subscription mutation |
| Commerce | `/features/commerce/public-action` | Allowlisted public action/Checkout admission |
| Commerce | `/features/commerce/fiscal/request` | Fiscal opt-in request |
| Commerce | `/features/commerce/fiscal/admin` | Protected accountant/operator action |
| Integrations | `/features/integrations/read` | Sanitized protected connection state |
| Integrations | `/features/integrations/action` | Protected generic connection action |
| Integrations | `/features/integrations/stripe/onboarding` | Stripe-only onboarding action with narrower secret IAM |

CloudFront must route only these literal paths, with protected/payment caching disabled. Broad `/features/*` and service-family wildcards are forbidden. Catalog, inventory, and subscription actions are separate Lambda/IAM boundaries; no Lambda dispatches among them from a request-body operation.

### Internal AWS IAM paths

Data Spaces exposes only `/internal/v1/data-spaces/record-snapshot` for an allowlisted immutable record snapshot. The approved Integrations command paths are:

- `POST /internal/v1/stripe/offer`
- `POST /internal/v1/stripe/product-presentation`
- `POST /internal/v1/stripe/discount`
- `POST /internal/v1/stripe/discount-lifecycle`
- `POST /internal/v1/stripe/checkout`
- `GET /internal/v1/stripe/checkout-status`
- `POST /internal/v1/stripe/subscription/change`
- `POST /internal/v1/stripe/subscription/discount`
- `POST /internal/v1/stripe/subscription/pause`
- `POST /internal/v1/stripe/customer-portal`
- `POST /internal/v1/stripe/migrations/preview`
- `POST /internal/v1/stripe/migrations/execute`
- `POST /internal/v1/stripe/migrations/control`
- `GET /internal/v1/stripe/migrations/status`
- `POST /internal/v1/integrations/connection-register`
- `POST /internal/v1/integrations/connection-resolve`

No wildcard internal Commerce API is planned. Notifications has no API Gateway route; it consumes its queue and calls only the exact connection-resolve path.

The four migration paths remain present as closed contract boundaries during Phase 4, but they return a sanitized fail-closed response and perform no Stripe call or provider/job mutation until the Phase 5 migration engine is implemented.

### Stripe webhook ingress

`/webhooks/stripe/connect` is a direct Integrations API Gateway path. It must not traverse draft domains or the frontend CloudFront distribution. The handler verifies the signature over unmodified bytes and configured timestamp tolerance before using the signed account ID. One immutable, non-authorizing sentinel keyed by `environment + mode + hash(accountId)` routes to the exact scoped connection; the handler then revalidates environment, tenant, draft, connection, account, and `livemode`. A second immutable global replay sentinel keyed by `environment + provider + eventId` binds the scoped reference, account hash, mode, and payload hash so the SEC-006B matrix is enforceable across drafts. Supported events atomically store only allowlisted receipt metadata, payload hash, and ingress outbox. The full Stripe payload is never persisted. A valid signed but unsupported event is acknowledged safely without provider-state mutation or ingress work.

## Data Flow

1. A draft package is validated locally and again by Config Authoring before any S3 write. Test and production publication are blocking; invalid packages cannot move the published pointer.
2. Each service resolves its own descriptor from the Config Registry pointer for `environment + draft`, then loads the exact immutable object under that published version. Cache keys include `environment + draft + versionId`; missing or mismatched policy fails closed.
3. The browser calls only exact same-origin feature routes. Protected handlers revalidate session, CSRF when mutating, fresh account state, scope, and capability.
4. Commerce may obtain an immutable Data Spaces snapshot through the exact AWS IAM route, then owns the resulting commercial state. Checkout never performs a live generic-data join.
5. Commerce reserves stock and creates its internal order before sending an idempotent Checkout command to Integrations. Browser success/cancel routes never prove payment.
6. Stripe sends signed events directly to Integrations. The receipt keeps only allowlisted metadata and a payload hash; the worker re-fetches the event and canonical object as the exact connected account. Integrations owns the canonical provider snapshot and publishes only the four existing Commerce consumer contracts through its outbox and SNS topic; Commerce consumes through its own SQS queue/inbox.
7. Commerce publishes `notification.requested.v1` only after a confirmed state change. Notifications reloads the policy from that event's exact `publishedVersionId`, rechecks current secret lifecycle tags, resolves the connection through AWS IAM, enforces the bound draft/domain sender policy, and attempts SMTP over TLS through the code-owned SMTP2GO endpoint.
8. A payment or notification never publishes, unpublishes, suspends, or deletes a draft.

## Event Contract

Detailed per-event JSON Schemas belong to the owning service phases and are not yet implemented. The approved envelope constraints are fixed:

- every state-changing operation carries `requestId`, `correlationId`, `environment`, `draftId`, `tenantId`, an actor hash when authenticated, and an idempotency key;
- asynchronous events are versioned, at-least-once safe, idempotent, and draft/environment scoped;
- events contain no secret, raw PII, email address, fiscal field, signed URL, provider-hosted URL, or raw Stripe object;
- provider IDs alone never authorize or partition a lookup.

The first confirmed consumer event is `notification.requested.v1`. Its contract includes opaque IDs, notification type, exact `publishedVersionId`, code-owned `templateId`, `recipientSetId`, immutable `recipientSetVersion`, one opaque `recipientMemberId`, bounded typed variables, source reference, environment/draft/tenant, and a dedupe key. It excludes addresses and message bodies.

Phase 4 emits exactly the four already implemented Commerce consumer contracts: `commerce.payment.succeeded.v1`, `commerce.payment.terminal_unpaid.v1`, `commerce.refund.confirmed.v1`, and `commerce.subscription.updated.v1`. It does not create unconsumed generic `payment.*`, `checkout.*`, `refund.*`, `subscription.*`, or `account.*` families. The migration result events already approved by name are `migration.preview_ready.v1`, `migration.progressed.v1`, `migration.item_needs_review.v1`, and `migration.completed.v1`; they remain fail-closed and un-emitted until the Phase 5 engine implements their exact payload schemas.

The implemented `commerce.subscription.updated.v1` payload carries a positive provider-neutral `sourceRevision`. Commerce orders projection changes by that monotonic revision rather than timestamp precision: a greater revision applies even when two legitimate changes share one `occurredAt` second, a lower revision is recorded as stale without replacing current state, an equal revision with a different event conflicts, and replay of the same `eventId` returns its durable inbox result.

## Error Contracts

Protected service APIs reuse `zlp-protected-feature-error-v1`:

```json
{
  "error": {
    "code": "forbidden",
    "message": "You do not have access to this resource.",
    "requestId": "request-example",
    "retryable": false
  }
}
```

The established safe codes are `auth_required`, `forbidden`, `tenant_mismatch`, `environment_mismatch`, `group_mismatch`, `validation_error`, `not_found`, `conflict`, `rate_limited`, `upstream_unavailable`, and `internal_error`. Service-specific additions require a versioned owning-service contract; raw exceptions and provider responses are never returned.

The Phase 1 readiness command returns a separate redacted report envelope with `ok`, `mode`, `domain`, `environment`, `fileCount`, `featureFileCount`, `blockingCount`, `warningCount`, and `findings`. Each finding exposes only `code`, `severity`, optional safe `server/<filename>`, and JSON pointer. Blocking codes currently include:

- structural/safety: `duplicate_path`, `invalid_server_descriptor_path`, `unknown_server_descriptor`, `non_json_value_forbidden`, `secret_value_forbidden`, `pii_value_forbidden`, `provider_resource_id_forbidden`, `descriptor_too_large`, and `schema_*`;
- scope/relationship: `domain_mismatch`, `environment_mismatch`, `tenant_scope_mismatch`, `draft_scope_mismatch`, `duplicate_id`, `binding_not_found`, `binding_inactive`, `binding_mode_mismatch`, `notification_binding_not_found`, `notification_policy_not_found`, `auth_profile_registry_required`, `auth_profile_not_found`, `auth_profile_inactive`, `auth_profile_scope_mismatch`, `stripe_settings_required`, and `stripe_settings_not_allowed`;
- code-owned contracts: `provider_not_supported`, `adapter_version_not_supported`, `provider_capability_not_supported`, `data_space_capability_not_supported`, `commerce_capability_not_supported`, `unknown_fiscal_disclosure`, `notification_type_not_supported`, `notification_template_not_supported`, `notification_template_mismatch`, and `notification_secret_limit_exceeded`;
- feature combinations: `physical_inventory_required`, `physical_shipping_required`, `subscription_payments_required`, `commerce_provider_capability_required`, `fiscal_admin_access_required`, and `notification_send_capability_required`;
- production gates: `live_binding_required`, `tax_configuration_unapproved`, `stripe_tax_live_gate_pending`, `platform_fee_not_supported`, `fiscal_approval_required`, `fiscal_live_gate_pending`, `notification_transport_approval_required`, and `notification_transport_live_gate_pending`;
- controlled fallback: `readiness_internal_error`.

`dev` reports findings but does not upload. Invalid `test` or `production` readiness exits nonzero. In Phase 1, an account mismatch means only an environment/mode/opaque `connectionId` mismatch; real provider-account ownership remains a server-side Integrations responsibility.

## Reliability And Idempotency

- Local state changes and their outbox record are written atomically; only an outbox relay publishes.
- Consumers maintain idempotent inbox/receipt records and tolerate duplicate and out-of-order delivery according to their owning event contract.
- The Stripe webhook replay key includes event ID, account, mode, and payload hash. An identical duplicate returns `2xx` and resumes incomplete work; a changed account, mode, or hash is rejected and alerted.
- Business records remain partitioned by environment + tenant + draft. PAT-003 permits only the immutable non-authorizing hashed account-routing sentinel and global replay sentinel described above; neither contains a raw provider account ID or grants access, and every route result is revalidated against the full scoped binding.
- Webhook receipts and technical idempotency records expire after 90 days unless an incident hold applies. Business/financial records do not inherit that TTL.
- Unknown provider outcomes are reconciled before stock release or a new provider mutation. They are not treated as confirmed failures.
- SMTP cannot provide exactly-once delivery. A crash after SMTP accepts but before ledger commit can produce a duplicate retry; status stops at `accepted_by_smtp`, never guaranteed inbox delivery.
- Notifications writes `prepared` and `sending` ledger states before the SMTP attempt. A confirmed SMTP `4xx` may retry and a confirmed `5xx` fails permanently; a timeout, connection loss, stale `sending` lease, or crash with no explicit rejection becomes `uncertain` and must not trigger a blind resend. An operator must manually investigate the matching SMTP2GO dashboard activity and record the decision before authorizing another attempt.
- Automated SMTP2GO API/webhook ingestion is not part of the MVP. The delivery ledger records acceptance only from the bounded SMTP result; the provider dashboard is manual supporting evidence for an ambiguous attempt and later delivery, bounce, or complaint investigation. Any automated event reconciliation requires a separately approved event-ingress contract. This does not add a Zoolandingpage administration UI.

## Observability

Logs and audit records contain only sanitized IDs, decision codes, correlation/request IDs, actor hashes, and aggregate counters. They exclude request bodies, raw provider errors, connection-resolution responses, emails (including masked forms), fiscal fields, tokens, secret metadata, and signed/provider-hosted URLs.

Each service must expose redacted latency, error, throttling, DLQ depth, oldest-message age, and domain-specific failure metrics. The approved alarms cover 5xx, webhook age/signature failures, queue/DLQ age, stale reservations, migration backlog/failures, SMTP circuit state, and test/live mismatch. SNS is limited to intended event fan-out and operator alarms.

## Validation And Tests

Phase 1 uses the dependency-free validator and the same synthetic corpus for every validator implementation. Unsupported JSON Schema keywords, excessive schema/instance depth, oversized descriptors, and excessive findings fail safely.

Current local checks:

```powershell
node --test tools/tests/draft-feature-readiness.spec.mjs
npm run test:draft-public-artifact-boundary
```

The readiness tests cover valid optional/complete descriptor sets, closed schemas, unknown properties, duplicate IDs, secrets/PII/provider-resource IDs including legacy server descriptors, valid opaque SSM and Secrets Manager references, code-owned capabilities/templates/disclosures, Auth Profile existence/scope, secret-reference limits, missing bindings, invalid feature combinations, domain/environment mismatch, test/live separation, stricter production requirements, exact packaging kinds, OIDC-free pre-deploy validation, and template-schema parity. The artifact test verifies the exact public projection and inspects generated browser plus SSR staging trees without printing private paths.

Later phases must add service unit/contract tests for generic Integrations `adminAccess`, separation from provider capabilities, cross-draft and wrong-environment denial, Accounts v2 blocked without Mexico Sandbox proof, Accounts v1/OAuth fallback, immutable hashed account routing, global Stripe webhook signature/replay handling, absence of full provider payloads, exact four-event emission, safe unsupported-event acknowledgement, provider timeout/idempotency, `pause_collection` without a false paused-subscription status, fail-closed Phase 4 migration routes, inventory contention and reservation reconciliation, Phase 5 migration interruption/resume, SMTP duplicate/revocation/TLS, SMTP2GO endpoint/port allowlisting, production account/credential reuse denial, test sender-domain restrictions, failure injection at every cross-service boundary, load tests, and desktop/mobile browser QA for every affected pilot route.

## Deployment And Rollback

- `dev` is local/CI only. It must not create an AWS stack, bucket, table, queue, function, API, distribution, parameter, role, environment, or deploy workflow.
- Local work may explicitly call deployed test services when no local substitute exists; `config-draft-sync` requires an explicit environment, maps an explicit remote dev read to test, rejects every dev mutation before an HTTP request, and verifies the returned domain/environment/stage before any local clean or write.
- Pull requests follow `dev -> test -> main`. Draft test and production validation runs in a job without OIDC; only a dependent deploy job checking out the exact validated commit receives `id-token: write`. SSR build and artifact validation likewise run without OIDC; only a dependent publication job that downloads and rechecks the validated artifact receives `id-token: write`.
- Test and production use separate stacks, tables, queues, secrets, webhook endpoints, Stripe modes, recipient policies, and idempotency namespaces.
- Test notification delivery uses only the SMTP2GO account for `zoolandingpage.com.mx`; each test draft has a unique SMTP user/credential and connection/rate namespace, and production never resolves any test account or credential. Each production draft/canonical sending domain has its own standalone SMTP2GO account and secret. If the live test account cannot issue the distinct credentials documented for the selected plan, activation fails closed and the plan is repriced rather than weakening isolation.
- Runtime Read deployment separates the exact repository/Environment/branch OIDC caller from its retained CloudFormation service role. The caller can pass only that role; the service role owns the bounded Lambda/API update surface and exact SAM transform access, and may attach only the code-owned execution boundary. CloudFormation persists the stack `RoleARN`; steady state has no `iam:DeleteRolePermissionsBoundary`, and retired callers retain no trust `Allow` during their rollback window.
- Frontend builds copy only the exact public draft JSON shapes and approved media extensions. Recursive `drafts/**` copying, encoded or traversal-shaped path segments, private/local folders, repository metadata, `draft-repo.config.json`, and every `server/` descriptor are forbidden; packaging must run the artifact boundary guard before AWS credentials or upload.
- Feature enablement is per draft and default-off. Test pilots begin with `zoositioweb.com.mx` and `sulandingpage.com.mx`; production remains off until test evidence is accepted.
- Reverting the Config Registry published pointer reactivates a previously validated immutable descriptor package. Service rollback also requires stopping new admission, reconciling in-flight provider work, inspecting/redriving queues, and restoring the previous service artifact.
- Phase 4 is local-only. Live connected accounts, webhook endpoints, secrets, stacks, routes, queues, tables, and all other AWS/provider resources remain Phase 8 deployment work requiring explicit authorization.

No workflow, route, stack, secret, connected account, or pilot descriptor becomes active merely because it is described here.

## Deferred Live Gates

The following remain blocking and must not be inferred from placeholder or test data:

1. Final incident closure for the formerly exposed live draft artifacts. Sanitized releases are active, current private-path probes return `404`, the current test/production release-prefix inventory contains no forbidden draft objects, and 44 desktop/mobile browser views passed without blocking responses, runtime failures, console errors, or overflow. Historical S3/CloudFront access logging was not enabled, so prior access cannot be reconstructed from those sources; keep the gate open until an explicit residual-risk/credential decision is recorded.
2. Accountant/legal approval for fiscal fields, retention, access, request window, and the manual CFDI operating procedure. Until then, production fiscal capture is disabled.
3. Confirmed Stripe account topology for each merchant binding, deploy-time official SDK/API revalidation, Accounts v2 Mexico Sandbox proof or the approved Accounts v1/OAuth fallback, live tax responsibility/registration proof, webhook endpoint setup, and explicit test evidence. Platform commission remains disabled; optional application fees are future work.
4. SMTP2GO test-account plan/limit verification, `zoolandingpage.com.mx` sender authentication, test recipient restrictions, and acceptance/delivery evidence; plus a separately verified standalone SMTP2GO account, unique credential, canonical sender domain, quota, and DNS authentication for every production draft. Until those checks pass, no real production SMTP secret or delivery is enabled.
5. Implemented and audited owning-service repositories, least-privilege IAM, exact infrastructure routes, alarms, smoke evidence, and explicit deployment authorization.
6. Clean pilot draft preflight plus validated test configuration. No payment result automates draft publication or suspension.

## Explicit MVP Limits

The MVP does not add a central Zoolanding administration UI, migrate existing Content Hub blogs, store restricted PII in Data Spaces, store customer contact/shipping data in Commerce, enable automatic CFDI/PAC work, use SES, read mail over IMAP, provide a mailbox UI, send newsletters, integrate carriers, support backorders/multiple warehouses, accept delayed methods for tracked stock, stack coupons, calculate a platform fee, expose a true paused-subscription operation without current official GA proof, or introduce Kafka, a general event bus, Step Functions, containers, distributed locks, two-phase commit, event sourcing, or WAF. The supported operator billing pause is Stripe `pause_collection` (pausa de cobranza), whose subscription status remains active; Commerce owns the separate access decision. The new `protected-features` runtime kinds remain a schema-level future extension until their package kind, authoring persistence, runtime resolver, and owning service are implemented and tested end-to-end.

Add any of these only through a separately approved contract with cost, security, retention, authorization, failure, and rollout analysis.
