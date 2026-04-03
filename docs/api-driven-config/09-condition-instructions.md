# Condition Instructions

The `condition` field supports a small DSL so components can be shown/hidden without inline functions.

## Syntax

`condition` is a semicolon-separated list of commands:

```text
all:<handlerId>,<arg1>,<arg2>; any:<handlerId>,<arg1>; not:<handlerId>,<arg1>
```

Each command resolves a boolean using a registered condition handler.

## Examples

```ts
// i18n key exists
condition: 'all:i18n,hero.subtitle';

// Modal content when a specific modal is open
condition: 'all:modalRefId,terms-of-service';

// Show social links only when the draft payload exposes entries
condition: 'all:varLenGt,socialLinks,0';

// Show draft-owned CTA only when the payload exposes a target
condition: 'all:var,ctaTargets.primaryUrl';

// Host property truthy
condition: 'all:host,statsStripRemote.metrics';

// Host property equals
condition: 'all:hostEq,modalHostConfig.showCloseButton,true';

// Host property numeric comparisons
condition: 'all:hostGte,statsStripRemote.metrics.pageViews,100';

// Shared browser runtime state
condition: 'all:hostGt,runtimeState.viewport.scrollY,16';

// Host string prefix/suffix
condition: 'all:hostStartsWith,footerTranslations.en.termsLink,Terms';
condition: 'all:hostEndsWith,footerTranslations.en.termsLink,Service';

// Host regex match
condition: 'all:hostRegex,footerTranslations.en.termsLink,^Terms,i';

// Host length checks (string or array)
condition: 'all:hostLenGt,devDemoControlsComponents,0';
```

## Notes

- Use the allowlisted handler IDs only.
- Prefer `all:` for most checks; use `any:` for OR logic and `not:` for negation.
- Keep conditions JSON-friendly (no inline lambdas).
- The host passed to conditions can expose shared runtime data, including `runtimeState.viewport.*` and `runtimeState.document.*`.
- When the same condition should drive a value instead of visibility, use that same DSL string inside the `when` value resolver.
