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

### Stats counters with variables + fallback chain

Use `varOr` with host fallbacks to keep counters resilient when the variables payload is incomplete.

```text
set:config.target,varOr,statsCounters.visits.target,eval:host.statsStripVisitsFallback;
set:config.durationMs,varOr,statsCounters.visits.durationMs,1600;
set:config.ariaLabel,i18n,statsStrip.visitsLabel;
set:config.format,statsFormatVar,statsCounters.visits.formatMode,number,statsCounters.visits.formatSuffix
```

Average-time counters can apply normalization after target resolution:

```text
set:config.target,varOr,statsCounters.avgTime.target,eval:host.statsStripAverageTimeFallback;
set:config.minClamp,varOr,statsCounters.avgTime.min,0;
set:config.maxClamp,varOr,statsCounters.avgTime.max,999999;
set:config.target,numberClamp,eval:config.target,eval:config.minClamp,eval:config.maxClamp;
set:config.format,statsFormatVar,statsCounters.avgTime.formatMode,suffix,statsCounters.avgTime.formatSuffix,s
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
- avoids malformed class strings when one fragment is empty
- scales to multiple dynamic class fragments with stable output

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
- Do not reference secrets in `env.*`.
- If you need a new kind of dynamic value, add a new handler + allowlist it (see [04-value-handlers-catalog.md](04-value-handlers-catalog.md)).
