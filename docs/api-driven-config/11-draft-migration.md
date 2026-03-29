# Draft Migration Guide (Step 5)

This guide explains how to migrate the current TypeScript component registry into draft JSON files.

## Goal

Replace TS-defined component constants with JSON drafts stored in:

```
public/assets/drafts/{domain}/{pageId}/components.json
```

## How to Export

1. Run the app in development.
2. Use the debug overlay button **Download draft payloads**.
3. Replace the contents of:

```
public/assets/drafts/zoolandingpage.com.mx/default/components.json
```

with the downloaded `components.json` file.

## Notes

- The exported payload is sanitized: inline functions are removed.
- Use `valueInstructions` and `condition` DSLs to replace any runtime logic.
- Draft-owned modal host behavior should live in `variables.ui.modals`, for example legal modal sizes and aria-label translation keys keyed by modal ref ID.
- Navigation and dropdown entries should be authored in draft-native form. Prefer `value` plus `label` locale maps or `labelKey` / `ariaLabelKey`. Do not rely on legacy compatibility fields such as `labelEs`, `labelEn`, or `sectionId`.
- Validate the payload against:

```
docs/api-driven-config/schemas/components.schema.json
```

## Next Steps

- Move remaining page roots (rootIds + modalRootIds) into `page-config.json`.
- Keep locale availability under `variables.i18n.defaultLanguage` and `variables.i18n.supportedLanguages`; if a draft renders a language dropdown, define `ui.languageOptions` explicitly instead of relying on runtime backfills.
- Add SEO, structured data, and analytics configs per domain.
- Update the config in the API when ready for production.
