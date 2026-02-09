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
- AI authoring checklist + guardrails: [06-authoring-checklist.md](06-authoring-checklist.md)
- End-to-end example config: [07-example-landing-config.md](07-example-landing-config.md)
- Suggested API payload shape (no endpoints assumed): [08-upload-to-api.md](08-upload-to-api.md)

## Related docs

- Existing high-level orchestrator doc: [../10-wrapper-orchestrator.md](../10-wrapper-orchestrator.md)

## Key implementation files

- Renderer: [src/app/shared/components/wrapper-orchestrator/wrapper-orchestrator.component.ts](../../src/app/shared/components/wrapper-orchestrator/wrapper-orchestrator.component.ts)
- Component union: [src/app/shared/components/wrapper-orchestrator/wrapper-orchestrator.types.ts](../../src/app/shared/components/wrapper-orchestrator/wrapper-orchestrator.types.ts)
- Registry (current source of truth for components): [src/app/shared/services/configurations-orchestrator.ts](../../src/app/shared/services/configurations-orchestrator.ts)
- Value orchestrator: [src/app/shared/services/value-orchestrator.ts](../../src/app/shared/services/value-orchestrator.ts)
- Value allowlist: [src/app/shared/services/value-orchestrator-allowlist.ts](../../src/app/shared/services/value-orchestrator-allowlist.ts)
- Value handlers: [src/app/shared/utility/value-handler](../../src/app/shared/utility/value-handler)
