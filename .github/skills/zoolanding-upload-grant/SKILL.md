---
name: zoolanding-upload-grant
description: 'Repo-local workflow for issuing temporary Zoolanding draft image upload grant files. Use when a user asks to create, renew, or prepare .token and .json upload grant files for public draft assets, image uploads, replacing/editing uploaded images, logos, hero images, SEO images, or grant-protected zoolanding-image-upload access.'
---

# Zoolanding Upload Grant

Use this skill from the `zoolandingpage` hub repo when creating temporary image upload grant files for draft public assets.

## Read First

1. Read `Codex.md`.
2. Read `docs/12-public-assets-and-file-uploads.md`.
3. If the draft exists locally, read `drafts/{domain}/Codex.md`.

## Ask For Missing Inputs

Ask only for values that cannot be inferred safely:

- recipient: who will receive/use the grant
- draft domain: exact canonical draft domain
- asset kinds: default to `images,hero-images,logos,seo-images`
- expected uploads: default to `25`
- max file size: default to `5242880` bytes
- expiration: default to `28800` seconds
- pages: default to `*`
- overwrite: ask if replacements/edits of existing uploaded images are needed; default `false`
- presigned PUT: default `false`; enable only for files larger than the direct-upload limit
- AWS profile/function override: ask only when the default AWS context is not usable

Do not ask for a token value. This skill creates the token.

## Issue The Grant

Run from the hub repo root:

```powershell
node tools/issue-upload-grant.mjs `
  --domain=<domain> `
  --usage-limit=<count> `
  --expires-seconds=<seconds> `
  --max-bytes=<bytes> `
  --kinds=<comma-separated-kinds> `
  --pages=<comma-separated-pages> `
  --allow-overwrite=<true-or-false> `
  --issued-by=<recipient-or-issuer-label>
```

Add `--allow-presigned-put=true` only when explicitly needed. Add `--profile=<aws-profile>` or `--function-name=<name>` only when required.

## Verify And Respond

1. Confirm the command returned `ok: true`.
2. Verify both returned paths exist: `tokenFile` and `metadataFile`.
3. Read only the metadata JSON. Do not print or read the token file contents.
4. Report the two file paths as local links, the exact UTC expiration, Central Time expiration, grant scope, usage limit, max bytes, asset kinds, page IDs, overwrite, and presigned PUT status.
5. Tell the user the `.token` is sensitive and must not be committed, pasted into public chats, screenshots, PRs, changelogs, draft JSON, or docs.

If the tool fails, report the exact failure. Do not invent a grant or substitute a guessed file path.

## Safety Rules

- Keep grant files under `.zlp/upload-grants/` unless the user explicitly requests another ignored local destination.
- Never commit `.zlp/`, `.env*`, `*.token`, `*.grant`, upload grants, signed upload URLs, or raw environment values.
- Never write the grant token, presigned `uploadUrl`, AWS credentials, or signed URLs into draft payloads.
- Uploaded draft JSON should store only the final `publicUrl` returned by `tools/upload-draft-asset.mjs`.
- Use overwrite grants only for intentional replacements.
