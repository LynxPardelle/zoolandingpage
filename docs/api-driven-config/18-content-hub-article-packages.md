# Content Hub Article Packages

This document defines the first contract layer for draft-owned blogs and future content hubs.

The goal is to let drafts build highly customizable blog authoring and public blog experiences with generic components while keeping the storage, publishing, SEO, authorization, and safety contracts reusable for future features such as newsletters, ecommerce content, product updates, and analytics dashboards.

## Scope

This contract covers:

- Public content hub runtime references in `site-config.json.runtime.contentHubs`.
- Draft-like article package manifests stored as file bundles.
- Published article bundles for SSR/runtime reads.
- Server-only hub policy.
- Shared taxonomy records and per-draft overrides.
- Publish validation reports.

This contract does not implement runtime fetching, article route matching, editor UI, Lambda storage, or AWS infrastructure by itself.

## Public vs Server-Only Boundary

Public draft/runtime payloads may include:

- public hub IDs
- owner draft domain
- public route paths and route patterns
- locale list
- canonical behavior
- runtime data source IDs
- public API base path IDs
- public article metadata
- public asset URLs that are not signed URLs
- SEO, structured data, and analytics context with no PII
- published component/variable/i18n payloads

Server-only policy must keep:

- tenant IDs when they authorize or bill a customer
- DynamoDB table names and S3 bucket names
- Lambda ARNs, API authorizer policy, IAM details
- Cognito pool IDs, client policy, groups-to-roles authority
- credential refs, secret refs, tokens, client secrets, private keys
- locks, unpublished draft pointers, moderation internals, raw form/comment payloads
- sanitizer allowlists that would help bypass filtering

Server-only storage policy is capability-scoped from phase 2 onward. The private schema uses `tablesByCapability`, `bucketsByCapability`, and `prefixes` instead of one broad metadata table/bucket pair so future IAM policies can keep content authoring, runtime reads, media, interactions/moderation, and analytics separate.

Browser requests for blog features should send only public IDs and allowlisted form fields. Authorization must be enforced by the backend.

## Public Runtime Config

`site-config.json.runtime.contentHubs` is a browser-safe list of hub references.

Each entry identifies the hub and how the current draft renders it:

- `hubId`
- `ownerDraftDomain`
- `source`: `primary` or `authorized`
- `routeBasePath`
- `listPath`
- `articlePathPattern`
- `defaultLocale`
- `locales`
- `canonicalMode`
- optional `runtimeSourceId`
- optional `publicApiBasePath`
- optional `analyticsContext`
- optional `publicArticles`
- optional `publicTaxonomy`

The schema is `docs/api-driven-config/schemas/content-hub-public.schema.json`. The site config schema also exposes the same public shape through `contentHubRuntime`.

`publicArticles` is intentionally small and public. It may carry only published article IDs, locale, title, summary, same-origin path, category slug, tags, published/updated timestamps, author display label, canonical path, and robots. `publicTaxonomy` may carry visible category/tag IDs, slug, label, locale, and an optional same-origin path. SSR can use these fields for sitemap, RSS/Atom-compatible feeds, basic public search, and article `BlogPosting` metadata while the dynamic runtime-read/DynamoDB content endpoints are still being connected.

Do not put full article packages, revision files, comments/forms, moderation state, locks, storage names, auth policy, signed URLs, credential refs, or unpublished content in those public index arrays.

## Angular Runtime Service Contracts

Drafts wire content hub data into generic components through the existing runtime surfaces:

- `site-config.json.runtime.dataSources[]`
- `site-config.json.runtime.apiActions[]`

Content hub entries use `kind: "content-hub"` plus a browser-safe `contentHub` binding. Angular keeps the generic data-source/action orchestration, but protected content-hub requests use the same-origin `ContentHubClientService` instead of the public API proxy client. That client sends cookies with `credentials: "include"`, includes public draft/hub context headers, and adds CSRF to mutations.

Supported read bindings:

- `articleList`
- `articleDetail`
- `taxonomyList`
- `moderationQueue`
- `assetList`
- `revisionList`
- `publicBundlePreview`

Supported action bindings:

- `createArticle`
- `updatePackage`
- `uploadAsset`
- `validate`
- `submitReview`
- `publish`
- `schedule`
- `moderateComment`
- `restoreRevision`

The public request envelope is intentionally narrow. It may include `domain`, `pageId`, a public source/action ID, `contentHub.hubId`, public article/taxonomy/asset/comment/schedule identifiers, language/revision identifiers, and explicitly allowlisted safe input fields. It must not include server-only policy, table names, bucket names, upstream URLs, credential refs, tokens, tenant IDs, authorizer policy, group-to-role mapping, signed URL policy, or authorization decisions.

## Article Package Manifests

Article content is stored as a draft-like package, not as one large DynamoDB document.

