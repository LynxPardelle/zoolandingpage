# Draft Migration Guide (Step 5)

This guide explains how to migrate the current TypeScript component registry into draft JSON files.

## Goal

Replace TS-defined component constants with JSON drafts stored in:

```text
public/assets/drafts/{domain}/components.json
public/assets/drafts/{domain}/{pageId}/components.json
```

Use the domain-root file for shared site components and the page file for route-specific components.

Debug tooling now follows the same rule, but through a dedicated shared payload set:

```text
public/assets/drafts/_debug/debug-workspace/components.json
public/assets/drafts/_debug/debug-workspace/page-config.json
```

## How to Export

1. Run the app in development.
1. Prefer the debug overlay action that writes drafts to disk and choose:

```text
public/assets/drafts
```

1. The exporter now writes page-owned payloads directly into:

```text
public/assets/drafts/{domain}/{pageId}/page-config.json
public/assets/drafts/{domain}/{pageId}/components.json
```

and, when shared entries exist, it also writes:

```text
public/assets/drafts/{domain}/components.json
```

1. If the browser cannot write to disk, use the download fallback. Downloaded filenames flatten folder separators as `--`, for example:

```text
zoolandingpage.com.mx--default--components.json
zoolandingpage.com.mx--components.json
```

1. Keep using the domain-root file for shared site components and the page file for route-specific components.

## Notes

- The exported payload is sanitized: inline functions are removed.
- `components.json.components` is now an array of component objects; do not convert it back to a map keyed by id.
- Use `valueInstructions` and `condition` DSLs to replace any runtime logic.
- Move authored combo bundles into `angora-combos.json`. The runtime no longer carries hardcoded Zoolanding combo defaults in TypeScript.
- Move always-required site metadata into `site-config.json.site`: `appIdentity`, `theme`, and `i18n`.
- For multi-page domains, move repeated optional values into `site-config.json.defaults` and keep each page `variables.json` as a route-specific delta only.
- For debug workspace controls, use `host` conditions and `host` loop sources instead of inline builder callbacks.
- Draft-owned modal host behavior can live in `variables.ui.modals` when it is page-specific, but repeated modal host config should move to `site-config.json.defaults.ui.modals`.
- Shared modal defaults should now prefer `site-config.json.defaults.ui.modals._default`; per-page `variables.ui.modals` should override only what differs.
- Shared component drafts should use top-level `pageId: "allPages"` when authored at the domain root.
- Navigation and dropdown entries should be authored in draft-native form. Prefer `value` plus `label` locale maps or `labelKey` / `ariaLabelKey`. Do not rely on legacy compatibility fields such as `labelEs`, `labelEn`, or `sectionId`.
- If a page uses combo names in component classes, export and upload `angora-combos.json` together with the rest of the draft payloads.
- Validate the payload against:

```text
docs/api-driven-config/schemas/components.schema.json
```

## Next Steps

- Move remaining page roots (rootIds + modalRootIds) into `page-config.json`.
- Keep debug workspace roots and modal roots inside the dedicated `_debug/debug-workspace/page-config.json` payload instead of injecting them from runtime constants.
- Keep locale availability under `site-config.json.site.i18n.defaultLanguage` and `site-config.json.site.i18n.supportedLanguages`; if a page needs route-specific locale behavior, override it explicitly in `variables.json`.
- Add SEO, structured data, and analytics configs per domain.
- Update the config in the API when ready for production.
