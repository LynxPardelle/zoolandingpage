# Developer Onboarding

This guide is the fastest path for a new developer to become productive in the Zoolanding platform.

## First-day goal

By the end of this guide you should be able to:

1. Run the Angular app locally.
2. Open a specific draft by `domain` and `pageId`.
3. Understand the difference between local drafts, authoring drafts, and published runtime state.
4. Know where to look when a landing page change is not showing up.

## Prerequisites

- Docker Desktop if you want the recommended development path.
- Node.js if you want to run the Angular dev server or the draft CLI directly outside Docker.
- Git access to this repo.
- Access to the relevant API endpoints if you need to pull, push, or publish drafts.

## Start the app

Recommended path:

```bash
make dev
```

Alternative local path:

```bash
npm install
npm start
```

## Understand the three states first

Before touching any landing page config, keep these states separate:

1. `Local draft files`
   Files under `public/assets/drafts/{domain}/...` in your working copy.
2. `Authoring draft state`
   The draft stored in the authoring API for a domain.
3. `Published runtime state`
   The version returned by the runtime API to live domains.

If you change a local file and a live site does not change, that is expected until the draft is pushed and published. If you publish successfully and the live site still shows old content, the issue is usually cache, deployment, or app/runtime mismatch rather than missing authoring data.

## Open a local draft

Use explicit query parameters so draft resolution is unambiguous:

```text
http://127.0.0.1:4200/?draftDomain=zoolandingpage.com.mx&draftPageId=default
```

You can swap only the values after `draftDomain` and `draftPageId` to move between sites and pages.

## Learn the draft file layout

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

Domain-root files are shared defaults. Page-root files override them for one route.

## Know the important docs

Read these in order:

1. [02-architecture.md](02-architecture.md)
2. [03-development-guide.md](03-development-guide.md)
3. [11-draft-lifecycle.md](11-draft-lifecycle.md)
4. [12-public-assets-and-file-uploads.md](12-public-assets-and-file-uploads.md)
5. [api-driven-config/README.md](api-driven-config/README.md)

If you are touching analytics or stats integrations, also read:

- [05-analytics-tracking.md](05-analytics-tracking.md)
- [08-data-dropper-lambda.md](08-data-dropper-lambda.md)
- [09-quick-stats-lambda.md](09-quick-stats-lambda.md)

## First useful commands

Inspect the draft CLI:

```bash
node tools/config-draft-sync.mjs help
```

Pull the current authoring draft into your local `public/assets/drafts` tree:

```bash
node tools/config-draft-sync.mjs pull --endpoint=https://api.zoolandingpage.com.mx/config-authoring --domain=zoolandingpage.com.mx
```

Push local changes back to the authoring draft:

```bash
node tools/config-draft-sync.mjs push --endpoint=https://api.zoolandingpage.com.mx/config-authoring --domain=zoolandingpage.com.mx --updated-by="Your Name"
```

Publish the current authoring draft:

```bash
node tools/config-draft-sync.mjs publish --endpoint=https://api.zoolandingpage.com.mx/config-authoring --domain=zoolandingpage.com.mx --updated-by="Your Name"
```

## Where to debug each problem

Use this quick decision table:

- Local preview is wrong: check `public/assets/drafts`, the draft URL, and runtime validation errors.
- Pull or push fails: check the authoring endpoint, CLI arguments, and the current package shape.
- Publish succeeds but live content is stale: compare runtime bundle output with the deployed frontend/app behavior.
- Images or media do not load: check the public asset URL, upload key, CDN path, and bucket/CORS configuration.
- Analytics calls fail: check `environment.apiUrl`, consent/runtime settings, and the Lambda repos.

## Key folders and services

- `src/app/shared/services/config-bootstrap.service.ts`: loads and validates payloads.
- `src/app/shared/services/config-source.service.ts`: chooses local drafts or API-backed config.
- `src/app/shared/services/draft-runtime.service.ts`: resolves active draft domain and page.
- `src/app/shared/services/seo-metadata.service.ts`: applies title, meta, and locale metadata.
- `src/app/shared/services/analytics.service.ts`: analytics transport and consent flow.
- `tools/config-draft-sync.mjs`: local draft round-trip CLI.

## Related repos

Current workspace repos:

- `../zoolanding-data-dropper-lambda`
- `../zoolanding-quick-stats-lambda`

Other platform repos used by this app:

- `../zoolanding-config-authoring`
- `../zoolanding-config-runtime-read`
- `../zoolanding-image-upload`

## First safe exercise

If you are new to the platform, use this sequence:

1. Pull the current draft for `zoolandingpage.com.mx`.
2. Open it locally with `draftDomain` and `draftPageId`.
3. Change a single text value in `i18n/en.json` or `i18n/es.json`.
4. Refresh the local page and confirm the change.
5. Revert the change or continue with a real task.

That gives you the smallest possible round-trip without risking live state.