The manifest describes the article and points to package files:

- hub/article ownership
- publication status and visibility
- language entries and slugs
- taxonomy references
- SEO policy
- public media metadata
- comment and interaction policy
- sanitizer/content-safety policy ID
- analytics context
- immutable revision pointers

The schema is `docs/api-driven-config/schemas/content-hub-article-package.schema.json`.

Article body files should use the same mental model as draft payloads:

- component trees in JSON
- variables in JSON
- i18n dictionaries in JSON
- media manifest references
- revision snapshots and deltas as separate files

## Published Bundles For SSR

Published bundles are the public runtime output used by SSR and browser hydration.

A published bundle may include:

- effective article path
- effective SEO metadata
- JSON-LD entries
- public generic component tree
- public variables
- public i18n dictionary
- analytics context
- immutable published revision identity

A published bundle must not include:

- server-only hub policy
- unpublished draft content
- editor locks
- moderation queue internals
- signed URLs
- raw comments, raw forms, or PII
- tokens or credential refs
- executable scripts or event-handler attributes

The schema is `docs/api-driven-config/schemas/content-hub-published-bundle.schema.json`.

## S3 Layout

Use deterministic prefixes by environment, hub, article, language, and revision.

Recommended initial layout:

```text
content-hubs/{environment}/{hubId}/
  hub-manifest.json
  taxonomy/taxonomy.json
  taxonomy/overrides/{draftDomain}.json
  articles/{articleId}/manifest.json
  articles/{articleId}/lang/{locale}/revisions/{revisionId}/package.json
  articles/{articleId}/lang/{locale}/revisions/{revisionId}/components.json
  articles/{articleId}/lang/{locale}/revisions/{revisionId}/variables.json
  articles/{articleId}/lang/{locale}/revisions/{revisionId}/i18n/{locale}.json
  articles/{articleId}/lang/{locale}/revisions/{revisionId}/snapshot.json
  articles/{articleId}/lang/{locale}/revisions/{revisionId}/delta.json
  articles/{articleId}/lang/{locale}/revisions/{revisionId}/validation-report.json
  published/{renderDomain}/{locale}/{articleId}/{revisionId}/bundle.json
  published/{renderDomain}/{locale}/{articleId}/sitemap-entry.json
  published/{renderDomain}/{locale}/sitemap.xml
  published/{renderDomain}/{locale}/feeds/feed.json
  published/{renderDomain}/{locale}/feeds/feed.xml
  assets/{assetId}/manifest.json
  assets/{assetId}/original/{fileName}
  assets/{assetId}/variants/{variantId}/{fileName}
```

For shared hubs, the owner hub keeps canonical package files. Authorized drafts may store overrides for labels, visibility, SEO variants, route binding, and draft-specific presentation rules.

## DynamoDB Item Families

DynamoDB should store metadata, indexes, policy state, and moderation state. Large article config belongs in S3.

Required item families:

- `HUB`: hub metadata and owner draft.
- `ARTICLE`: article-level metadata.
- `ARTICLE_LANG`: language-specific status, slug, title, and published revision.
- `SLUG`: unique slug lookup by hub, locale, draft/render domain, and route.
- `TAXONOMY`: shared category/tag records.
- `TAXONOMY_OVERRIDE`: per-draft visibility and label overrides.
- `REVISION`: snapshot/delta pointers and reconstruction metadata.
- `LOCK`: editor locks.
- `SCHEDULE`: publish/unpublish/reschedule jobs tied to immutable revisions.
- `MODERATION`: comments/forms/interactions moderation queue state.
- `ASSET`: media metadata and usage references.
- `INTERACTION`: aggregate public interaction state and moderation/spam decisions.
- `HUB_CONNECTION`: authorized draft-to-hub sharing relationships.

## Taxonomy Behavior

Categories and tags live at the hub level.

Each taxonomy record has:

- stable ID
- kind: `category` or `tag`
- canonical slug
- creator draft domain
- default locale
- translated labels
- default visibility
- per-draft overrides

Authorized drafts may:

- hide a category/tag
- relabel it by locale
- use it in listing filters
- decide whether tag-combination URLs are indexable

Recommended SEO default:

- Category listing routes can be indexable when curated.
- Single-tag routes may be indexable when useful.
- Multi-tag query combinations should default to `noindex,follow` unless the draft explicitly promotes them.

The schema is `docs/api-driven-config/schemas/content-hub-taxonomy.schema.json`.

## Multilingual Slug Rules

Each article language entry owns its slug and status.

Rules:

- Slugs must be stable and URL-safe.
- Published languages only should produce `hreflang` links.
- Missing language variants should not produce fake alternate URLs.
- Canonical URLs are render-domain aware through `canonicalMode`.
- Changing a published slug must create a redirect record.
- A scheduled publish must point to a validated immutable revision.

