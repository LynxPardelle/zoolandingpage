# Draft Migration Guide (Step 5)

This guide explains how to migrate the current TypeScript component registry into draft JSON files.

## Goal

Replace TS-defined component constants with JSON drafts stored in:

```
public/assets/drafts/{domain}/{pageId}/components.json
```

Debug tooling now follows the same rule, but through a dedicated shared payload set:

```
public/assets/drafts/_debug/debug-workspace/components.json
public/assets/drafts/_debug/debug-workspace/page-config.json
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
- Move authored combo bundles into `angora-combos.json`. The runtime no longer carries hardcoded Zoolanding combo defaults in TypeScript.
- Move always-required site metadata into `site-config.json.site`: `appIdentity`, `theme`, and `i18n`.
- For multi-page domains, move repeated optional values into `site-config.json.defaults` and keep each page `variables.json` as a route-specific delta only.
- For debug workspace controls, use `host` conditions and `host` loop sources instead of inline builder callbacks.
- Draft-owned modal host behavior can live in `variables.ui.modals` when it is page-specific, but repeated modal host config should move to `site-config.json.defaults.ui.modals`.
- Shared modal defaults should now prefer `site-config.json.defaults.ui.modals._default`; per-page `variables.ui.modals` should override only what differs.
- Navigation and dropdown entries should be authored in draft-native form. Prefer `value` plus `label` locale maps or `labelKey` / `ariaLabelKey`. Do not rely on legacy compatibility fields such as `labelEs`, `labelEn`, or `sectionId`.
- If a page uses combo names in component classes, export and upload `angora-combos.json` together with the rest of the draft payloads.
- Validate the payload against:

```
docs/api-driven-config/schemas/components.schema.json
```

## Next Steps

- Move remaining page roots (rootIds + modalRootIds) into `page-config.json`.
- Keep debug workspace roots and modal roots inside the dedicated `_debug/debug-workspace/page-config.json` payload instead of injecting them from runtime constants.
- Keep locale availability under `site-config.json.site.i18n.defaultLanguage` and `site-config.json.site.i18n.supportedLanguages`; if a page needs route-specific locale behavior, override it explicitly in `variables.json`.
- Add SEO, structured data, and analytics configs per domain.
- Update the config in the API when ready for production.
