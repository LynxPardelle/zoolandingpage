# Condition Instructions

The `condition` field supports a small DSL so components can be shown/hidden without inline functions.

## Syntax

`condition` is a semicolon-separated list of commands:

```
all:<handlerId>,<arg1>,<arg2>; any:<handlerId>,<arg1>; not:<handlerId>,<arg1>
```

Each command resolves a boolean using a registered condition handler.

## Examples

```ts
// Env flag
condition: 'all:env,features.debugMode';

// i18n key exists
condition: 'all:i18n,hero.subtitle';

// Modal content when a specific modal is open
condition: 'all:modalRefId,terms-of-service';

// Show social links only when enabled + links exist
condition: 'all:footerConfig,showSocialLinks; all:footerSocialLinks,exists';

// Host property truthy
condition: 'all:host,footerSocialLinks';

// Host property equals
condition: 'all:hostEq,footerConfig.showCopyright,true';

// Host property numeric comparisons
condition: 'all:hostGte,statsStripRemote.metrics.pageViews,100';

// Host string prefix/suffix
condition: 'all:hostStartsWith,footerTranslations.en.termsLink,Terms';
condition: 'all:hostEndsWith,footerTranslations.en.termsLink,Service';

// Host regex match
condition: 'all:hostRegex,footerTranslations.en.termsLink,^Terms,i';

// Host length checks (string or array)
condition: 'all:hostLenGt,footerSocialLinks,0';
```

## Notes

- Use the allowlisted handler IDs only.
- Prefer `all:` for most checks; use `any:` for OR logic and `not:` for negation.
- Keep conditions JSON-friendly (no inline lambdas).
