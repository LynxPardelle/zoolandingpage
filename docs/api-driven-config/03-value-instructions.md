# `valueInstructions` DSL

`valueInstructions` is the mechanism that replaces inline configuration lambdas.

Instead of:

```ts
config: {
  label: () => (language === 'en' ? 'Home' : 'Inicio');
}
```

You do:

```ts
valueInstructions: 'set:config.label,langPick,Home,Inicio',
config: { label: '' }
```

The value orchestrator will clone the component and set `config.label` to a **thunk** function that resolves at call-time.

## Implementation

- Orchestrator: `src/app/shared/services/value-orchestrator.ts`
- Allowlist: `src/app/shared/services/value-orchestrator-allowlist.ts`
- Handler registry: `src/app/shared/utility/value-handler/provide-value-handlers.ts`

## Command format

- Instructions are separated by `;`
- Only one command currently exists: `set`

General form:

```text
set:<destPath>,<resolverId>,<arg1>,<arg2>,...
```

Example (multiple updates in one string):

```text
set:config.items.0.label,langPick,Home,Inicio;
set:config.items.1.label,langPick,Benefits,Beneficios
```

## Destination path (`destPath`)

A dot path into the component object.

Typical destinations:

- `config.text`
- `config.label`
- `config.ariaLabel`
- `config.placeholder`

Array indexing is supported through numeric segments:

- `config.items.0.label`

## Resolver ID (`resolverId`)

Must be both:

- registered in `provideValueHandlers()`
- allowlisted by `DEFAULT_ALLOWED_VALUE_IDS`

If it is not allowlisted, the instruction is ignored.

## Arguments (`argN`)

Arguments are parsed as strings then resolved using simple rules:

- `true` / `false` → booleans
- numbers (e.g. `42`, `3.14`) → numbers
- `null` / `undefined` → those values
- `component.<path>` → read from the component object
- `config.<path>` → read from the component `config`
- `host.<path>` → read from the host object passed to `apply()`
- `env.<path>` → read from `environment`

### `eval:`

If an arg starts with `eval:`, it will evaluate a thunk-like field.

Example:

```text
set:config.text,concat,eval:config.prefix,' ',eval:config.suffix
```

This is mainly useful when earlier `set:` commands store functions and later commands need their _resolved values_ as inputs.

## Common patterns

### i18n

```ts
valueInstructions: 'set:config.text,i18n,hero.title',
config: { text: '' }
```

### i18n with params

```ts
valueInstructions: 'set:config.text,i18nParams,hero.subtitle,component.meta_title',
config: { text: '' }
```

(Exact param semantics depend on the `i18nParams` handler.)

### i18n array index access

Use `i18nGetIndex` to avoid inline `[index]` access:

```text
set:config.rating,i18nGetIndex,testimonials,2,rating,5
```

Meaning:

- key: `testimonials`
- index: `2`
- field: `rating`
- fallback: `5`

### Language picks

```text
set:config.label,langPick,Home,Inicio
```

### Theme picks

```text
set:config.classes,themePick,'btnLightClasses','btnDarkClasses'
```

## Authoring rules

- Prefer one `valueInstructions` string per component.
- Keep it stable and deterministic.
- Do not reference secrets in `env.*`.
- If you need a new kind of dynamic value, add a new handler + allowlist it (see [04-value-handlers-catalog.md](04-value-handlers-catalog.md)).
