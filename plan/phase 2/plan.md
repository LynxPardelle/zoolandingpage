# Phase 2 Plan: API-Driven Landing Pages (Generic Shell)

## Overview

This phase turns the Angular app into a generic shell that renders landing pages from API-provided configuration, progressively as each endpoint responds. It also adds a development-only AI drafting workflow that saves JSON drafts to ignored files before publishing.

## Goals

- Progressive rendering: page config first, then components, then hydrate with i18n and variables.
- Domain-based resolution in production; configurable domain in development.
- API-driven configs as the source of truth (no inline lambdas).
- AI draft flow that mirrors current TS consts and is safe to review and publish.
- Minimal future-proofing for multi-page sites (pageId + optional route field).

## Existing Foundations (Already in Code)

- Wrapper Orchestrator + TGenericComponent model.
- Value, condition, and event orchestrators with allowlists.
- i18n service with pluggable loader.

## New Concepts for This Phase

- Config bootstrap layer and API client.
- Variable orchestrator and store.
- Domain resolver with default domain fallback.
- Drafts on disk (gitignored) replacing TS consts in the long term.

## Suggested API Endpoints (Progressive Load)

- GET api.zoolandingpage.com.mx/page-config?domain={domain}
- GET api.zoolandingpage.com.mx/components?domain={domain}
- GET api.zoolandingpage.com.mx/angora-combos?domain={domain}
- GET api.zoolandingpage.com.mx/variables?domain={domain}
- GET api.zoolandingpage.com.mx/i18n?domain={domain}&lang={lang}
- GET api.zoolandingpage.com.mx/seo?domain={domain}
- GET api.zoolandingpage.com.mx/structured-data?domain={domain}
- GET api.zoolandingpage.com.mx/analytics-config?domain={domain}
- POST api.zoolandingpage.com.mx/page-config (admin publish)
- POST api.zoolandingpage.com.mx/components (admin publish)
- POST api.zoolandingpage.com.mx/angora-combos (admin publish)
- POST api.zoolandingpage.com.mx/variables (admin publish)
- POST api.zoolandingpage.com.mx/i18n (admin publish)
- POST api.zoolandingpage.com.mx/seo (admin publish)
- POST api.zoolandingpage.com.mx/structured-data (admin publish)
- POST api.zoolandingpage.com.mx/analytics-config (admin publish)

## Payload Shapes (Contract First)

- PageConfigPayload
  - version, pageId, domain, rootIds, metadata, optional routes
- ComponentsPayload
  - version, pageId, domain, components (map by id)
- AngoraCombosPayload
  - version, pageId, domain, combos (map of name -> string[])
- VariablesPayload
  - version, pageId, domain, variables (map by key), computed (optional)
- I18nPayload
  - version, pageId, domain, lang, dictionary
- SeoPayload
  - version, pageId, domain, title, description, openGraph, twitter, canonical
- StructuredDataPayload
  - version, pageId, domain, entries (array of schema.org blocks)
- AnalyticsConfigPayload
  - version, pageId, domain, sectionIds, scrollMilestones, consentMode

## Default Domain Strategy

- Default domain: zoolandingpage.com.mx
- Production: domain from window.location host.
- Development: override via environment config (environment.ts) with .env override support.
- Inactive page: fall back to default domain and show a maintenance/locked message (modal or animation).

## Drafts Strategy

- Drafts live in gitignored files.
- Local development should default to drafts (to emulate API loading).
- Suggested structure (public assets):
  - /public/assets/drafts/{domain}/{pageId}/page-config.json
  - /public/assets/drafts/{domain}/{pageId}/components.json
  - /public/assets/drafts/{domain}/{pageId}/angora-combos.json
  - /public/assets/drafts/{domain}/{pageId}/variables.json
  - /public/assets/drafts/{domain}/{pageId}/i18n/en.json
  - /public/assets/drafts/{domain}/{pageId}/i18n/es.json
  - /public/assets/drafts/{domain}/{pageId}/seo.json
  - /public/assets/drafts/{domain}/{pageId}/structured-data.json
  - /public/assets/drafts/{domain}/{pageId}/analytics-config.json
- Current TS consts in ConfigurationsOrchestratorService migrate to drafts.

## Phase 2 Structure

### Step 1: API Contract + Progressive Rendering Design

**Goal**: Define the payloads, progressive load order, and validation rules.

Deliverables:

- Finalized JSON schemas for all endpoints.
- Progressive render plan: page-config -> components -> variables -> i18n.
- Validation rules for ids, type allowlist, and instruction allowlists.
- Minimal future-proofing fields: pageId + optional route per config.
- Angora combos payload spec and apply order.
- SEO/structured data payload specs.
- Analytics config payload spec (section ids and scroll milestones).

Tasks:

1. Define payload schemas and versioning rules.
2. Decide strict vs best-effort validation and error handling.
3. Define mapping rules for domain -> pageId with default fallback.
4. Confirm content hydration order and placeholder behavior.

