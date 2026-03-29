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

## Implemented template materializers

- `link`
  - maps `url`, `icon`, `ariaLabel`, `target`, `rel`
- `generic-card` with `config.variant = "feature"`
  - maps `icon`, `title`, `description`, `benefits`, `buttonLabel`
  - if `buttonLabel` exists, binds CTA callback through orchestrator event dispatch
- `generic-card` with `config.variant = "testimonial"`
  - maps `name`, `role`, `company`, `content`, `rating`, `avatar`, `verified`

## Warnings and fallback behavior

- Missing template ID: warning + skip.
- `var`/`i18n` source not array: warning + skip.
- `socialLinks` missing/empty: warning + no social links rendered.

## Authoring guidance

- Keep templates minimal and deterministic.
- Put shared visual classes in template config.
- Keep dynamic content in source arrays (`variables` or `i18n`).
- Prefer `loopConfig` for repeated sections over hardcoded IDs.
