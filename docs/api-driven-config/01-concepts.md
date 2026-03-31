# Concepts

## The goal

Make the UI definable as **JSON-serializable configuration** so landing pages can be created/updated without changing Angular templates.

In the current codebase, configuration still lives in TypeScript (`ConfigurationsOrchestratorService`), but the shape is intentionally **data-first** so it can be moved behind an API.

## Building blocks

### `TGenericComponent`

A component definition is a plain object with:

- `id`: stable string ID (used as the lookup key)
- `type`: discriminant union (`'container' | 'text' | 'button' | ...`)
- `config`: type-specific configuration object (should be JSON-friendly)

Optional common fields:

- `condition`: optional gating (ideally config-friendly; avoid inline lambdas for API payloads)
- `order`: optional ordering hint
- `meta_title`: optional analytics metadata
- `eventInstructions`: declarative event wiring
- `valueInstructions`: declarative dynamic value wiring (replaces inline lambdas)

### Wrapper Orchestrator

Pages render by passing a list of root IDs:

```html
<wrapper-orchestrator [componentsIds]="['heroContainer', 'siteFooter']"></wrapper-orchestrator>
```

The renderer resolves IDs, then renders the correct generic Angular component based on `type`.

### Configuration registry (current)

Right now, the registry is implemented as arrays grouped by type inside:

- `src/app/shared/services/configurations-orchestrator.ts`

To fully support “from API”, this registry becomes an in-memory store populated by remote JSON.

## What makes configuration "safe" for API use

### 1) No embedded JavaScript

Configs must not require inline TS/JS functions for runtime behavior (e.g. `label: () => ...`).

Instead, runtime/dynamic values use:

- `valueInstructions` (allowlisted resolvers)

### 2) Interaction behavior is centralized

Instead of wiring handlers in templates, configs declare:

- `eventInstructions` (semicolon-separated actions)

The orchestrator forwards events to a central handler that parses/executes the instructions.

### 3) Allowlist policy

Dynamic values are restricted by an allowlist:

- `src/app/shared/services/value-orchestrator-allowlist.ts`

Conditional rendering also relies on allowlisted handler IDs (see condition handler catalog).

If a resolver ID is not allowlisted, it won’t be applied.

## Mental model

- **Static UI**: put the literal value directly in `config.*`.
- **Dynamic UI**: put a placeholder in `config.*` (usually empty string), then use `valueInstructions` to set a thunk function at that path.
- **Events**: keep event behavior out of component implementations; use `eventInstructions` + the centralized dispatcher.

## Design constraints (important)

- Prefer the smallest config that achieves the UI.
- Reuse existing generic components.
- Keep raw color values centralized in `site-config.json.site.theme.palettes` and reference them through existing Angora keys/classes instead of scattering literal colors across component configs.
