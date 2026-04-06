# Condition Handlers Catalog

This is the allowlisted set of condition handlers for `condition` instructions.

## Core handlers

- `i18n,<key>`

  - True when the translated value exists and is not empty.
  - Example: `all:i18n,hero.subtitle`

- `modalRefId,<id>`
  - True when the active modal ref ID matches.
  - Example: `all:modalRefId,terms-of-service`

## Variable handlers

- `var,<path>`

  - Truthy check for variable/computed value by path.
  - Example: `all:var,ui.contact.whatsappPhone`

- `varEq,<path>,<value>` / `varNeq,<path>,<value>`

  - Equality / inequality checks.
  - Example: `all:varEq,theme.default,dark`

- `varGt,<path>,<value>` / `varGte,<path>,<value>` / `varLt,<path>,<value>` / `varLte,<path>,<value>`

  - Numeric comparisons.
  - Example: `all:varGt,metrics.minCards,0`

- `varIncludes,<path>,<value>`

  - Checks inclusion on array/string variables.
  - Example: `all:varIncludes,enabledSections,services`

- `varLenEq,<path>,<value>` / `varLenGt,<path>,<value>` / `varLenGte,<path>,<value>` / `varLenLt,<path>,<value>` / `varLenLte,<path>,<value>`
  - Length checks for arrays/strings.
  - Example: `all:varLenGt,socialLinks,0`

## Interaction scope handlers

- `scope,<path>`

  - Truthy check against the nearest `interaction-scope` value.
  - Example: `all:scope,heroImageUpload`

- `scopeEq,<path>,<value>` / `scopeNeq,<path>,<value>`

  - Equality / inequality checks against scoped runtime state.
  - Example: `all:scopeEq,heroImageUpload.status,success`

- `scopeGt,<path>,<value>` / `scopeGte,<path>,<value>` / `scopeLt,<path>,<value>` / `scopeLte,<path>,<value>`

  - Numeric comparisons against scoped values.
  - Example: `all:scopeGt,quoteForm.step,1`

- `scopeIncludes,<path>,<value>`

  - Checks inclusion on array/string scoped values.
  - Example: `all:scopeIncludes,selectedTags,featured`

- `scopeLenEq,<path>,<value>` / `scopeLenGt,<path>,<value>` / `scopeLenGte,<path>,<value>` / `scopeLenLt,<path>,<value>` / `scopeLenLte,<path>,<value>`
  - Length checks for arrays/strings in scope.
  - Example: `all:scopeLenGt,uploadedFiles,0`

## Host helpers

- `host,<path>`

  - Checks truthiness of a host value (dot-path or array index).
  - Example: `all:host,statsStripRemote.metrics`

- `hostEq,<path>,<value>`

  - Strict equality check against a parsed primitive.
  - Example: `all:hostEq,modalHostConfig.showCloseButton,true`

- `hostIncludes,<path>,<value>`

  - Checks `includes()` on string or array values.
  - Example: `all:hostIncludes,modalHostConfig.ariaLabel,Legal`

- `hostNeq,<path>,<value>`

  - Strict inequality check against a parsed primitive.
  - Example: `all:hostNeq,modalHostConfig.variant,sheet`

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
  - Example: `all:hostLenEq,devDemoControlsComponents,1`

- `hostLenGt,<path>,<value>`

  - Length greater than (string or array).
  - Example: `all:hostLenGt,devDemoControlsComponents,0`

- `hostLenGte,<path>,<value>`

  - Length greater than or equal (string or array).
  - Example: `all:hostLenGte,devDemoControlsComponents,1`

- `hostLenLt,<path>,<value>`

  - Length less than (string or array).
  - Example: `all:hostLenLt,devDemoControlsComponents,5`

- `hostLenLte,<path>,<value>`
  - Length less than or equal (string or array).
  - Example: `all:hostLenLte,devDemoControlsComponents,5`

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
