# API-Driven Configuration

This folder documents the config model used by the Zoolanding frontend.

Use this folder for the data model, DSL rules, payload ownership, and validation rules that power config-driven pages. Use the top-level workflow docs when you need the operational path for creating drafts, pushing changes, publishing them, or uploading public assets.

## Read this folder after the workflow docs

Start with these top-level docs first:

1. [../11-draft-lifecycle.md](../11-draft-lifecycle.md)
2. [../12-public-assets-and-file-uploads.md](../12-public-assets-and-file-uploads.md)
3. [../02-architecture.md](../02-architecture.md)

Then use this folder as the reference layer.

## The three layers this folder describes

### Authored local files

The draft filesystem under `public/assets/drafts/{domain}/...`.

### Authoring transport

`TAuthoringDraftPackage`, the file-oriented package used by the authoring API and the local CLI.

### Runtime transport

`TRuntimeBundlePayload`, the effective bundle returned to live sites by the runtime API.

## What this system supports

- UI trees declared as `TGenericComponent` data.
- Component rendering by ID-based roots and container-owned child IDs.
- Dynamic values through `valueInstructions`.
- Actions through `eventInstructions`.
- Visibility logic through `condition`.
- Repeated structures through `loopConfig`.
- Shared domain defaults plus page-level overrides.
- Locale-aware content and metadata.
- Draft-owned appearance through `angora-combos.json`, theme palettes, and payload-owned classes.

## Current ownership summary

- `site-config.json`: domain routing, shared site metadata, runtime defaults, site-wide SEO defaults.
- `page-config.json`: render roots, page SEO, structured data, page analytics.
- `components.json`: shared components at domain root, page-specific components at page root.
- `variables.json`: shared defaults at domain root, route-specific overrides at page root.
- `angora-combos.json`: reusable visual bundles authored in payloads.
- `i18n/{lang}.json`: shared or page-specific locale dictionaries.

## Start here

- [01-concepts.md](01-concepts.md)
- [02-component-model.md](02-component-model.md)
- [03-value-instructions.md](03-value-instructions.md)
- [04-value-handlers-catalog.md](04-value-handlers-catalog.md)
- [05-event-instructions.md](05-event-instructions.md)
- [06-authoring-checklist.md](06-authoring-checklist.md)
- [07-example-landing-config.md](07-example-landing-config.md)
- [08-upload-to-api.md](08-upload-to-api.md)
- [11-draft-migration.md](11-draft-migration.md)
- [12-validation.md](12-validation.md)
- [13-loop-config.md](13-loop-config.md)
- [14-loop-resolution-catalog.md](14-loop-resolution-catalog.md)

## Practical rule for new contributors

If you are trying to change behavior and you do not know whether to edit code or payloads, answer these questions first:

1. Is this site-wide routing/runtime metadata? Edit `site-config.json`.
2. Is this page root, SEO, or page analytics? Edit `page-config.json`.
3. Is this rendered structure or component styling? Edit `components.json` and possibly `angora-combos.json`.
4. Is this content or site/page data? Edit `variables.json` or `i18n/*.json`.
5. Is this binary media? Upload it through the image-upload flow and store the returned `publicUrl` in payloads.

## Schemas

- [schemas/site-config.schema.json](schemas/site-config.schema.json)
- [schemas/page-config.schema.json](schemas/page-config.schema.json)
- [schemas/components.schema.json](schemas/components.schema.json)
- [schemas/variables.schema.json](schemas/variables.schema.json)
- [schemas/angora-combos.schema.json](schemas/angora-combos.schema.json)
- [schemas/i18n.schema.json](schemas/i18n.schema.json)

## Related docs

- [../11-draft-lifecycle.md](../11-draft-lifecycle.md)
- [../12-public-assets-and-file-uploads.md](../12-public-assets-and-file-uploads.md)
- [../03-development-guide.md](../03-development-guide.md)
- [../06-deployment.md](../06-deployment.md)
- [../10-wrapper-orchestrator.md](../10-wrapper-orchestrator.md)
