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
- Confirm each social entry has usable `url` and `ariaLabel` values.
- Check for one-time warning: `variables.footerSocialLinks is empty. Footer social links will not render.`

## Debug Tips

- Enable `environment.features.debugMode` in development.
- Watch console for `[ConfigBootstrap]` errors.
- Use the debug overlay to download draft payloads.
