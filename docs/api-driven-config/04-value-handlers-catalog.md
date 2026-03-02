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

### `coalesce`

- Purpose: return the first non-empty value.

### `upper` / `lower`

- Purpose: string casing.

### `language`

- Purpose: return the current language code.

### `langPick`

- Purpose: pick between two strings based on current language.
- Typical usage:

```text
set:config.label,langPick,Home,Inicio
```

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
