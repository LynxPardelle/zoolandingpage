# Authoring Package and Upload Reference

This document describes the current authoring API shape and the release workflow used to move drafts between GitHub and the backend.

## What this document covers

Use this document when you need to:

- create a new site from a local draft tree
- pull the current draft or published state into the repo
- understand the signed deploy requests sent by GitHub Actions
- publish the current authoring draft through the secure release workflow

For the higher-level workflow, read [../11-draft-lifecycle.md](../11-draft-lifecycle.md) first.

## Current endpoints

Stable custom domain:

```text
https://api.zoolandingpage.com.mx/config-authoring
https://api.zoolandingpage.com.mx/runtime-bundle
https://api.zoolandingpage.com.mx/image-upload/presign
```

GitHub Actions deploys use the IAM-protected Lambda Function URL:

```text
https://o4upx3fsz3d3dwfwz4lbnefjze0eetyn.lambda-url.us-east-1.on.aws/
```

The runtime and authoring APIs serve different purposes:

- `config-authoring`: create, read, update, and publish drafts
- `runtime-bundle`: serve one effective published bundle to live pages
- `image-upload/presign`: upload public assets only when a temporary upload grant authorizes the domain, asset kind, content type, size, and usage count

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

Use the upload-status CLI when you need to compare local draft JSON with the S3-backed authoring state:

```bash
node tools/draft-upload-status.mjs --all --stage=published
```

The npm shortcut runs that standard all-drafts published-state inventory:

```bash
npm run drafts:upload-status
```

It reads the published state through `config-authoring` `getSite`, which is the production draft source backed by S3. It does not inspect merged browser runtime bundles because those are page-level render payloads, not the source authoring package.

The direct `node tools/config-draft-sync.mjs ...` form is useful for local pack/unpack and legacy reads. Unsigned local write/publish calls now fail against the deployed authoring API because it requires AWS IAM signing.

## Current authoring actions

The authoring API currently supports these actions through the CLI or direct POST requests:

- `getSite`
- `createSite`
- `upsertDraft`
- `publishDraft`

The deployed authoring API requires signed AWS IAM requests for authoring actions. GitHub Actions call the Lambda Function URL with temporary OIDC-derived AWS credentials. Unsigned local `curl`/CLI write and publish flows are legacy-only and should not be used as the normal workflow.

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

Use `environment: "test"` for test aliases and `environment: "production"` for production aliases. Production remains backward-compatible with the legacy `published` pointer; test publishes are stored under `publishedEnvironments.test`.

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

For the standard Zoolanding custom-domain authoring URL, the CLI now retries automatically through the raw API Gateway endpoint if the front door resets the connection or the request times out. You can override the retry target with `--fallback-endpoint=https://...`, adjust the timeout with `--request-timeout-ms=20000`, increase retry coverage with `--retry-attempts=3`, and tune the retry delay with `--retry-delay-ms=250`.

### Pack the current local draft tree

```bash
node tools/config-draft-sync.mjs pack --domain=zoolandingpage.com.mx --output=.tmp-zoolanding-draft-package.json
```

### Push local changes to the authoring draft

```bash
node tools/config-draft-sync.mjs push --endpoint=https://api.zoolandingpage.com.mx/config-authoring --domain=zoolandingpage.com.mx --updated-by="Your Name"
```

Direct local push requires signed AWS credentials and should not be the normal workflow. Use per-draft GitHub Actions deploys instead.

### Create a new site from a local draft tree

```bash
node tools/config-draft-sync.mjs create --endpoint=https://api.zoolandingpage.com.mx/config-authoring --domain=newsite.example --publish-on-create=false
```

### Publish the current draft via API

```bash
node tools/config-draft-sync.mjs publish --endpoint=https://api.zoolandingpage.com.mx/config-authoring --domain=zoolandingpage.com.mx --updated-by="Your Name"
```

Publish should be performed by the post-merge draft repo workflow, not a local machine.

The same fallback behavior applies to `pull`, `push`, `create`, and `publish` when you use the standard Zoolanding custom-domain authoring endpoint.

### Check what is already uploaded

Use this before pushing/publishing or after a publish when you need a quick inventory of what local drafts still differ from the S3-backed production state:

```bash
node tools/draft-upload-status.mjs --all --stage=published --include-file-details=true
```

Useful variants:

```bash
node tools/draft-upload-status.mjs --domain=zoositioweb.com.mx --stage=published
node tools/draft-upload-status.mjs --all --stage=published --format=json --output=reports/draft-upload-status.json
node tools/draft-upload-status.mjs --all --stage=published --fail-on-pending=true
```

Status meanings:

- `uploaded`: local draft JSON matches the uploaded package.
- `needs-upload`: the domain exists remotely, but at least one local file differs, is missing remotely, or exists only remotely.
- `not-uploaded`: no remote package was found for that domain/stage.

The report prints hashes, file paths, counts, and version IDs when returned by the API. It does not print draft file contents or secret values.

## Direct API examples

### Read the published state

```bash
curl -X POST "https://api.zoolandingpage.com.mx/config-authoring" \
  -H "Content-Type: application/json" \
  -d '{"action":"getSite","domain":"zoolandingpage.com.mx","stage":"published"}'
```

Unsigned examples like the one above now return `403` unless the request is AWS IAM signed.

### Publish the current draft

```bash
curl -X POST "https://api.zoolandingpage.com.mx/config-authoring" \
  -H "Content-Type: application/json" \
  -d '{"action":"publishDraft","domain":"zoolandingpage.com.mx","updatedBy":"Your Name"}'
```

Use this shape only as a payload reference. The real production request must be AWS IAM signed by an authorized role.

## What belongs in the authoring package

The package should contain config JSON only.

Included:

- `site-config.json`
- shared and page `components.json`
- shared and page `variables.json`
- shared and page `angora-combos.json`
- shared and page `i18n/*.json`
- page `page-config.json`
- server-only `server/auth-profile-registry.json`
- server-only `server/integrations.json`

Excluded:

- binary files
- images
- videos
- PDFs
- server-only files in browser runtime bundles or static `/drafts` responses

Public assets must be uploaded separately through the grant-protected upload flow and then referenced from config JSON by URL.

The upload endpoint supports two grant-protected asset flows:

- direct upload with `imageBase64` for backend compression of JPEG, PNG, and WebP files
- presigned PUT only when the temporary grant explicitly allows it

For the complete request and authoring guidance, see [../12-public-assets-and-file-uploads.md](../12-public-assets-and-file-uploads.md).

## Common mistakes

- pushing local drafts without first verifying the local preview
- publishing without confirming the authoring draft is the one you just pushed
- assuming a successful publish means the app tier has already refreshed its frontend assets or caches
- trying to store media files inside config payloads instead of the public asset flow
- putting `access`, upstream `auth`, tokens, API keys, or client secrets in public `site-config.json.runtime.dataSources` or `runtime.apiActions`

## Related docs

- [../11-draft-lifecycle.md](../11-draft-lifecycle.md)
- [../12-public-assets-and-file-uploads.md](../12-public-assets-and-file-uploads.md)
- [11-draft-migration.md](11-draft-migration.md)
- [12-validation.md](12-validation.md)
