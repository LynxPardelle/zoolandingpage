# Component Model

This doc describes how to author `TGenericComponent` definitions so they are compatible with:

- configuration-driven rendering (`wrapper-orchestrator`)
- future API storage (JSON)
- dynamic values via `valueInstructions`

## Source of truth

- Type union: `src/app/shared/components/wrapper-orchestrator/wrapper-orchestrator.types.ts`

## Common fields

### `id` (required)

- Must be unique across the entire configuration space.
- Should be stable over time (treat as a primary key).
- Use a clear prefix by section: `hero*`, `faq*`, `footer*`, etc.

### `type` (required)

Determines which generic Angular component renders.

### `config` (required)

Type-specific payload.

Rule of thumb for API mode:

- `config` should be JSON-serializable.
- If you need runtime changes, use `valueInstructions`.

### `valueInstructions` (optional)

A semicolon-separated DSL that can set _dynamic_ values at paths like `config.label`.

See: [03-value-instructions.md](03-value-instructions.md)

### `eventInstructions` (optional)

A semicolon-separated DSL for centralized event handling.

See: [05-event-instructions.md](05-event-instructions.md)

### `condition` (optional)

A semicolon-separated DSL for conditional rendering.

See: [09-condition-instructions.md](09-condition-instructions.md)

### `loopConfig` (optional)

Object-based loop materialization for containers that should generate child IDs from data.

Supported source kinds:

- `var` with `path`
- `i18n` with `path`
- `repeat` with `count`

See: [13-loop-config.md](13-loop-config.md)

### `config.itemsSource` for accordion (optional)

`generic-accordion` supports an API-safe item source model:

```ts
itemsSource: { source: 'i18n' | 'var', path: 'faq' }
```

Use this instead of inline `items: () => ...` lambdas in API mode.

## Composition / nesting

A common pattern is:

- In API payloads, a `container` has `config.components: string[]`.
- Children are referenced by ID.

Example:

```ts
{
  id: 'heroCtas',
  type: 'container',
  config: {
    tag: 'div',
    classes: 'ank-display-flex ank-gap-1rem',
    components: ['primaryCTA', 'secondaryCTA'],
  },
}
```

Runtime note:

- The in-memory TypeScript registry can also compose child trees with inline `TGenericComponent` objects.
- That capability is for local/runtime composition only.
- `components.json` should continue using string IDs so payloads stay serializable and stable.

## Interaction scopes and inputs

Stateful authored interactions should use an `interaction-scope` component as the local runtime boundary.

- `interaction-scope` owns local field state, validation state, and computed outputs for one wrapper subtree.
- `input` components should live inside the nearest `interaction-scope` so sibling components can react to shared local state without using global runtime services.
- Existing display components such as `text`, `stats-counter`, `button`, and `container` can read scoped values through `valueInstructions`.

Recommended pattern:

```ts
{
  id: 'leadFormScope',
  type: 'interaction-scope',
  config: {
    scopeId: 'leadForm',
    tag: 'form',
    classes: 'ank-display-flex ank-flex-column ank-gap-1rem',
    components: ['leadNameInput', 'leadEmailInput', 'leadSubmitButton'],
    submitEventInstructions: 'trackCTAClick:event.meta_title,submit,lead-form',
  },
}
```

For API mode:

- Keep field configs JSON-serializable.
- Use `valueInstructions` for labels, helper text, defaults, and computed output binding.
- Keep user-entered values inside the local interaction scope rather than `variables.json` unless the value is a true persisted default.

## Configuration authoring rules (API-friendly)

### Avoid inline lambdas

If you see any of these inside config, it is _not_ API-safe:

- `text: () => ...`
- `label: () => ...`
- `items: () => ...`
- `condition: () => ...`

Some of these may still exist in the TS registry today, but the API-target format should not require them.

### Prefer `valueInstructions` for dynamic strings

Common cases:

- i18n labels
- language/theme switches
- env-based values
- scoped interaction state (`scope`, `scopeOr`) inside `interaction-scope`

### Prefer IDs over deep copies

Avoid duplicating component objects. Compose with IDs.

Exception:

- Direct nested component objects are acceptable in runtime TypeScript-only composition when a local shell or service needs to assemble a small UI tree without adding registry IDs.
- Do not use that pattern in API payloads.

## Debugging authoring mistakes

- Missing ID: renderer will warn on lookup.
- Wrong `type`: renderer will not find a matching case.
- Dynamic value not applied: check resolver ID allowlist.
