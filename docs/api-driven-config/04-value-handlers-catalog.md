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

### `env`

- Purpose: read values from `environment`.
- Example:

```text
set:config.href,env,links.whatsApp
```

### `envOr`

- Purpose: read `env.<path>` and fallback.

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

### `numberClamp`

- Purpose: clamp a numeric value between min/max bounds.
- Typical usage:

```text
set:config.target,numberClamp,eval:config.target,284,600
```

### `statsFormatVar`

- Purpose: build a stats-counter formatter function from variables payload paths.
- Args:
  - `modePath` (variables path for mode: `number`, `suffix`, `percent`, `prefix`, `prefixSuffix`)
  - `fallbackMode`
  - `suffixPath` (variables path for suffix)
  - `fallbackSuffix`
  - `prefixPath` (variables path for prefix)
  - `fallbackPrefix`
- Notes:
  - `number` mode preserves localized number formatting and appends suffix when present.
  - Numeric HTML entities in suffix (for example `&#43;`) are decoded.
- Typical usage:

```text
set:config.format,statsFormatVar,statsCounters.avgTime.formatMode,suffix,statsCounters.avgTime.formatSuffix,s
```

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
