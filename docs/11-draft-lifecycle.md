# Draft Lifecycle

This guide explains how to create, preview, update, upload, and publish Zoolanding drafts.

## The three states to keep separate

Every draft exists in three possible states:

1. `Local draft files`
   Your working copy in `drafts/{domain}/...`, served locally at `/drafts/...`.
2. `Authoring draft state`
   The draft stored in the config authoring API.
3. `Published runtime state`
   The version currently returned by the runtime API for live domains.

Do not treat those as the same thing. A local file edit affects only state 1 until you push and publish it.

## Read The Canonical Notes First

Before starting a new draft or major refinement pass, read:

1. [../Codex.md](../Codex.md)
2. [../ai-notes/README.md](../ai-notes/README.md)
3. the relevant committed note under `ai-notes/`
4. `drafts/{domain}/ai_notes/`, `drafts/{domain}/findings/`, and `drafts/{domain}/errors-reports/` if the task depends on an existing local draft

After durable work, update the canonical notes so future agents do not have to rediscover the same rules.

## Local draft structure

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

Domain-root files provide shared defaults. Page-root files override them for one route.

## Create a new draft locally

The current platform does not have a separate scaffold generator for local files. The practical path is:

1. Create a new domain folder under `drafts/{domain}`.
2. Add `site-config.json` for the new domain.
3. Declare at least one managed alias under `*.zoolandingpage.com.mx` in `site-config.json.aliases`, for example `brand.zoolandingpage.com.mx`.
4. If the branded domain is not live yet, point `site.seo.canonicalOrigin` and each page `seo.canonical` URL at that Zoolanding alias until cutover.
5. Create at least one page folder such as `default`.
6. Add `page-config.json` and `components.json` for that page.
7. Add `variables.json`, `angora-combos.json`, and `i18n/*.json` only when the draft needs them.
8. Create `ai_notes/`, `findings/`, and `errors-reports/` only when the draft needs local history, investigation, or incident tracking that should stay out of the committed canonical notes.

For a shared header/footer or repeated site UI, use the domain-root `components.json` instead of duplicating the same component definitions across pages.

Draft-authored navigation and CTA links should be production-safe relative paths such as `/contact` or `/servicios`. Reserve `draftDomain` and `draftPageId` query parameters for local preview URLs, not authored site navigation.

## Preview a draft locally

Open the app with explicit draft query parameters:

```text
http://127.0.0.1:4200/?draftDomain=zoolandingpage.com.mx&draftPageId=default
http://127.0.0.1:4200/?draftDomain=newsite.example&draftPageId=default
```

If you are using the Docker dev server on another port, keep the same query parameters and only change the host/port.

## Smoke-check local drafts against live aliases

Once your local dev server is running, you can automate the same browser-level smoke checks that are usually done manually:

```bash
node tools/draft-smoke-check.mjs --local-base-url=http://127.0.0.1:4200
```

What this script validates:

1. every local draft route renders a non-empty title and a first heading
2. the local preview does not fall into the `Unresolved draft` fallback
3. any draft with a managed `*.zoolandingpage.com.mx` alias matches its live counterpart for title, first heading, and key header controls such as the search trigger and mobile navigation trigger

Useful options:

- `--domain=example.com` to limit the run to one draft; repeat the flag for multiple drafts
- `--browser-path=...` if Chromium is not installed in a default location
- `--output=reports/draft-smoke.json` to save the structured report to disk

The structured JSON report records both desktop and mobile viewport results for every checked route.

Before closing draft-affecting work, also open every affected draft route in browser QA on both desktop and mobile viewports, fix any visible, runtime, console, or network issue you find there, and rerun the impacted checks.

## Inspect the current CLI

Use the built-in help first:

```bash
node tools/config-draft-sync.mjs help
```

Supported commands today:

- `pack`
- `unpack`
- `pull`
- `push`
- `create`
- `publish`

## Pull an existing draft from the API

This replaces your local draft tree with the current API state for that domain.

```bash
node tools/config-draft-sync.mjs pull --endpoint=https://api.zoolandingpage.com.mx/config-authoring --domain=zoolandingpage.com.mx
```

Use `--stage=published` if you need the published state instead of the current draft.

## Pack a local draft into a file

This is useful for inspection or manual API calls.

```bash
node tools/config-draft-sync.mjs pack --domain=zoolandingpage.com.mx --output=.tmp-zoolanding-draft-package.json
```

## Push local changes to the authoring draft

```bash
node tools/config-draft-sync.mjs push --endpoint=https://api.zoolandingpage.com.mx/config-authoring --domain=zoolandingpage.com.mx --updated-by="Your Name"
```

Use this after local QA is correct and you want the backend draft state to match your working copy.

## Create a new site in the authoring API

If the site does not exist yet in the backend, use `create` instead of `push`.

```bash
node tools/config-draft-sync.mjs create --endpoint=https://api.zoolandingpage.com.mx/config-authoring --domain=newsite.example --publish-on-create=false
```

That command uploads the local file tree as a new authoring draft. It does not require a separate manual package-building step.

## Publish the current authoring draft

```bash
node tools/config-draft-sync.mjs publish --endpoint=https://api.zoolandingpage.com.mx/config-authoring --domain=zoolandingpage.com.mx --updated-by="Your Name"
```

Publishing changes the authoring state only insofar as it promotes the current draft to the published version pointer. It does not guarantee that live frontend caches or deployments have already refreshed.

If the custom-domain authoring endpoint resets the connection during publish, retry the same `publishDraft` request through the raw API Gateway endpoint documented in [06-deployment.md](06-deployment.md). If the raw endpoint succeeds, the problem is in the API front door, not in the authoring Lambda action itself.

## Recommended workflows

### Update an existing site

1. Pull the latest draft.
2. Read the relevant committed notes and inspect the local draft `ai_notes/`, `findings/`, and `errors-reports/` folders when they exist.
3. Edit local files.
4. Preview locally.
5. Push the local draft.
6. Publish it.
7. Validate the runtime bundle and the live site separately.
8. Record durable learnings in the canonical AI notes.

### Create a new site

1. Create the local draft tree.
2. Create local `ai_notes/`, `findings/`, and `errors-reports/` folders only if the draft needs local history, investigation, or incident tracking.
3. Preview locally.
4. Upload any required public assets.
5. Create the site in the authoring API.
6. Publish it.
7. Validate the runtime bundle and then validate the live site.
8. Distill reusable guidance from the new draft into `ai-notes/`.

## What to check when a published change is not visible

Use this order:

1. check the local draft file you edited
2. check the authoring draft with `getSite` or `pull`
3. check that the draft was published
4. check the runtime bundle response for the domain
5. check frontend deployment and cache behavior

If the runtime bundle is correct and the live page is still wrong, you are usually looking at a frontend deployment or cache problem, not a missing publish.

## Related docs

- [03-development-guide.md](03-development-guide.md)
- [12-public-assets-and-file-uploads.md](12-public-assets-and-file-uploads.md)
- [api-driven-config/08-upload-to-api.md](api-driven-config/08-upload-to-api.md)
- [api-driven-config/11-draft-migration.md](api-driven-config/11-draft-migration.md)
