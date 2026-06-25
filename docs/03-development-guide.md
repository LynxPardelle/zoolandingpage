# Development Guide

This guide covers the current day-to-day development workflow for Zoolandingpage.

## Development modes

The frontend can work in two different config modes:

1. `Local draft mode`
   The app loads JSON from `drafts/{domain}/...`, served locally at `/drafts/...`.
2. `Runtime API mode`
   The app loads one `TRuntimeBundlePayload` from the runtime API.

For most feature work, local draft mode is the safest place to start.

## Recommended local workflow

1. Start the app locally.
2. Read [../ai-notes/README.md](../ai-notes/README.md) plus the relevant committed note before making changes.
3. Open the target draft with explicit `draftDomain` and `draftPageId` query parameters.
4. Inspect `drafts/{domain}/ai_notes/`, `drafts/{domain}/findings/`, and `drafts/{domain}/errors-reports/` if they exist for the draft you are changing.
5. Edit the local draft files under `drafts`.
6. Refresh and verify the page locally.
7. If needed, pull from or push to the authoring API with `tools/config-draft-sync.mjs`.
8. Publish only after the authoring draft is correct.
9. Distill durable learnings back into the canonical AI notes before closing the task.

## Canonical AI Notes Workflow

- Curated long-lived guidance lives in [../ai-notes/README.md](../ai-notes/README.md).
- `drafts/{domain}/ai_notes/`, `drafts/{domain}/findings/`, and `drafts/{domain}/errors-reports/` hold local draft-specific history, investigation, and incident notes.
- If repo-level local-only scratch is needed, keep it untracked under `devonly/`.
- If a task discovers a reusable baseline, routing rule, embed limitation, readiness gate, or workflow improvement, promote it into the canonical folder.

## Local draft preview

The runtime resolves draft identity from the browser URL.

Supported query parameters:

- `draftDomain`
- `draftPageId`

Examples:

```text
http://127.0.0.1:4200/?draftDomain=zoolandingpage.com.mx&draftPageId=default
http://127.0.0.1:4200/?draftDomain=test.zoolandingpage.com.mx&draftPageId=default
```

If you omit `draftDomain` on localhost, you can end up exercising fallback behavior instead of the draft you intended to test.

## Draft file ownership

Use the domain root for shared defaults and the page root for route-specific data.

```text
drafts/
  {domain}/
   ai_notes/
   findings/
   errors-reports/
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

Practical ownership rules:

- `site-config.json`: domain routing, site metadata, runtime settings, shared defaults.
- Domain-root `components.json`: shared components used across pages.
- `page-config.json`: page roots plus page-level SEO, structured data, and analytics.
- Page-root `components.json`: page-specific component overrides.
- `variables.json`, `angora-combos.json`, `i18n/*.json`: shared at domain root, overridden at page root.

## Canonical draft CLI

The canonical CLI is:

```bash
node tools/config-draft-sync.mjs help
```

Supported commands:

- `pack`
- `unpack`
- `pull`
- `push`
- `create`
- `publish`

The `package.json` scripts wrap the same commands, but the direct `node` form is the clearest way to supply explicit endpoint and domain arguments.

## Common authoring operations

### Pull a draft from the authoring API

```bash
node tools/config-draft-sync.mjs pull --endpoint=https://api.zoolandingpage.com.mx/config-authoring --domain=zoolandingpage.com.mx
```

### Push the current local draft back to the authoring API

```bash
node tools/config-draft-sync.mjs push --endpoint=https://api.zoolandingpage.com.mx/config-authoring --domain=zoolandingpage.com.mx --updated-by="Your Name"
```

### Create a new site in the authoring API from an existing local draft tree

```bash
node tools/config-draft-sync.mjs create --endpoint=https://api.zoolandingpage.com.mx/config-authoring --domain=newsite.example --publish-on-create=false
```

### Publish the current authoring draft

```bash
node tools/config-draft-sync.mjs publish --endpoint=https://api.zoolandingpage.com.mx/config-authoring --domain=zoolandingpage.com.mx --updated-by="Your Name"
```

## When to use each command

- `pull`: replace your local draft tree with the current draft or published state from the API.
- `pack`: build a local `TAuthoringDraftPackage` JSON file from the draft tree.
- `push`: update the authoring draft stored by the API.
- `create`: create a new site in the authoring system from a local draft tree.
- `publish`: promote the current authoring draft to published runtime state.

## Local QA checklist

1. Confirm the URL points at the intended `draftDomain` and `draftPageId`.
2. Confirm shared and page-specific sections render correctly.
3. Confirm language switching and localized SEO behave as expected.
4. Confirm CTA actions and modal actions still work.
5. Confirm the page looks correct in light and dark themes.
6. Confirm uploaded public assets load through their final public URLs.

## Troubleshooting state mismatches

Use this order when a change is “missing”:

1. Check the local file under `drafts`.
2. Check whether the authoring draft was pushed.
3. Check whether that draft was published.
4. Check the runtime bundle response for the live domain.
5. Check whether the deployed frontend build or cache is still serving stale assets.

This distinction matters because a successful publish does not guarantee that the live app tier is already serving the newest frontend assets or cache state.

## Working with public assets

Public media is uploaded separately from config payloads. Do not try to store binary files inside draft packages.

Use the hub upload tool with a temporary upload grant:

```bash
node tools/upload-draft-asset.mjs --domain=zoolandingpage.com.mx --page=default --kind=hero-images --id=headline-art --file="./local/headline-art.webp" --grant-file=".zlp/upload-grants/zoolandingpage-com.token"
```

Save the returned `publicUrl` into the draft payload field that needs it. Never save upload grants, signed upload URLs, or local file paths into draft JSON.

For the full flow, read [11-draft-lifecycle.md](11-draft-lifecycle.md) and [12-public-assets-and-file-uploads.md](12-public-assets-and-file-uploads.md).

## Related references

- [02-architecture.md](02-architecture.md)
- [06-deployment.md](06-deployment.md)
- [11-draft-lifecycle.md](11-draft-lifecycle.md)
- [12-public-assets-and-file-uploads.md](12-public-assets-and-file-uploads.md)
- [api-driven-config/README.md](api-driven-config/README.md)
