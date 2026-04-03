# Value Handler Catalog

This page is intended to be the **single source of truth** for what resolver IDs an AI assistant may use in `valueInstructions`.

## Rules

- A resolver must be:
  - registered via `provideValueHandlers()`
  - allowlisted in `DEFAULT_ALLOWED_VALUE_IDS`
- If it is not allowlisted, `ValueOrchestrator` ignores it.

## Allowlisted resolver IDs

Defined in `src/app/shared/services/value-orchestrator-allowlist.ts`.

### `i18n`

- Purpose: resolve a translation key to a string.
- Typical usage:

```text
set:config.text,i18n,hero.title
```

### `i18nParams`

- Purpose: resolve a translation with parameters.
- Usage depends on your `I18nService` implementation.

### `i18nGetIndex`

- Purpose: safely access array entries inside i18n payloads (avoids inline `[index]`).
- Typical usage:

```text
set:config.title,i18nGetIndex,features,0,title,''
```

### `literal`

- Purpose: return the first argument as-is.
- Useful for forcing a value through the orchestrator pipeline.

### `concat`

- Purpose: concatenate args into a string.

### `classJoin`

- Purpose: compose CSS classes from multiple arguments, removing empty values and duplicate tokens.
- Typical usage:

```text
set:config.classes,classJoin,literal,ank-display-flex ank-gap-1rem,var,hero.extraClasses
```

- Works well with intermediate values created by earlier `set:` commands:

```text
set:config.classes,classJoin,literal,ank-position-relative ank-inset-0,var,hero.dynamicClasses
```

### `when`

- Purpose: choose between two values using an existing condition DSL expression.
- Argument shape: `(conditionDsl, truthyValue, falsyValue)`
- Typical usage:

```text
set:config.classes,when,"all:hostGt,runtimeState.viewport.scrollY,16","ank-bg-HASH1C1C1C ank-color-white","ank-bg-bgColor ank-color-textColor"
```

- Best for dynamic classes.
- Best for switching labels or helper text.
- Best for choosing between two payload-safe values without adding specialized component config.

### `coalesce`

- Purpose: return the first non-empty value.

### `upper` / `lower`

- Purpose: string casing.

### `language`

- Purpose: return the current language code.

### `langPick`

- Purpose: pick a localized value based on current language.
- Supports legacy two-argument mode `(enValue, esValue)`.
- Supports locale-map mode when the first argument resolves to an object keyed by locale code.
- Typical legacy usage:

```text
set:config.label,langPick,Home,Inicio
```

- Typical locale-map usage:

```text
set:config.text,langPick,i18n,footer.copyright,Copyright Example. All rights reserved.
```

- Locale-map behavior:
  - checks exact locale first, for example `pt-BR`
  - falls back to base language, for example `pt`
  - then checks `default` or `fallback`
  - finally uses the optional second argument as the last fallback

### `theme`

- Purpose: return current theme mode.

### `themePick`

- Purpose: pick between two strings based on current theme.

### `scope`

- Purpose: read a value from the nearest `interaction-scope` using dot-path.
- Typical usage:

```text
set:config.src,scope,heroImageUpload.publicUrl
```

### `scopeOr`

- Purpose: read a scoped value and fallback when missing or null.
- Typical usage:

```text
set:config.text,scopeOr,heroImageUpload.error,Upload failed
```

### `var`

- Purpose: read a value from `variables` payload using dot-path.
- Typical usage:

```text
set:config.ariaLabel,var,ui.mobileMenuAriaLabel
```

### `varOr`

- Purpose: read a value from `variables` payload and fallback when missing/null.
- Typical usage:

```text
set:config.text,varOr,ui.brandTextFallback,Zoo Landing
```

### Stats counters

Stats counters no longer need dedicated value handlers.

Author plain config fields directly with `var` or `varOr`:

```text
set:config.target,var,statsCounters.avgTime.target;
set:config.min,var,statsCounters.avgTime.min;
set:config.max,var,statsCounters.avgTime.max;
set:config.formatMode,var,statsCounters.avgTime.formatMode;
set:config.formatPrefix,var,statsCounters.avgTime.formatPrefix;
set:config.formatSuffix,var,statsCounters.avgTime.formatSuffix
```

The `stats-counter` runtime now handles clamping and display formatting from those plain fields.

## Runtime settings

Shared runtime settings such as feature flags and storage slot names live in `site-config.json`, not in `valueInstructions`.

- Use `var` / `varOr` for page-owned values from `variables.json`.
- Use `scope` / `scopeOr` for local interaction state such as upload results, form fields, validation output, or transient UI state inside the nearest `interaction-scope`.
- Use `variables.appIdentity` for page-owned app metadata.
- Use `site-config.json` for `runtime.localStorage` and `runtime.features`.
- Use `host.runtimeState.*` when a value depends on shared browser state such as scroll position or viewport size.

## Adding a new handler (developer workflow)

1. Create a handler factory under:
   - `src/app/shared/utility/value-handler/handlers/`
2. Register it in:
   - `src/app/shared/utility/value-handler/provide-value-handlers.ts`
3. Allowlist it in:
   - `src/app/shared/services/value-orchestrator-allowlist.ts`

Keep new handlers:

- deterministic
- side-effect-free
- input-validated
