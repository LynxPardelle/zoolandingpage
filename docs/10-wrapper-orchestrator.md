# Configuration-Driven UI (Wrapper Orchestrator) 🧩

This project is transitioning some UI sections from **hand-written Angular component trees** (e.g. `app-shell`) to a **configuration-driven rendering model**.

In this model:

- A page template renders a single `wrapper-orchestrator` instance.
- The orchestrator receives a list of component IDs (`componentsIds`).
- Those IDs are resolved via a registry (`ConfigurationsOrchestratorService`).
- Each resolved entry is a typed `TGenericComponent` that drives which generic component renders (`generic-container`, `generic-button`, etc.).
- Containers can nest other components by listing child IDs in `config.components`, allowing an entire UI tree to be declared as data.

## Why this exists

- **Centralized configuration**: content + structure live in one place instead of being distributed across many templates.
- **Reusable building blocks**: complex sections are composed from a small set of generic components.
- **Uniform analytics/event handling**: events bubble to a single handler with consistent metadata.
- **Composable nesting**: containers can recursively render children, enabling large layouts (e.g. Hero) as pure configuration.

## Key files

- Component renderer: [src/app/shared/components/wrapper-orchestrator/wrapper-orchestrator.component.ts](../src/app/shared/components/wrapper-orchestrator/wrapper-orchestrator.component.ts)
- Component renderer template: [src/app/shared/components/wrapper-orchestrator/wrapper-orchestrator.component.html](../src/app/shared/components/wrapper-orchestrator/wrapper-orchestrator.component.html)
- Component union type: [src/app/shared/components/wrapper-orchestrator/wrapper-orchestrator.types.ts](../src/app/shared/components/wrapper-orchestrator/wrapper-orchestrator.types.ts)
- Registry + event handling: [src/app/shared/services/configurations-orchestrator.ts](../src/app/shared/services/configurations-orchestrator.ts)

## How it works

### 1) Pages render by ID list

Instead of rendering a full subtree directly, pages can now do:

```html
<wrapper-orchestrator [componentsIds]="['heroContainer', 'conversionNoteContainer']"></wrapper-orchestrator>
```

This is already used in the landing page.

### 2) The orchestrator resolves IDs into typed components

`WrapperOrchestrator` converts the input IDs into component definitions by calling:

- `ConfigurationsOrchestratorService.getComponentById(id)`

The service returns a `TGenericComponent` union which includes:

- `id`: stable string identifier
- `type`: discriminant union (`'container' | 'button' | 'text' | ...`)
- `config`: type-specific config (container config, button config, etc.)
- optional: `condition`, `order`, `meta_title`, `eventInstructions`

### 3) Rendering is a type switch

The orchestrator template uses `@switch(component.type)` to decide which generic component to render.

### 4) Nesting happens through container children

If a rendered component’s config includes a `components: string[]` field (commonly on containers), the template recursively renders:

```html
<wrapper-orchestrator [componentsIds]="[componentId]"></wrapper-orchestrator>
```

This is how large trees like Hero become just a list of entries in the registry.

### 5) Events are centralized

Generic components emit events (e.g. button `pressed`, accordion `toggled`).

The orchestrator captures them and forwards to:

- `ConfigurationsOrchestratorService.handleComponentEvent(...)`

This enables page-level behaviors (navigation, WhatsApp open, analytics) to be declared in config rather than wired manually in each page template.

## Defining components in the registry

Component definitions live in `ConfigurationsOrchestratorService` as arrays grouped by type (buttons, containers, texts, etc.).

Example patterns you’ll see:

- Root containers for a section (e.g. `heroContainer`)
- Intermediate layout containers (e.g. `heroContainerInner`, `heroLeft`, `heroRight`)
- Leaf nodes (e.g. `primaryCTA`, `subtitle`, `description`)

### Example: container that composes other IDs

A container typically drives layout and lists its children:

```ts
{
  id: 'ctaContainer',
  type: 'container',
  config: {
    tag: 'div',
    classes: 'ank-display-flex ank-gap-1rem ...',
    components: ['primaryCTA', 'secondaryCTA'],
  },
}
```

### Conditional components

Use `condition` to gate a component (example: only render if translations include secondary CTA):

```ts
{
  id: 'secondaryCTA',
  condition: !!this.i18n.hero().secondary,
  type: 'button',
  ...
}
```

Note: whether `condition` is enforced depends on the registry/orchestrator filtering logic. Prefer defining `condition` and ensuring `getComponentById`/registry assembly respects it.

### Ordering

Some components can declare `order`. If ordering is important, prefer sorting inside the service when building the full `components` array.

## Event instructions DSL

Buttons (and other interactive components) can define `eventInstructions`, which is a small instruction string parsed by `handleComponentEvent`.

### Format

- Instructions are separated by `;`
- Each instruction is `action:param1,param2,...`
- Supported actions (current):
  - `openWhatsApp`
  - `trackCTAClick`
  - `navigationToSection`

### Dynamic event param binding

Parameters can reference event fields using `event.<fieldName>`.

Example:

```ts
eventInstructions: 'openWhatsApp:event.meta_title,hero_primary,hero;navigationToSection:features-section';
```

The handler resolves `event.meta_title` using the event payload passed from the orchestrator.

## Migrating an existing section

### Before

A page template wires behavior directly:

- `<hero-section ... (primary)=... (secondary)=...>`
- `<conversion-note ...>`

### After

1. Create component config entries in `ConfigurationsOrchestratorService` (containers + leaf nodes).
2. Replace the subtree with a single orchestrator invocation:

```html
<wrapper-orchestrator [componentsIds]="['heroContainer', 'conversionNoteContainer']"></wrapper-orchestrator>
```

3. Move event wiring into `eventInstructions` and/or service handlers.

## Debugging & validation

- Missing component IDs: `getComponentById` logs an error when an ID is not found.
- Render completeness: `allComponentsRendered()` checks whether all registered IDs were requested at least once.
- Performance: the orchestrator template uses `@defer (on viewport; prefetch on idle)` to delay non-critical rendering.

## Adding a new generic component type

1. Extend the union in [src/app/shared/components/wrapper-orchestrator/wrapper-orchestrator.types.ts](../src/app/shared/components/wrapper-orchestrator/wrapper-orchestrator.types.ts).
2. Add the new generic component to `imports` in the orchestrator component.
3. Add a new `@case('<type>')` branch in the orchestrator template.
4. Add registry entries in `ConfigurationsOrchestratorService`.