### Step 2: Domain Resolution and Environment Overrides

**Goal**: Resolve domain in prod and override in dev.

Deliverables:

- DomainResolverService (prod host + dev override).
- environment.ts dev section (domain + apiBaseUrl) with .env override hook.
- Default domain fallback + maintenance/locked UI behavior.

Tasks:

1. Add environment config keys for dev domain and API base.
2. Implement resolver and unit tests.
3. Wire default domain fallback when API indicates inactive page.
4. Add maintenance/locked modal or animation trigger on fallback.

### Step 3: Config API Client and Bootstrap Layer

**Goal**: Create a config bootstrap that loads progressively.

Deliverables:

- ConfigApiService for all endpoints with timeouts and retries.
- ConfigBootstrapService with staged loading and readiness signals.
- ConfigStoreService to cache payloads per pageId and version.
- Progressive application of combos, SEO, and analytics config as they arrive.

Tasks:

1. Build API client methods with cancellable requests.
2. Add staged boot sequence (page-config then components then variables then i18n).
3. Emit state for loading placeholders and partial render.
4. Apply Angora combos as soon as combos payload arrives.
5. Apply SEO/meta, structured data, and analytics config when available.

### Step 4: Variable Orchestrator and Store

**Goal**: Add variables as a first-class orchestration layer.

Deliverables:

- VariableStoreService for base variables and overrides.
- VariableOrchestrator with allowlisted resolvers.
- New value/condition handlers for variables.

Tasks:

1. Define variable payload model and namespaces.
2. Implement variable resolution for valueInstructions and condition DSL.
3. Add tests for variable resolution order.

### Step 5: Data-Driven Config Registry

**Goal**: Replace TS const registry with API-backed store and draft loader.

Deliverables:

- Registry adapter that maps API payloads to TGenericComponent.
- Fallback to local drafts in development.
- Removal plan for TS consts once drafts exist.

Tasks:

1. Implement components map registry.
2. Add normalization and compatibility layer for existing config entries.
3. Migrate current TS config to draft JSON files.
4. Add local draft loader from public assets.

### Step 6: i18n API Integration

**Goal**: Load translations per domain and language.

Deliverables:

- I18nService configured with API loader at boot.
- Prefetch logic for secondary language.
- SSR-safe behavior and caching strategy.

Tasks:

1. Add loader selection in bootstrap based on environment.
2. Add tests for cache and fallback behavior.

### Step 6B: Angora Combos API Integration

**Goal**: Load and apply Angora combos from API/drafts.

Deliverables:

- AngoraCombosService to fetch and apply combos.
- Safe merge strategy with existing default combos.

Tasks:

1. Apply combos in AppShell after NgxAngoraService init.
2. Add validation for combo names and class lists.

### Step 7: Dev-Only AI Drafting Flow

**Goal**: Generate drafts through an AI assistant in development.

Deliverables:

- Dev-only interceptor for config endpoints.
- Draft file loader from public assets.
- Review UI to approve and export payloads.

Tasks:

1. Create interceptor and AI provider contract.
2. Load drafts as JSON files under public assets (gitignored).
3. Provide a review screen to validate and export.

### Step 8: App Shell Genericization

**Goal**: Make the shell fully data-driven.

Deliverables:

- App shell waits for bootstrap readiness.
- Landing page uses rootIds from store.
- Remove remaining template data dependencies.
- Header/nav config from API payloads instead of hardcoded labels.
- SEO/meta and structured data config fully data-driven.
- Analytics section ids and scroll milestones configurable from API.

Tasks:

1. Replace hardcoded section lists with store-driven IDs.
2. Add placeholders for partial data states.
3. Move header nav items to API config.
4. Move SEO/meta defaults to API config with fallbacks.
5. Move structured data blocks to API config with fallbacks.
6. Move analytics section ids and scroll milestones to API config.

### Step 9: Validation, Tests, and Docs

**Goal**: Ensure stability and document the workflow.

Deliverables:

- Runtime schema validation and logging.
- Unit and integration tests for boot flow.
- Drafting and publishing documentation.

Tasks:

1. Add schema validators for each payload.
2. Add tests for progressive rendering states.
3. Add docs and example drafts for two domains.

## Risks and Mitigations

- Risk: Partial payloads render broken UI. Mitigation: typed validation + placeholders.
- Risk: Variable coupling becomes implicit. Mitigation: namespaces + allowlists.
- Risk: AI drafts cause instability. Mitigation: review UI and validation gate.
- Risk: SSR mismatch. Mitigation: server-safe loaders and preload when available.

## Open Questions (To Confirm)

- API auth or signing strategy for production? (Resolved: none for now.)
- Domain -> pageId ownership (backend) with pageId query support.
- Inactive page handling: API sends default configs + a note; show maintenance/locked message.
- Draft review UI routing: no special routes; drafts loaded only in local dev from public assets.
