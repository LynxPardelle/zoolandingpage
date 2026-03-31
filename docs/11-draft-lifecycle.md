# Draft Lifecycle

This guide explains how to create, preview, update, upload, and publish Zoolanding drafts.

## The three states to keep separate

Every draft exists in three possible states:

1. `Local draft files`
   Your working copy in `public/assets/drafts/{domain}/...`.
2. `Authoring draft state`
   The draft stored in the config authoring API.
3. `Published runtime state`
   The version currently returned by the runtime API for live domains.

Do not treat those as the same thing. A local file edit affects only state 1 until you push and publish it.

## Local draft structure

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

Domain-root files provide shared defaults. Page-root files override them for one route.

## Create a new draft locally

The current platform does not have a separate scaffold generator for local files. The practical path is:

1. Create a new domain folder under `public/assets/drafts/{domain}`.
2. Add `site-config.json` for the new domain.
3. Create at least one page folder such as `default`.
4. Add `page-config.json` and `components.json` for that page.
5. Add `variables.json`, `angora-combos.json`, and `i18n/*.json` only when the draft needs them.

For a shared header/footer or repeated site UI, use the domain-root `components.json` instead of duplicating the same component definitions across pages.

## Preview a draft locally

Open the app with explicit draft query parameters:

```text
http://127.0.0.1:4200/?draftDomain=zoolandingpage.com.mx&draftPageId=default
http://127.0.0.1:4200/?draftDomain=newsite.example&draftPageId=default
```

If you are using the Docker dev server on another port, keep the same query parameters and only change the host/port.

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

## Recommended workflows

### Update an existing site

1. Pull the latest draft.
2. Edit local files.
3. Preview locally.
4. Push the local draft.
5. Publish it.
6. Validate the runtime bundle and the live site separately.

### Create a new site

1. Create the local draft tree.
2. Preview locally.
3. Upload any required public assets.
4. Create the site in the authoring API.
5. Publish it.
6. Validate the runtime bundle and then validate the live site.

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