For shared hubs:

- The owner draft keeps canonical article identity.
- Each authorized draft can render a host-adaptive canonical when intentionally sharing SEO value.
- Drafts that should not compete for SEO can use `noindex-shared`.

## Scheduling And Revisions

Scheduling is part of the contract from the start.

A schedule record must bind:

- hub ID
- article ID
- language
- immutable revision ID
- target environment
- publish or unpublish action
- scheduled time and timezone
- validation report pointer

Revision storage should use snapshots plus deltas:

- Keep periodic snapshots for recovery.
- Store deltas between revisions to reduce storage.
- Validate reconstruction before publish.
- Published bundles point to immutable revision IDs.
- Restore operations require server-side permission checks.

## Media

Initial blog media is public. Future protected/private media can extend the same model but must not be enabled by accident.

Public media manifests should include:

- asset ID
- kind
- public URL
- MIME type
- size
- dimensions when relevant
- alt/title/caption/credit/license metadata
- focal point when relevant
- usage references
- checksum or package pointer where available

Public bundles must not use signed URLs. Upload authorization and lifecycle policy are server-only.

## Comments, Reactions, CTAs, And Forms

Comments require authenticated users by product decision. Draft defaults and per-article overrides decide whether comments are off or queued for moderation.

Likes, reactions, CTAs, and forms may be public, but they need spam protection:

- rate limit
- dedupe key
- honeypot or challenge policy
- optional CAPTCHA by draft
- moderation queue for suspicious payloads
- no raw comment/form text in analytics

Interaction analytics should use article IDs, route IDs, content groups, and event names. Do not send emails, names, comment text, form bodies, or auth identifiers to analytics events.

When using the existing raw analytics sink, blog events must preserve the existing `appName` and `timestamp` envelope fields. Blog-specific values should stay in allowlisted metadata such as hub ID, article ID, language, route path, component ID, taxonomy ID, or asset ID.

## Sanitizer Policy

Sanitizer behavior is configurable by draft, role, and article policy.

Levels:

- `strict`: safest blocks only.
- `balanced`: basic formatting and safe media.
- `advanced`: trusted component-rich editing with reviewed allowlists.
- `trusted`: advanced authors only; still no raw scripts, event handlers, signed URLs, or credential-bearing embeds.

Frontend controls are UX helpers only. Publish validation and backend sanitization must enforce the final rule.

## Roles

Blog roles should exist from MVP:

- `hub-admin`
- `blog-admin`
- `blog-editor`
- `blog-publisher`
- `blog-reviewer`
- `blog-moderator`
- `blog-media-manager`
- `blog-analyst`

Browser route groups and visible controls are not authorization. Backend policy maps auth groups to roles and roles to action-scoped permissions.

The local content-hub contract harness must keep these product roles present in `rolePolicies`, with non-empty auth groups that match the draft auth profile and explicit three-part permissions such as `blog:article:read`, `blog:article:update`, `blog:article:publish`, `blog:taxonomy:read`, `blog:media:read`, `blog:media:manage`, `blog:moderation:read`, `blog:moderation:moderate`, or `blog:analytics:read`. Wildcard grants such as `blog:article:*` are invalid even for admin roles.

## Schemas

- `schemas/content-hub-public.schema.json`
- `schemas/content-hub-article-package.schema.json`
- `schemas/content-hub-published-bundle.schema.json`
- `schemas/content-hub-server-policy.schema.json`
- `schemas/content-hub-taxonomy.schema.json`
- `schemas/content-hub-publish-validation.schema.json`

Focused schema tests live in `tools/tests/content-hub-schema.spec.mjs`.

## Local Contract Harness

The backend boundary is checked locally before any AWS writes exist.

Run:

```powershell
node --test tools/tests/content-hub-contract-harness.spec.mjs
node tools/content-hub-contract-harness.mjs
```

The harness defines the first vertical-slice contract for:

- repository ownership decisions
- required DynamoDB item families
- deterministic S3 prefixes
- IAM least-privilege boundaries
- sanitized blog analytics events compatible with the existing `appName` and `timestamp` raw-sink envelope
- unsafe ID/domain/path rejection

The detailed phase decision record lives in `.superpowers/blog-content-hub/evidence/repo-boundary-decision.md`.

## Current Known Gap

Draft runtime route resolution supports `:param` path patterns for route-to-page matching, including SEO-friendly article patterns such as `/blog/:categorySlug/:articleSlug`.
Captured params are available as first-class runtime data-source inputs through `{ "source": "routeParam", "key": "id" }`, so detail pages can hydrate article metadata without duplicating IDs in query strings.
Until the published-bundle lookup is connected to the runtime-read backend, an unknown article slug can still resolve to the configured article page shell instead of returning a content-aware 404.
