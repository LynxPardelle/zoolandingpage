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
trackEvent:event.meta_title,cta,hero:secondary,location,hero;navigationToSection:features-section
```

- Conditional tracking from event state:

```text
trackEventWhen:event.eventData.expanded,true,faq_open,faq,event.eventData.id
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
submitScope;trackEvent:event.meta_title,cta,lead-form:submit,location,lead-form
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

- Upload a public image and store the result in scope:

```text
uploadPublicImage:heroImageUpload,event.eventData.value,hero-image,hero-images,1600,1600,82
```

Argument order for `uploadPublicImage` is:

- target scope field id
- file value, usually `event.eventData.value`
- asset id
- asset kind
- max width (optional)
- max height (optional)
- quality (optional)
- PNG compression level (optional)
- prefer direct upload (optional)
- direct upload max bytes (optional)

The action writes a structured state object into the nearest `interaction-scope`, for example:

- `status`: `uploading`, `success`, or `error`
- `publicUrl`
- `uploadStrategy`
- `compression`
- `error`

This makes uploads composable with existing `valueInstructions` and `condition` DSLs.

## Adding new actions

Actions are implemented in the centralized event handler (see `ConfigurationsOrchestratorService.handleComponentEvent` and related utilities).

When adding a new action, keep it:

- idempotent where possible
- side-effect bounded (analytics/navigation only)
- safe for API-provided inputs

Prefer parameterized generic actions over page-specific handler IDs. If a behavior can be expressed by passing a modal id, analytics label, section id, or message key from payloads, keep the handler generic and move the page-specific values into the draft or API payload.
