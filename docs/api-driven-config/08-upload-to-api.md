# Authoring Package and Upload Reference

This document describes the current authoring API shape and the local CLI workflow used to move drafts between the repo and the backend.

## What this document covers

Use this document when you need to:

- create a new site from a local draft tree
- pull the current draft or published state into the repo
- push local changes back to the authoring API
- publish the current authoring draft

For the higher-level workflow, read [../11-draft-lifecycle.md](../11-draft-lifecycle.md) first.

## Current endpoints

Stable custom domain:

```text
https://api.zoolandingpage.com.mx/config-authoring
https://api.zoolandingpage.com.mx/runtime-bundle
https://api.zoolandingpage.com.mx/image-upload/presign
```

The runtime and authoring APIs serve different purposes:

- `config-authoring`: create, read, update, and publish drafts
- `runtime-bundle`: serve one effective published bundle to live pages
- `image-upload/presign`: issue presigned upload URLs or perform direct image uploads for public assets

## Current local CLI

The canonical CLI is:

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

The direct `node tools/config-draft-sync.mjs ...` form is recommended for explicit endpoint arguments.

## Current authoring actions

The authoring API currently supports these actions through the CLI or direct POST requests:

- `getSite`
- `createSite`
- `upsertDraft`
- `publishDraft`

### `getSite`

Read either the current authoring draft or the published state for one domain.

Example request body:

```json
{
  "action": "getSite",
  "domain": "zoolandingpage.com.mx",
  "stage": "draft"
}
```

### `createSite`

Create a new site in the authoring system from a local `TAuthoringDraftPackage` file set.

### `upsertDraft`

Replace the current authoring draft for a domain with the local file set you send.

### `publishDraft`

Promote the current authoring draft to the published runtime state.

## The two important transport contracts

### `TAuthoringDraftPackage`

This is the authoring-side package used by `pull`, `push`, and `create`.

```json
{
  "version": 1,
  "domain": "zoolandingpage.com.mx",
  "stage": "draft",
  "files": [
    {
      "path": "zoolandingpage.com.mx/site-config.json",
      "kind": "site-config",
      "content": {}
    }
  ]
}
```

Important fields in each file entry:

- `path`: path relative to the drafts root
- `kind`: file role such as `site-config`, `page-config`, `page-components`, `variables`, `angora-combos`, `i18n`
- `pageId`: present for page-owned files
- `lang`: present for i18n files
- `content`: JSON object stored in that file

### `TRuntimeBundlePayload`

This is the runtime-side bundle returned to live sites.

It contains one effective published page state, including merged shared and page-level payloads.

Core fields:

- `domain`
- `pageId`
- `sourceStage`
- `versionId`
- `siteConfig`
- `pageConfig`
- `components`
- `variables`
- `angoraCombos`
- `i18n`

## Recommended workflows

### Pull the current authoring draft into the repo

```bash
node tools/config-draft-sync.mjs pull --endpoint=https://api.zoolandingpage.com.mx/config-authoring --domain=zoolandingpage.com.mx
```

### Pack the current local draft tree

```bash
node tools/config-draft-sync.mjs pack --domain=zoolandingpage.com.mx --output=.tmp-zoolanding-draft-package.json
```

### Push local changes to the authoring draft

```bash
node tools/config-draft-sync.mjs push --endpoint=https://api.zoolandingpage.com.mx/config-authoring --domain=zoolandingpage.com.mx --updated-by="Your Name"
```

### Create a new site from a local draft tree

```bash
node tools/config-draft-sync.mjs create --endpoint=https://api.zoolandingpage.com.mx/config-authoring --domain=newsite.example --publish-on-create=false
```

### Publish the current draft via API

```bash
node tools/config-draft-sync.mjs publish --endpoint=https://api.zoolandingpage.com.mx/config-authoring --domain=zoolandingpage.com.mx --updated-by="Your Name"
```

## Direct API examples

### Read the published state

```bash
curl -X POST "https://api.zoolandingpage.com.mx/config-authoring" \
  -H "Content-Type: application/json" \
  -d '{"action":"getSite","domain":"zoolandingpage.com.mx","stage":"published"}'
```

### Publish the current draft

```bash
curl -X POST "https://api.zoolandingpage.com.mx/config-authoring" \
  -H "Content-Type: application/json" \
  -d '{"action":"publishDraft","domain":"zoolandingpage.com.mx","updatedBy":"Your Name"}'
```

## What belongs in the authoring package

The package should contain config JSON only.

Included:

- `site-config.json`
- shared and page `components.json`
- shared and page `variables.json`
- shared and page `angora-combos.json`
- shared and page `i18n/*.json`
- page `page-config.json`

Excluded:

- binary files
- images
- videos
- PDFs

Public assets must be uploaded separately through `image-upload/presign` and then referenced from config JSON by URL.

The upload endpoint now supports two public asset flows:

- direct upload with `imageBase64` for backend compression of JPEG, PNG, and WebP files
- legacy presigned browser upload when you want the browser to `PUT` directly to S3

For the complete request and authoring guidance, see [../12-public-assets-and-file-uploads.md](../12-public-assets-and-file-uploads.md).

## Common mistakes

- pushing local drafts without first verifying the local preview
- publishing without confirming the authoring draft is the one you just pushed
- assuming a successful publish means the app tier has already refreshed its frontend assets or caches
- trying to store media files inside config payloads instead of the public asset flow

## Related docs

- [../11-draft-lifecycle.md](../11-draft-lifecycle.md)
- [../12-public-assets-and-file-uploads.md](../12-public-assets-and-file-uploads.md)
- [11-draft-migration.md](11-draft-migration.md)
- [12-validation.md](12-validation.md)
