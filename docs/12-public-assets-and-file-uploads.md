# Public Assets and File Uploads

This guide explains how clients, teammates, and AI agents upload public images for Zoolanding drafts.

## Security Model

Public assets are served from the public asset CDN, but upload permission is not public.

Every upload request to `zoolanding-image-upload` must include a temporary upload grant. The grant is an opaque token whose hash is stored server-side in DynamoDB with:

- one canonical draft domain
- allowed page IDs and asset kinds
- allowed image content types
- max byte size
- usage limit
- expiration
- overwrite permission

The uploader does not accept unauthenticated legacy uploads. If a request has no grant, an invalid grant, an expired grant, a domain mismatch, or a forbidden asset kind/content type, the backend denies it and emits the `Zoolanding/ImageUpload UploadGrantDenied` CloudWatch metric. Production deploys should subscribe the operator emails to the upload-abuse SNS topic.

Do not commit grants, tokens, signed upload URLs, `.env*`, `.zlp/`, or generated grant files.

## What Clients Should Ask For

When a client or teammate needs to upload images, they should ask Alec or an authorized Zoolanding developer for a temporary upload grant and provide:

- the draft domain, such as `pamelabetancourt.com`
- expected asset kinds, such as `images`, `hero-images`, `logos`, or `seo-images`
- expected number of uploads
- whether any existing asset must be intentionally replaced
- whether any file is larger than the normal direct-upload limit

Default grants should be short-lived, scoped to one domain, limited to common image types, and unable to overwrite existing keys.

## Local Secret Files

Store received grants outside git-tracked files. The recommended local shape is:

```powershell
New-Item -ItemType Directory -Force .zlp\upload-grants
Set-Content -NoNewline .zlp\upload-grants\pamelabetancourt-com.token "<grant-token>"
```

The hub `.gitignore` and draft repo templates ignore `.zlp/`, `.env*`, `*.token`, `*.grant`, and `upload-grants/`.

## Upload A Draft Asset

Run this from the `zoolandingpage` hub repo root:

```powershell
node tools/upload-draft-asset.mjs `
  --domain=pamelabetancourt.com `
  --page=shared `
  --kind=images `
  --id=hero-principal `
  --file="C:\path\hero.webp" `
  --grant-file=".zlp\upload-grants\pamelabetancourt-com.token"
```

The tool prints the final `publicUrl`, not the grant:

```text
publicUrl: https://assets.zoolandingpage.com.mx/pamelabetancourt.com/shared/images/hero-principal.webp
```

Write that `publicUrl` into the relevant draft JSON. The exact field depends on the draft component or SEO setting. Never write the presigned `uploadUrl`; it expires and can grant temporary upload capability while active.

## Common Asset Keys

Use stable, semantic names so JSON diffs stay readable:

- `shared/images/hero-principal`
- `shared/logos/brand-mark`
- `shared/seo-images/default-og-card`
- `{pageId}/hero-images/main-visual`

The final storage key is:

```text
{domain}/{pageId}/{assetKind}/{assetId}.{ext}
```

## Overwrites

Overwrites are blocked by default. If an asset must be replaced, ask for an overwrite grant and run:

```powershell
node tools/upload-draft-asset.mjs `
  --domain=pamelabetancourt.com `
  --page=shared `
  --kind=images `
  --id=hero-principal `
  --file="C:\path\hero.webp" `
  --grant-file=".zlp\upload-grants\pamelabetancourt-com-overwrite.token" `
  --overwrite
```

Both the grant and the command must allow overwrite.

## Large Files And Presigned PUT

The preferred path is direct upload. The tool sends small images as base64 to the backend. The backend can resize/compress JPEG, PNG, and WebP when Pillow is packaged; otherwise it stores the original image bytes unchanged.

For larger files, presigned PUT can be enabled only when the grant explicitly allows it:

```powershell
node tools/upload-draft-asset.mjs `
  --domain=pamelabetancourt.com `
  --page=shared `
  --kind=images `
  --id=large-background `
  --file="C:\path\large-background.avif" `
  --grant-file=".zlp\upload-grants\pamelabetancourt-com-large.token" `
  --presigned
```

Do not request presigned PUT unless direct upload cannot handle the file size.

## Authorized Developer: Issue A Grant

Only Alec or an authorized Zoolanding developer should issue grants. The tool requires AWS access to invoke the deployed `zoolanding-image-upload` Lambda or to resolve the Lambda name from the CloudFormation stack.

```powershell
node tools/issue-upload-grant.mjs `
  --domain=pamelabetancourt.com `
  --usage-limit=10 `
  --expires-seconds=28800 `
  --max-bytes=5242880 `
  --kinds=images,hero-images,logos,seo-images `
  --issued-by="Alec"
```

The token is written to `.zlp/upload-grants/...token` and is not printed. The metadata JSON beside it omits the token.

Useful options:

- `--allow-overwrite=true` for intentional replacements
- `--allow-presigned-put=true` for large-file direct-to-S3 uploads
- `--content-types=image/jpeg,image/png,image/webp,image/gif,image/avif`
- `--pages=shared,home`
- `--profile=<aws-profile>`
- `--function-name=<lambda-function-name>`

After issuing a grant, send only the token or token file contents through a secure channel. Do not paste grants into GitHub issues, commits, draft JSON, changelogs, screenshots, or public chat.

## Troubleshooting

- `Upload grant is required`: provide `--grant-file`, `--grant`, `ZLP_UPLOAD_GRANT_FILE`, or `ZLP_UPLOAD_GRANT`.
- `domain_mismatch`: ask for a grant for the exact canonical draft domain.
- `asset_kind_not_allowed`: ask for a grant that includes the desired `--kind`.
- `content_type_not_allowed`: convert the file to an allowed image type or ask for a broader grant.
- `asset_exists`: use a new `--id` or ask for an overwrite grant.
- `presigned_put_not_allowed`: use a smaller direct upload or ask for a grant that allows presigned PUT.
- Uploaded URL returns `404`: verify the command succeeded, use the returned `publicUrl`, and check CDN/object propagation.

## Related Docs

- [11-draft-lifecycle.md](11-draft-lifecycle.md)
- [06-deployment.md](06-deployment.md)
- [api-driven-config/08-upload-to-api.md](api-driven-config/08-upload-to-api.md)
