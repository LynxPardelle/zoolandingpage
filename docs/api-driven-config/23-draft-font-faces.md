# Draft-owned font faces

Drafts can declare optional font files in `site-config.json.site.fonts`. The shared runtime loads them through the browser Font Loading API; typography remains in draft-owned Angora combos and utilities. This contract accepts font binaries, not authored stylesheets, inline CSS, or scripts. It is independent of the existing page-level `googleFontsStylesheet` contract.

## Public contract

```json
{
  "site": {
    "fonts": [
      {
        "family": "Editorial Serif",
        "src": "/assets/example.com/editorial-v1/fonts/editorial-serif-500.woff2",
        "weight": "500",
        "style": "normal"
      }
    ]
  }
}
```

This is a partial example, not a complete site configuration.

- Omit `fonts`, or use an empty array, to keep existing behavior. At most eight faces are accepted.
- `family` is a non-empty ASCII family name, up to 80 characters, made of alphanumeric words separated by spaces or hyphens. It starts with a letter and has no leading or trailing whitespace.
- `src` is a root-relative path or an absolute HTTPS URL ending in `.woff2`, at most 2048 characters. The URL must contain no credentials, port, query, fragment, whitespace, percent escapes, backslash, or `.` / `..` path segments. Protocol-relative URLs, other protocols, and stylesheet URLs are rejected.
- `weight` defaults to `"400"`. It is an integer string from `"1"` through `"1000"`, or an ascending variable range such as `"400 600"`. Declare only weights actually present in the file.
- `style` defaults to `"normal"`; `"italic"` is also supported. Additional descriptor fields are rejected.
- Faces with the same family (case-insensitive) and style must not have overlapping weight ranges. The runtime guard enforces range ordering and overlap checks in addition to the JSON schema.

Keep the family name and fallback stack in the appropriate Angora typography combo. A named family alone does not download a font, and a declared face does not automatically apply its family to text.

## Loading and lifecycle

The runtime validates descriptors before browser requests, waits for decoded faces before installing the draft's initial components, and bounds the font wait to 2500 ms. A failed or slow asset keeps the authored fallback stack; a result arriving after that bound is not installed late. The same active domain and descriptors are deduplicated across route/language refreshes.

Switching draft/font configuration removes only faces owned by this service. Disconnecting the runtime clears its faces and cancels pending activation; reconnecting a previously bootstrapped shell restores them without reloading the entire draft. Server rendering and browsers without the Font Loading API do not fetch font binaries through this service.

## Assets and promotion

Font descriptors do not upload files. A draft JSON package, a local file, or a successful font validation is not evidence that a binary exists on a shared environment.

For approved bundled assets, the existing Angular `public/**/*` projection can include a versioned public directory in the immutable browser artifact. The environment must activate that artifact before a published draft references its paths. Keep successive byte revisions at new URLs, and preserve the previous release coordinate for rollback. This does not authorize publishing a draft, changing an environment, or adding private material to `public/`.

Keep original licenses and a provenance/hash manifest with the source files. Use `.txt` or Markdown for draft asset provenance: the strict draft collector rejects unrelated `.json` files as unknown configuration paths. Do not include credentials, signed URLs, source customer documents, or private material. The bundled public subset needs its own exact-file and hash checks.

Before any separately authorized promotion, verify the stable public URL, HTTP status, `font/woff2` MIME type, CORS policy for cross-origin files, and exact file bytes. Same-origin paths need no additional CORS permission. See [public assets and uploads](../12-public-assets-and-file-uploads.md) and the verified environment's release workflow; do not expand an image-only upload grant to fonts implicitly.

## Verification

- Check descriptors with the [site schema](schemas/site-config.schema.json) and [runtime guards](../../src/app/shared/utility/config-validation/config-payload.validators.ts).
- Verify real network responses and the loaded face set; `getComputedStyle(...).fontFamily` alone reports only the authored stack.
- Review every affected route in both supported languages at mobile and desktop widths. Exact fonts change wrapping, section heights, and control sizes.
- Recheck route clicks, language changes, disconnect/reconnect, failed or slow fonts, SSR, and private-asset exclusions. Do not regenerate global Angora CSS merely to load a font.

Implementation: [font service](../../src/app/shared/services/draft-font.service.ts), [descriptor guard](../../src/app/shared/utility/fonts/draft-font-config.ts), and [runtime integration](../../src/app/core/services/runtime.service.ts).
