# Project Architecture

This document explains how the Zoolanding platform is split across the Angular frontend, the config APIs, the public asset upload flow, and the analytics services.

## Platform overview

Zoolandingpage is a config-driven Angular application.

The same landing page can exist in three forms:

1. `Local draft files` in the repo under `public/assets/drafts/{domain}/...`.
2. `Authoring draft state` stored by the config authoring API.
3. `Published runtime state` returned by the runtime API for live traffic.

The frontend renders the same internal component model in both local and production modes. What changes is the source of the payloads.

## Repository boundaries

### Main frontend repo

`zoolandingpage` owns:

- Angular rendering and SSR shell.
- Local draft preview and QA.
- Runtime payload validation and store/bootstrap flow.
- Frontend analytics and quick-stats integration.
- The draft round-trip CLI in `tools/config-draft-sync.mjs`.

### Related config platform repos

- `zoolanding-config-authoring`: create, pull, update, and publish draft packages.
- `zoolanding-config-runtime-read`: resolve `domain + path + lang` into one runtime bundle.
- `zoolanding-image-upload`: issue presigned upload URLs for public assets.

### Related analytics repos

- `zoolanding-data-dropper-lambda`: store raw analytics events in S3.
- `zoolanding-quick-stats-lambda`: update per-app counters and small stats documents.

## Request flows

### Local draft flow

```text
Browser URL
  -> draftDomain + draftPageId
  -> DraftRuntimeService
  -> local files in public/assets/drafts/{domain}/...
  -> ConfigBootstrapService
  -> ConfigStoreService
  -> RuntimeService
  -> ConfigurationsOrchestratorService
  -> WrapperOrchestrator
```

### Production runtime flow

```text
Live request
  -> frontend app
  -> runtime API request for one TRuntimeBundlePayload
  -> ConfigBootstrapService adapts bundle to store/bootstrap model
  -> RuntimeService applies roots and component registry
  -> WrapperOrchestrator renders the page
```

### Authoring flow

```text
Local draft files
  -> tools/config-draft-sync.mjs
  -> config authoring API
  -> draft stored in authoring platform
  -> publish action
  -> runtime bundle becomes available to live domains
```

### Public asset flow

```text
Author requests presign
  -> image-upload API
  -> presigned PUT URL + final publicUrl
  -> browser or tool uploads file to S3
  -> draft JSON references returned publicUrl
```

## Angular runtime layers

### Source selection

- `ConfigSourceService`: decides whether the app reads local drafts or API-backed config.
- `DraftRuntimeService`: resolves active draft identity in local mode.

### Loading and validation

- `ConfigBootstrapService`: loads payloads, validates structure, applies i18n and SEO metadata, and fills the store.
- `ConfigStoreService`: holds the active payloads and bootstrap state.

### Rendering

- `RuntimeService`: connects loaded payloads to the shell and the orchestrator.
- `ConfigurationsOrchestratorService`: stores the active component tree keyed by `id`.
- `WrapperOrchestrator`: renders the configured root IDs and resolves DSL-driven values, events, conditions, and loops.

### Cross-cutting frontend services

- `SeoMetadataService`: applies title, description, Open Graph, Twitter, canonical, and locale metadata.
- `AnalyticsService`: sends analytics events, manages consent, and integrates with backend analytics services.
- `QuickStatsService`: talks to the quick-stats API when enabled by runtime config.
- `AngoraCombosService`: applies authored combo bundles from payloads.

## Config ownership model

The runtime now assumes clear ownership boundaries between payload files.

### Domain-owned files

- `site-config.json`
- domain-root `components.json`
- domain-root `variables.json`
- domain-root `angora-combos.json`
- domain-root `i18n/{lang}.json`

These files define shared site metadata, routing, runtime defaults, shared components, shared variables, shared combos, and shared translations.

### Page-owned files

