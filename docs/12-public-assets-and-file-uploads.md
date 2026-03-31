# Public Assets and File Uploads

This guide explains how to upload files for use in landing pages and how those files differ from config payloads.

## Config payloads versus public assets

Keep these two storage types separate:

- `config payloads`: JSON files such as `site-config.json`, `page-config.json`, `components.json`, `variables.json`, `angora-combos.json`, and `i18n/*.json`
- `public assets`: images and other media files used by those payloads

Config payloads belong in the config authoring/runtime platform. Public assets belong in the public files bucket and CDN path.

## Current upload endpoint

Use the image-upload presign endpoint:

```text
POST https://api.zoolandingpage.com.mx/image-upload/presign
```

This endpoint returns:

- `uploadUrl`: presigned S3 `PUT` URL
- `publicUrl`: final public URL you should store in draft config
- `key`: final object key
- `contentType`: content type to reuse in the upload request
- `headers`: required headers for the upload request
- `expiresIn`: presign expiry in seconds

## Current storage model

- public asset bucket: `zoolandingpage-public-files`
- public CDN/base URL: `https://assets.zoolandingpage.com.mx`
- key pattern: `{domain}/{pageId}/{assetKind}/{assetId}.{ext}`

If an asset is shared across many pages, use `shared` as the page segment.

## Request body fields

Current request fields:

- `domain`: canonical site domain
- `pageId`: page identifier, or `shared` for shared assets
- `assetKind`: logical group such as `hero-images`, `logos`, `seo-images`
- `assetId`: stable identifier for the asset
- `fileName`: original file name
- `contentType`: MIME type, currently restricted to image uploads

Example request:

```json
{
  "domain": "zoolandingpage.com.mx",
  "pageId": "default",
  "assetKind": "hero-images",
  "assetId": "headline-art",
  "fileName": "headline-art.png",
  "contentType": "image/png"
}
```

## Step-by-step upload flow

### 1. Request a presigned upload URL

```bash
curl -X POST "https://api.zoolandingpage.com.mx/image-upload/presign" \
  -H "Content-Type: application/json" \
  -d '{"domain":"zoolandingpage.com.mx","pageId":"default","assetKind":"hero-images","assetId":"headline-art","fileName":"headline-art.png","contentType":"image/png"}'
```

### 2. Upload the file to the returned `uploadUrl`

Example with `curl`:

```bash
curl -X PUT "<uploadUrl>" \
  -H "Content-Type: image/png" \
  --upload-file ./headline-art.png
```

Example in PowerShell:

```powershell
Invoke-WebRequest -Method Put -Uri "<uploadUrl>" -Headers @{ "Content-Type" = "image/png" } -InFile .\headline-art.png
```

### 3. Save the returned `publicUrl` in draft config

The config field depends on the draft you are authoring, but the rule is always the same: store the final `publicUrl`, not the presigned `uploadUrl`.

Example snippet in a draft variable payload:

```json
{
  "variables": {
    "hero": {
      "backgroundImage": "https://assets.zoolandingpage.com.mx/zoolandingpage.com.mx/default/hero-images/headline-art.png"
    }
  }
}
```

## Recommended asset naming

Use stable, semantic names for `assetKind` and `assetId` so payload diffs stay readable.

Good examples:

- `hero-images/headline-art`
- `logos/brand-mark`
- `seo-images/default-og-card`

Avoid random or temporary names unless the asset is truly temporary.

## Common asset usage patterns

Use uploaded public URLs for:

- hero images
- logos
- social share images
- structured-data image references
- illustrations referenced by `variables.json` or `components.json`

Do not use the config platform for storing binary media itself.

## Operational notes

- browser uploads require bucket-level CORS for your site origins
- the returned `publicUrl` is the stable value to keep in payloads
- the presigned `uploadUrl` expires and should never be committed to draft files
- if the object exists in the bucket but does not load publicly, check CDN routing and DNS as well as S3 object presence

## Troubleshooting

- presign request fails: verify `domain`, `contentType`, and API access
- upload `PUT` fails: verify `Content-Type` matches the presign response and that the URL has not expired
- uploaded file exists but is not visible on the site: verify the payload uses `publicUrl`, not `uploadUrl`
- public URL returns 404 or does not resolve: verify the object key, CDN/base URL, and Route53 or CloudFront wiring

## Related docs

- [11-draft-lifecycle.md](11-draft-lifecycle.md)
- [06-deployment.md](06-deployment.md)
- [api-driven-config/08-upload-to-api.md](api-driven-config/08-upload-to-api.md)
