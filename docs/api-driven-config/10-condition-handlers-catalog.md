# Condition Handlers Catalog

This is the allowlisted set of condition handlers for `condition` instructions.

## Core handlers

- `env,<path>`

  - Reads from environment config using dot-path.
  - Example: `all:env,features.debugMode`

- `i18n,<key>`

  - True when the translated value exists and is not empty.
  - Example: `all:i18n,hero.subtitle`

- `footerConfig,<prop>`

  - Reads from the orchestrator's `footerConfig` object.
  - Example: `all:footerConfig,showLegalLinks`

- `footerSocialLinks,exists`

  - True when the footer social links array is non-empty.
  - Example: `all:footerSocialLinks,exists`

- `modalRefId,<id>`
  - True when the active modal ref ID matches.
  - Example: `all:modalRefId,terms-of-service`

## Host helpers

- `host,<path>`

  - Checks truthiness of a host value (dot-path or array index).
  - Example: `all:host,footerSocialLinks`

- `hostEq,<path>,<value>`

  - Strict equality check against a parsed primitive.
  - Example: `all:hostEq,footerConfig.showCopyright,true`

- `hostIncludes,<path>,<value>`

  - Checks `includes()` on string or array values.
  - Example: `all:hostIncludes,footerSocialLinks,Instagram`

- `hostNeq,<path>,<value>`

  - Strict inequality check against a parsed primitive.
  - Example: `all:hostNeq,footerConfig.showLegalLinks,false`

- `hostGt,<path>,<value>`

  - Numeric greater-than check.
  - Example: `all:hostGt,statsStripRemote.metrics.pageViews,100`

- `hostGte,<path>,<value>`

  - Numeric greater-than-or-equal check.
  - Example: `all:hostGte,statsStripRemote.metrics.pageViews,100`

- `hostLt,<path>,<value>`

  - Numeric less-than check.
  - Example: `all:hostLt,statsStripRemote.metrics.avgTimeSecs,300`

- `hostLte,<path>,<value>`

  - Numeric less-than-or-equal check.
  - Example: `all:hostLte,statsStripRemote.metrics.avgTimeSecs,300`

- `hostStartsWith,<path>,<value>`

  - Checks string prefix.
  - Example: `all:hostStartsWith,footerTranslations.en.termsLink,Terms`

- `hostEndsWith,<path>,<value>`

  - Checks string suffix.
  - Example: `all:hostEndsWith,footerTranslations.en.termsLink,Service`

- `hostRegex,<path>,<pattern>,<flags>`

  - Tests a string against a regex.
  - Example: `all:hostRegex,footerTranslations.en.termsLink,^Terms,i`

- `hostLenEq,<path>,<value>`

  - Length equals (string or array).
  - Example: `all:hostLenEq,footerSocialLinks,3`

- `hostLenGt,<path>,<value>`

  - Length greater than (string or array).
  - Example: `all:hostLenGt,footerSocialLinks,0`

- `hostLenGte,<path>,<value>`

  - Length greater than or equal (string or array).
  - Example: `all:hostLenGte,footerSocialLinks,1`

- `hostLenLt,<path>,<value>`

  - Length less than (string or array).
  - Example: `all:hostLenLt,footerSocialLinks,5`

- `hostLenLte,<path>,<value>`
  - Length less than or equal (string or array).
  - Example: `all:hostLenLte,footerSocialLinks,5`

## Utility handlers

These can be used directly in `condition` when you need fixed comparisons.

- `true` / `false`
- `always` / `never`
- `exists,<value>`
- `empty,<value>`
- `eq,<a>,<b>`
- `neq,<a>,<b>`
- `gt,<a>,<b>`
- `lt,<a>,<b>`
- `gte,<a>,<b>`
- `lte,<a>,<b>`
- `type,<value>,<type>`
