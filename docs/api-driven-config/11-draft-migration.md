# Draft Filesystem Reference

This document explains the current local draft structure and how it maps to the authoring package used by the backend.

The original migration from TypeScript-owned component constants to JSON drafts is complete enough that new work should treat the draft filesystem as the normal authoring model, not as a temporary export target.

## Draft root layout

```text
public/assets/drafts/
  {domain}/
    site-config.json
    components.json
    variables.json
    angora-combos.json
    i18n/{lang}.json
    {pageId}/
      page-config.json
      components.json
      variables.json
      angora-combos.json
      i18n/{lang}.json
```

## Shared versus page-owned files

### Shared domain files

Use the domain root for values reused across multiple routes in the same site:

- `site-config.json`
- domain-root `components.json`
- domain-root `variables.json`
- domain-root `angora-combos.json`
- domain-root `i18n/{lang}.json`

### Page-owned files

Use the page root for route-specific data:

- `{pageId}/page-config.json`
- `{pageId}/components.json`
- `{pageId}/variables.json`
- `{pageId}/angora-combos.json`
- `{pageId}/i18n/{lang}.json`

## Practical minimum for a new site

In practice, start with these files:

- `{domain}/site-config.json`
- `{domain}/{pageId}/page-config.json`
- `{domain}/{pageId}/components.json`

Then add these as needed:

- shared `components.json` when the site has common header/footer/shared UI
- `variables.json` when the draft uses structured data instead of hardcoded content in components
- `angora-combos.json` when classes refer to authored combo keys
- `i18n/{lang}.json` when the page uses translated copy

## Merge behavior

- shared components are loaded first; page components win on `id` collision
- shared variables, combos, and i18n dictionaries are loaded first; page values win on collision
- `site-config.json` does not get replaced by `page-config.json`; they have separate responsibilities

## Export and import alignment

The local CLI and the backend authoring API now assume the same file-oriented model.

That means the filesystem layout above maps directly to `TAuthoringDraftPackage.files[]` entries. Each JSON file keeps its own path and content instead of being flattened into one custom transport bundle.

## Legacy export note

If you still use the debug/export tooling in the browser, treat it as a convenience path only. The normal long-term workflow is:

1. author local files in `public/assets/drafts`
2. preview locally
3. push with `tools/config-draft-sync.mjs`
4. publish when ready

## Validation reminders

- keep component IDs unique after shared and page files are merged
- keep page roots in `page-config.json`, not in runtime code
- keep binary assets out of config files
- keep site-wide routing and runtime defaults in `site-config.json`
- keep page-specific SEO and analytics in `page-config.json`

## Related docs

- [../11-draft-lifecycle.md](../11-draft-lifecycle.md)
- [08-upload-to-api.md](08-upload-to-api.md)
- [12-validation.md](12-validation.md)
