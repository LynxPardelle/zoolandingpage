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

Important distinction:

- Payload authors still provide JSON-serializable placeholders in `config`.
- The runtime thunk is created by the orchestrator after load.
- Shared render components may resolve those runtime thunks, but authored drafts and API payloads must never include functions directly.

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

If an argument itself contains commas or semicolons, wrap it in double quotes so the DSL keeps it as one argument.

Example:

```text
set:config.classes,when,"all:hostGt,runtimeState.viewport.scrollY,16","ank-bg-HASH1C1C1C ank-color-white","ank-bg-bgColor ank-color-textColor"
```

Use doubled quotes inside a quoted argument when you need a literal quote character.

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

### Dynamic classes with `classJoin`

Use `classJoin` when you need to compose base classes and optional dynamic class fragments.

```text
set:config.classes,classJoin,literal,ank-position-absolute ank-inset-0 ank-bgCover ank-borderRadius-1rem,var,hero.extraClasses
```

### Conditional values with `when`

Use `when` when a field should switch between two values based on an existing condition DSL expression.

```text
set:config.classes,when,"all:hostGt,runtimeState.viewport.scrollY,16","ank-bg-HASH1C1C1C ank-color-white","ank-bg-bgColor ank-color-textColor"
```

This is the preferred pattern when a component should change classes or text based on scroll state, host state, or any other condition that the condition DSL already supports.

### Host runtime state

The wrapper host exposes shared runtime state to both `condition` and `valueInstructions` through `host.*` paths.

Useful paths include:

- `host.runtimeState.viewport.scrollY`
- `host.runtimeState.viewport.scrollX`
- `host.runtimeState.viewport.width`
- `host.runtimeState.viewport.height`
- `host.runtimeState.document.scrollHeight`
- `host.runtimeState.document.clientHeight`

That makes scroll-driven styling possible without adding component-specific config fields.

### Stats counters with variables

Bind plain stats-counter config fields directly from `variables.statsCounters`.

```text
set:config.target,var,statsCounters.visits.target;
set:config.durationMs,var,statsCounters.visits.durationMs;
set:config.ariaLabel,i18n,statsStrip.visitsLabel;
set:config.formatMode,var,statsCounters.visits.formatMode;
set:config.formatPrefix,var,statsCounters.visits.formatPrefix;
set:config.formatSuffix,var,statsCounters.visits.formatSuffix
```

Average-time counters can bind clamp bounds directly as part of the component config:

```text
set:config.target,var,statsCounters.avgTime.target;
set:config.min,var,statsCounters.avgTime.min;
set:config.max,var,statsCounters.avgTime.max;
set:config.durationMs,var,statsCounters.avgTime.durationMs;
set:config.formatMode,var,statsCounters.avgTime.formatMode;
set:config.formatSuffix,var,statsCounters.avgTime.formatSuffix
```

Recommended variables payload shape:

```json
{
  "statsCounters": {
    "visits": {
      "target": 12450,
      "durationMs": 1600,
      "formatMode": "number",
      "formatSuffix": ""
    },
    "cta": {
      "target": 370,
      "durationMs": 1800,
      "formatMode": "number",
      "formatSuffix": ""
    },
    "avgTime": {
      "target": 312,
      "durationMs": 2000,
      "min": 0,
      "max": 999999,
      "formatMode": "suffix",
      "formatSuffix": "s"
    }
  }
}
```

Why this pattern:

- keeps component stores declarative (no service calls inside config stores)
- keeps stats-counter payloads JSON-safe end to end
- avoids draft-specific host fallback bridges or temporary config fields

### Scoped interaction state

Use `scope` or `scopeOr` inside an `interaction-scope` subtree when a component needs live field values, validation state, or computed outputs.

Examples:

```text
set:config.helperText,scopeOr,fields.email.errors.0,''
set:config.text,scopeOr,computed.monthlyIncrease,0
set:config.ariaLabel,scope,meta.scopeId
```

Available path roots inside a scope:

- `values.<fieldId>`
- `fields.<fieldId>.value`
- `fields.<fieldId>.errors`
- `fields.<fieldId>.valid`
- `computed.<resultId>`
- `meta.scopeId`
- `meta.submitted`
- `meta.valid`

If there is no active `interaction-scope` host, `scope` resolves to `undefined` and `scopeOr` falls back to its second argument.

## Authoring rules

- Prefer one `valueInstructions` string per component.
- Keep it stable and deterministic.
- Prefer `valueInstructions` plus existing condition handlers over adding one-off component config fields for dynamic behavior.
- Do not reference secrets in `env.*`.
- If you need a new kind of dynamic value, add a new handler + allowlist it (see [04-value-handlers-catalog.md](04-value-handlers-catalog.md)).
