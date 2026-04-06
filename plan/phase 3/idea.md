# Phase 3 Ideas: Fully Generic, Database-Driven Landing Pages

This document expands the proposed enhancements to make the app a true generic shell that can render any landing page configured in the database. Each item includes the rationale, suggested approach, and how it fits into the existing architecture.

## 1) Config Contract and Versioning

Goal: Make every payload self-describing and safely evolvable across environments and clients.

Proposal:

- Add two explicit version fields to every payload:
  - configVersion: The semantic version of the page configuration data itself.
  - schemaVersion: The schema version the payload conforms to.
- Enforce compatibility in the bootstrap pipeline. If a schema version is unsupported, fail fast with a clear error and allow a fallback layout to render with a maintenance message.
- Add a capabilities array in the manifest to describe optional features. Example: ["i18n", "seo", "combos", "analytics", "experiments"].

Why:

- Prevents silent breakage when payload formats evolve.
- Allows the shell to adapt to available payloads instead of assuming all features are present.

## 2) Unified Page Manifest (Proposed Schema)

Goal: Replace hardcoded endpoint wiring with a single manifest that describes where all data comes from, in which order, and how it is applied.

Manifest concept:

- A single entry point for page bootstrapping.
- Enables server-side or client-side bootstrap with the same structure.
- Supports per-domain routing, multi-language resources, and overrides.

Proposed manifest payload (example):

```
{
  "schemaVersion": "1.0.0",
  "configVersion": "2026.02.10",
  "pageId": "default",
  "domain": "zoolandingpage.com.mx",
  "capabilities": ["i18n", "seo", "combos", "analytics", "structuredData"],
  "assetsBaseUrl": "https://cdn.example.com/landing-assets/",
  "endpoints": {
    "pageConfig": "/api/pages/default/config",
    "components": "/api/pages/default/components",
    "variables": "/api/pages/default/variables",
    "combos": "/api/pages/default/angora-combos",
    "seo": "/api/pages/default/seo",
    "structuredData": "/api/pages/default/structured-data",
    "analytics": "/api/pages/default/analytics-config"
  },
  "i18n": {
    "defaultLang": "es",
    "supported": ["es", "en"],
    "resources": {
      "es": "/api/pages/default/i18n/es",
      "en": "/api/pages/default/i18n/en"
    }
  },
  "overrides": {
    "dev": {
      "components": "/assets/drafts/zoolandingpage.com.mx/default/components.json"
    }
  },
  "dependencies": [
    "pageConfig",
    "components",
    "variables",
    "combos",
    "i18n",
    "seo",
    "structuredData",
    "analytics"
  ]
}
```

How it works:

- ConfigBootstrapService loads the manifest first (via domain resolver + page id).
- The bootstrap pipeline uses dependencies[] to enforce load order.
- Each optional feature checks capabilities before loading.
- Dev overrides allow local drafts without changing production endpoints.

## 3) Asset and Media Abstraction

Goal: Make media paths portable across environments and allow per-page asset strategies.

Proposal:

- Add an asset resolver that rewrites relative media paths using assetsBaseUrl from the manifest.
- Support responsive image sets in payloads, including srcset and sizes.
- Allow different asset roots per language or region if needed.

Why:

- Keeps configuration portable across environments (dev, staging, prod).
- Makes it easier to serve media from a CDN without altering every payload.

## 4) Component Registry as Data

Goal: Allow the shell to render new component types without code changes in core flows.

Proposal:

- Introduce a component registry map (type -> Angular component) that can be extended by feature modules.
- Allow payloads to specify optional component modules that should be loaded (lazy or preloaded).
- Validate that every component type used in payloads exists in the registry.

Why:

- Enables plugin-like component additions for new landing page patterns.
- Lets you ship new section types without restructuring the shell.

## 5) Layout Templates and Slots

Goal: Reduce the size of component trees and make authoring easier for content teams.

Proposal:

- Define layout templates (hero + sections + footer) with named slots.
- Payloads populate slots by referencing components or pre-defined section blocks.
- Allow pageConfig to choose a layout template ID.

Why:

- Simplifies authoring and encourages reuse.
- Reduces payload verbosity and risk of inconsistent structure.

## 6) Condition and Variable DSL Hardening

Goal: Make the DSL robust and safe for complex content rules.

Proposal:

- Validate condition/value expressions at load time and surface human-readable errors.
- Add defaults and fallbacks for missing variables.
- Support environment overlays for variables (dev/stage/prod) with clear precedence rules.

Why:

- Keeps payloads stable even when optional data is missing.
- Improves debugging and reduces runtime errors.

## 7) Preview and Draft Workflow Enhancements

Goal: Secure, multi-variant previews without code changes.

Proposal:

- Add previewToken support for temporary access to unpublished configs.
- Support draftId, branch, and experimentId to preview variants.
- Enable a manifest override for local or remote draft endpoints.

Why:

- Enables safe QA and stakeholder review before publishing.
- Supports A/B testing and personalized variants.

## 8) Telemetry and Debug UX

Goal: Understand configuration health and performance in production and development.

Proposal:

- Record load timing for each endpoint and validation step.
- Expose a debug overlay showing:
  - Manifest version
  - Missing or invalid payloads
  - Validation errors
  - Endpoint timings
- Add a "config health" object in analytics events.

Why:

- Helps detect issues quickly in production.
- Gives developers a consistent way to diagnose configuration problems.

## 9) Robust Error Handling and Fallbacks

Goal: Guarantee a safe user experience when payloads fail.

Proposal:

- Add a fallback page layout configured in the manifest.
- If critical payloads are missing or invalid, render fallback content and report errors.
- Allow pageConfig to define a maintenance mode block.

Why:

- Avoids blank pages in production.
- Ensures resilient UX even during backend outages.

## 10) Schema-First Tooling and Authoring Support

Goal: Empower content teams to validate and edit without engineering support.

Proposal:

- Provide a local CLI that validates payloads against schemas.
- Add a schema-to-form generator for internal editing tools.
- Enable a "lint" step for payloads in CI to prevent invalid configs from shipping.

Why:

- Shifts validation earlier in the pipeline.
- Enables faster iteration with fewer errors.

## Suggested Next Steps

1. Implement the manifest endpoint and bootstrap usage.
2. Add validation for schemaVersion and configVersion across all payloads.
3. Build the asset resolver and apply it in component rendering.
4. Add registry validation for unknown component types.
5. Define 1-2 layout templates and migrate one existing page as a pilot.
