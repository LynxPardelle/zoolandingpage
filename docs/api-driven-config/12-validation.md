# Validation and Troubleshooting (Step 9)

This document describes runtime validation and common troubleshooting steps for API-driven configs.

## Runtime Validation

Payloads are validated at load time using lightweight type guards.

Primary validator file:

- [src/app/shared/utility/config-validation/config-payload.validators.ts](../../src/app/shared/utility/config-validation/config-payload.validators.ts)

If a payload fails validation, it is ignored and the bootstrap continues with the next stage.

## Common Issues

### Missing root components

Symptoms:

- The page renders blank or missing sections.

Checks:

- Verify `rootIds` in `page-config.json`.
- Ensure each ID exists in `components.json`.

### Combos not applied

Symptoms:

- Layout looks unstyled or missing combo effects.

Checks:

- Verify `angora-combos.json` is valid and non-empty.
- Ensure each combo entry is an array of class strings.

### Theme palette not applied

Symptoms:

- The draft renders with fallback Zoo colors instead of the draft brand palette.
- Theme toggle works, but the colors do not match the draft.

Checks:

- Verify `variables.theme.palettes.light` and `variables.theme.palettes.dark` both exist.
- Verify every palette includes all required keys: `bgColor`, `textColor`, `titleColor`, `linkColor`, `accentColor`, `secondaryBgColor`, `secondaryTextColor`, `secondaryTitleColor`, `secondaryLinkColor`, `secondaryAccentColor`.
- Verify `variables.theme.defaultMode` is `light`, `dark`, or `auto`.
- Verify modal accent overrides, if used, stay within `accentColor` or `secondaryAccentColor`.
- Hard refresh after switching drafts to confirm there is no stale palette state from a previous draft.

### i18n not loading

Symptoms:

- Raw keys appear in the UI.

Checks:

- Verify `i18n/{lang}.json` includes the `dictionary` field.
- Ensure `lang` param matches supported languages.

### Structured data missing

Symptoms:

- No JSON-LD entries in page source.

Checks:

- Verify `structured-data.json` contains a non-empty `entries` array.
- Confirm entries are valid schema.org JSON objects.

### loopConfig does not render generated children

Symptoms:

- Container renders but expected repeated items are missing.

Checks:

- Verify `loopConfig.templateId` exists in `components.json`.
- Verify `loopConfig.source` and required fields (`path` or `count`) are present.
- For `var`/`i18n` sources, ensure the resolved value is an array.
- Check console warnings from `ConfigurationsOrchestrator` for invalid loop sources/template IDs.

### Footer social links not visible

Symptoms:

- Footer social section is hidden or empty.

Checks:

- Verify `variables.footerConfig.showSocialLinks` is true.
- Verify `variables.footerSocialLinks` exists and is a non-empty array.
- Confirm each social entry has usable `url` and either `ariaLabelKey`/`labelKey` or fallback labels.
- Check for one-time warning: `variables.footerSocialLinks is empty. Footer social links will not render.`

### Footer/legal text missing after migration

Symptoms:

- Footer legal text/buttons are missing.
- Legal modal text or icons are empty.

Checks:

- Verify API i18n payload includes `footer.legal.*` and `footer.actions.close` keys.
- Verify legal modal icon keys exist: `footer.legal.terms.icon` and `footer.legal.data.icon`.
- Verify local fallback is intentionally not expected. Missing keys now surface directly as raw i18n key text or empty modal labels.
- Check orchestrator warning: `Missing API i18n footer legal keys. Legal links will remain hidden.`

### Raw i18n key text appears in the UI

Symptoms:

- Buttons, labels, or debug UI render values like `ui.debugPanel.analyticsLatest` or `ui.controls.languageToggle`.

Checks:

- Verify the active draft dictionary includes the exact key path being rendered.
- Verify `components.json` and handler-owned lookups still reference the intended key path (`processSection.*`, `ui.accessibility.*`, `ui.debugPanel.*`, etc.).
- Do not expect the runtime to fill missing keys from local TypeScript constants. Missing draft keys must be fixed in the draft payload itself.

### Footer does not render at all

Symptoms:

- Entire footer section is absent.

Checks:

- Verify `page-config.rootIds` includes `siteFooter`.
- Verify footer components are present in `components` payload.
- Verify `variables.footerConfig` is present and valid.

### Interactive process section is hidden

Symptoms:

- Process section does not render.

Checks:

- Verify `variables.processSection.steps` exists and is a non-empty array.
- Verify each step has either literal text or i18n keys for:
- `title` / `titleKey`
- `summary` / `summaryKey`
- `content` / `contentKey`
- `meta` / `metaKey`
- `detailItems` / `detailItemsKey` / `detailItemKeys`
- Verify any `*Key` values resolve in the active i18n dictionary.
- Verify `components.json` uses `config.itemsSource` / `config.tabsSource` for the process renderers instead of inline `set:config.items` or `set:config.tabs` mutations.

### Stats counters are not updating from variables

Symptoms:

- Stats counters show fallback values only.
- Stats counters stop rendering expected number formats.

Checks:

- Verify `variables.statsCounters` exists as an object.
- Verify each section (`visits`, `cta`, `avgTime`) uses numeric `target` and `durationMs`.
- Verify `formatMode` is a string (`number`, `suffix`, or `percent`).
- Verify `formatSuffix` is a string when `formatMode` is `suffix`.
- Verify stats counter `valueInstructions` include `varOr` + host fallback chain.
- Verify allowlist includes `numberClamp` and `statsFormatVar`.

### Input fields do not react to each other

Symptoms:

- One field updates, but sibling outputs or helper text do not react.

Checks:

- Verify the related components are rendered inside the same `interaction-scope` subtree.
- Verify `valueInstructions` use `scope` / `scopeOr` rather than `var` / `varOr` for local interaction state.
- Verify each `input` config has a non-empty `fieldId`.

### Interaction scope submission does nothing

Symptoms:

- Submit button renders, but no submit-side effects happen.

Checks:

- Verify the host component type is `interaction-scope` with `config.tag = 'form'` when using native submit buttons.
- Verify `config.submitEventInstructions` is present when submit should trigger orchestrated actions.
- Verify the relevant event handler IDs are allowlisted (`submitScope`, `resetScope`, `setScopeValue` when used).

### Computed outputs stay at zero or produce invalid values

Symptoms:

- Result text or stats counters never move off fallback values.

Checks:

- Verify each computation definition includes `resultId` and `initial`.
- Verify numeric steps use valid `field` or `literal` sources.
- Verify divide steps do not depend on a zero denominator unless the fallback behavior is intentional.

### labelKey / ariaLabelKey not applied

Symptoms:

- Social links show fallback labels instead of translated key values.

Checks:

- Verify each social link has valid `labelKey` / `ariaLabelKey`.
- Verify those keys exist in API i18n dictionary.
- If key values are absent, expected fallback precedence is used: `labelEs` / `labelEn` / `label`.

## Debug Tips

- Enable `environment.features.debugMode` in development.
- Watch console for `[ConfigBootstrap]` errors.
- Use the debug overlay to download draft payloads.
