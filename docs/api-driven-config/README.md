# API‑Driven Configuration (Generic App Mode)

This folder documents the **configuration-driven UI system** used by this repo, with the goal of making landing pages (and eventually other pages) definable as **data** that can be stored in / loaded from an API.

It is written to be **friendly for an AI assistant** generating new landing pages by producing configuration only.

## What you can do with this system

- Declare UI as a tree of `TGenericComponent` objects.
- Compose pages by listing component IDs (root list) and letting containers declare children.
- Centralize interaction behavior using `eventInstructions`.
- Replace inline functions (e.g. `label: () => ...`) with `valueInstructions` (a safe, allowlisted DSL).

## Start here

- Concepts and the overall model: [01-concepts.md](01-concepts.md)
- Component data model and common fields: [02-component-model.md](02-component-model.md)
- Dynamic values (`valueInstructions`) DSL: [03-value-instructions.md](03-value-instructions.md)
- Value handler catalog (what resolver IDs exist): [04-value-handlers-catalog.md](04-value-handlers-catalog.md)
- Events (`eventInstructions`) DSL: [05-event-instructions.md](05-event-instructions.md)
- Conditions (`condition`) DSL: [09-condition-instructions.md](09-condition-instructions.md)
- Condition handler catalog: [10-condition-handlers-catalog.md](10-condition-handlers-catalog.md)
- AI authoring checklist + guardrails: [06-authoring-checklist.md](06-authoring-checklist.md)
- End-to-end example config: [07-example-landing-config.md](07-example-landing-config.md)
- Suggested API payload shape (no endpoints assumed): [08-upload-to-api.md](08-upload-to-api.md)
- Draft migration guide: [11-draft-migration.md](11-draft-migration.md)
- Validation and troubleshooting: [12-validation.md](12-validation.md)

## Schemas (Phase 2, Step 1)

- Page config: [schemas/page-config.schema.json](schemas/page-config.schema.json)
- Components: [schemas/components.schema.json](schemas/components.schema.json)
- Variables: [schemas/variables.schema.json](schemas/variables.schema.json)
- Angora combos: [schemas/angora-combos.schema.json](schemas/angora-combos.schema.json)
- i18n: [schemas/i18n.schema.json](schemas/i18n.schema.json)
- SEO: [schemas/seo.schema.json](schemas/seo.schema.json)
- Structured data: [schemas/structured-data.schema.json](schemas/structured-data.schema.json)
- Analytics config: [schemas/analytics-config.schema.json](schemas/analytics-config.schema.json)

## Draft Interceptor (Step 7)

In development, a draft interceptor can redirect API config requests to:

```
public/assets/drafts/{domain}/{pageId}/...
```

This is enabled when `environment.drafts.enabled` is true. It only affects GET requests to config endpoints.

## Related docs

- Existing high-level orchestrator doc: [../10-wrapper-orchestrator.md](../10-wrapper-orchestrator.md)

## Key implementation files

- Renderer: [src/app/shared/components/wrapper-orchestrator/wrapper-orchestrator.component.ts](../../src/app/shared/components/wrapper-orchestrator/wrapper-orchestrator.component.ts)
- Component union: [src/app/shared/components/wrapper-orchestrator/wrapper-orchestrator.types.ts](../../src/app/shared/components/wrapper-orchestrator/wrapper-orchestrator.types.ts)
- Registry (current source of truth for components): [src/app/shared/services/configurations-orchestrator.ts](../../src/app/shared/services/configurations-orchestrator.ts)
- Value orchestrator: [src/app/shared/services/value-orchestrator.ts](../../src/app/shared/services/value-orchestrator.ts)
- Value allowlist: [src/app/shared/services/value-orchestrator-allowlist.ts](../../src/app/shared/services/value-orchestrator-allowlist.ts)
- Value handlers: [src/app/shared/utility/value-handler](../../src/app/shared/utility/value-handler)
- Condition orchestrator: [src/app/shared/services/condition-orchestrator.ts](../../src/app/shared/services/condition-orchestrator.ts)
- Condition handlers: [src/app/shared/utility/condition-handler](../../src/app/shared/utility/condition-handler)