- `{pageId}/page-config.json`
- `{pageId}/components.json`
- `{pageId}/variables.json`
- `{pageId}/angora-combos.json`
- `{pageId}/i18n/{lang}.json`

These files define page roots, page SEO and analytics, page-specific component overrides, and page-specific variable/combo/i18n overrides.

### Merge rules

- Shared components load first; page components win on `id` collision.
- Shared variables, combos, and i18n dictionaries load first; page values win on collision.
- `site-config.json` defines domain-level routing and defaults; `page-config.json` defines render roots and page-specific metadata.

## Draft filesystem layout

```text
public/assets/drafts/
  {domain}/
    site-config.json
    components.json
    variables.json
    angora-combos.json
    i18n/{lang}.json
    {pageId}/
      page-config.json
      components.json
      variables.json
      angora-combos.json
      i18n/{lang}.json
  _debug/
    debug-workspace/
      page-config.json
      components.json
```

The local filesystem layout is still the authoring source of truth for developer and AI-assisted editing.

## Transport contracts

### Authoring contract

The authoring API works with `TAuthoringDraftPackage`, a file-oriented payload that mirrors the draft filesystem layout.

That contract is used for:

- create
- pull
- push/update
- publish

### Runtime contract

The runtime API returns `TRuntimeBundlePayload`, one effective bundle for the requested domain, route, and language.

That bundle contains:

- `siteConfig`
- `pageConfig`
- merged `components`
- optional merged `variables`
- optional merged `angoraCombos`
- optional merged `i18n`
- lifecycle metadata and version information

## Analytics and stats integration

The frontend talks to two separate backend services for behavioral data:

### Data Dropper

- Endpoint path: `/analytics`
- Purpose: store raw analytics events as submitted.
- Storage pattern: `s3://zoolanding-data-raw/{appName}/YYYY/MM/DD/{timestamp}-{id}.json`

### Quick Stats

- Endpoint path: `/quick-stats`
- Purpose: apply compact stat operations such as `inc`, `set`, `merge`, `append`, and `delete`.
- Storage pattern: `s3://zoolanding-quick-stats/{appName}/stats.json`

Those services are related to runtime analytics behavior but are not part of the config authoring or runtime bundle transport.

## Public assets and uploaded files

Uploaded landing-page media is not stored in the config payload bucket.

Instead:

- config JSON lives in `zoolanding-config-payloads`
- public media lives in `zoolandingpage-public-files`
- the public URL base is expected to be `https://assets.zoolandingpage.com.mx`

The image upload API returns a presigned upload URL and a final `publicUrl` that should be written into the relevant draft payload field.

## Common debugging boundary

When a contributor says “the site is wrong,” determine which layer is wrong first:

1. local draft files
2. authoring draft state
3. published runtime bundle
4. deployed frontend app or cache

Most operational confusion disappears once that boundary is clear.

## Key files in this repo

- `src/app/shared/services/config-source.service.ts`
- `src/app/shared/services/config-bootstrap.service.ts`
- `src/app/shared/services/config-store.service.ts`
- `src/app/shared/services/draft-runtime.service.ts`
- `src/app/shared/services/seo-metadata.service.ts`
- `src/app/shared/services/analytics.service.ts`
- `src/app/shared/services/quick-stats.service.ts`
- `src/app/shared/services/configurations-orchestrator.ts`
- `src/app/shared/components/wrapper-orchestrator/wrapper-orchestrator.component.ts`
- `src/app/shared/types/config-payloads.types.ts`
- `tools/config-draft-sync.mjs`

## Related docs

- [03-development-guide.md](03-development-guide.md)
- [06-deployment.md](06-deployment.md)
- [11-draft-lifecycle.md](11-draft-lifecycle.md)
- [12-public-assets-and-file-uploads.md](12-public-assets-and-file-uploads.md)
- [api-driven-config/README.md](api-driven-config/README.md)
- [10-wrapper-orchestrator.md](10-wrapper-orchestrator.md)
