# Loop Resolution Catalog

This page describes currently implemented loop materialization behavior.

## Source kinds

- `var`: reads an array from `VariableStoreService` by `path`.
- `i18n`: reads an array from `I18nService` by `path`.
- `repeat`: generates `count` items.

## ID strategy

Generated IDs are:

```text
{idPrefix}__{index+1}
```

If `idPrefix` is not provided, `templateId` is used.

Generated container children can reference a sibling generated component by using `{{index}}` in the child ID. Example:

```text
badgeText__{{index}}
```

When `badgeContainer__2` is materialized, that child reference becomes `badgeText__2`.

## Binding-driven materialization

- Repeated content mapping is now draft-owned through `loopConfig.bindings`.
- Each binding writes to an explicit target path on the generated component.
- Each binding can declare an ordered list of sources, so fallback behavior is also authored in the payload.

Supported transforms:

- `i18nKey`
- `locale`
- `navigationHref`

Example:

```text
config.text <= icon | labelKey(i18nKey) | label(locale)
```

This means the runtime no longer guesses how a `link`, `text`, or `generic-card` loop should be shaped for a specific page.

## Remaining generic finalizers

- `container`
  - replaces `{{index}}` tokens in child component IDs using the generated component suffix
- `generic-card`
  - if `config.buttonLabel` resolves to a non-empty string, binds the CTA callback through orchestrator event dispatch
- `link`
  - if no explicit `ariaLabel` resolves but `config.text` does, reuses the rendered text as the aria label

## Warnings and fallback behavior

- Missing template ID: warning + skip.
- `var`/`i18n` source not array: warning + skip.

## Authoring guidance

- Keep templates minimal and deterministic.
- Put shared visual classes in template config.
- Keep dynamic content and fallback order in source arrays plus `loopConfig.bindings`.
- Prefer `loopConfig` for repeated sections over hardcoded IDs.
