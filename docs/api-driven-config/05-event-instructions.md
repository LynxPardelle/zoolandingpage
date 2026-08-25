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

- Focus a conditionally rendered result or invalid field by DOM id:

```text
focusElementById:calculator-result
```

The action can be gated with strict actual/expected pairs. Values are compared after the event DSL has resolved references and coerced its literals:

```text
focusElementById:property-value,event.eventData.valid,false
focusElementById:calculator-result,event.eventData.valid,true,event.eventData.submitted,true
```

`focusElementById` requires an id followed by zero or more complete actual/expected pairs. It does nothing unless every pair is strictly equal. The lookup is deferred until after the current event turn so a conditionally rendered target can exist; a found target is scrolled into the nearest view and focused. A missing target is a safe no-op. Give the target a programmatic focus point such as `tabindex: -1` when it is not naturally focusable.

- Navigate with the current interaction scope encoded as query params:

```text
navigateWithScopeQuery:/,#catalog,pokemon=values.search,type=values.type,move=values.attack,page=values.page,pageSize=values.pageSize
```

Argument order for `navigateWithScopeQuery` is:

- target path or internal URL
- optional fragment/anchor
- one or more `queryKey=eventData.path` mappings

The handler preserves draft runtime sticky query params, omits empty values plus `all`/`undefined`/`null`, and navigates in the current window. This is the preferred pattern for draft search/filter forms that should be shareable by URL.

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

This browser action must not be used in public drafts until a server-side authenticated grant bridge is connected. Public draft payloads cannot contain upload grants or signed URLs. For current client and teammate uploads, use the hub workflow in [../12-public-assets-and-file-uploads.md](../12-public-assets-and-file-uploads.md).

## Adding new actions

Actions are implemented in the centralized event handler (see `ConfigurationsOrchestratorService.handleComponentEvent` and related utilities).

When adding a new action, keep it:

- idempotent where possible
- side-effect bounded (analytics/navigation only)
- safe for API-provided inputs

Prefer parameterized generic actions over page-specific handler IDs. If a behavior can be expressed by passing a modal id, analytics label, section id, or message key from payloads, keep the handler generic and move the page-specific values into the draft or API payload.
