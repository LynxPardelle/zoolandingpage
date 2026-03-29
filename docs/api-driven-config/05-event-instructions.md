# `eventInstructions` DSL

This project already has an `eventInstructions` mechanism for configuration-driven interaction behavior.

Rather than duplicating existing docs, this page focuses on what an AI assistant needs to _author_ configs correctly.

## See also

- Wrapper orchestrator events overview: [../10-wrapper-orchestrator.md](../10-wrapper-orchestrator.md)

## What `eventInstructions` is

- A semicolon-separated instruction string.
- Each instruction is `action:param1,param2,...`.
- Parameters can reference event payload fields using `event.<field>`.

Example:

```ts
eventInstructions: 'openWhatsApp:event.meta_title,hero_primary,hero;navigationToSection:features-section';
```

## Authoring rules

- Keep event logic out of templates.
- Keep event logic out of config lambdas.
- Prefer small, composable actions separated by `;`.

## Common patterns

- Track + navigate:

```text
trackCTAClick:event.meta_title,secondary,hero;navigationToSection:features-section
```

- Open a payload-owned modal:

```text
openModal:terms-of-service,footer:terms,open_terms_modal,footer
```

Argument order for `openModal` is:

- modal id
- analytics label (optional)
- analytics action (optional)
- analytics location (optional)

- Scoped interaction submit:

```text
submitScope;trackCTAClick:event.meta_title,submit,lead-form
```

- Scoped interaction reset:

```text
resetScope
```

- Set a field value from another control:

```text
setScopeValue:planTier,premium
```

These actions only affect the nearest `interaction-scope` host in the wrapper subtree.

## Adding new actions

Actions are implemented in the centralized event handler (see `ConfigurationsOrchestratorService.handleComponentEvent` and related utilities).

When adding a new action, keep it:

- idempotent where possible
- side-effect bounded (analytics/navigation only)
- safe for API-provided inputs

Prefer parameterized generic actions over page-specific handler IDs. If a behavior can be expressed by passing a modal id, analytics label, section id, or message key from payloads, keep the handler generic and move the page-specific values into the draft or API payload.
