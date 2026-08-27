# The Hair Narrative: approved Booksaw assets

This versioned public asset set contains the eleven approved WebP images and four original WOFF2 faces for the Booksaw-adapted draft. All binary files and the two upstream font licenses are byte-identical to the reviewed source assets. No source document, full composite image, grant, credential, or private draft payload is included.

## Delivery

- Base path: `/assets/thehairnarrative.com/booksaw-20260827/`.
- Images: `images/{original-name}.webp`.
- Fonts: `fonts/{original-name}.woff2`.
- Use the root-relative `publicPath` values in [asset-manifest.txt](asset-manifest.txt). They remain on the app's origin, including `https://test.zoolandingpage.com.mx`, so the font requests do not require cross-origin CORS permission.
- Angular's existing `public/**/*` projection includes this directory in the browser artifact. The existing frontend `assets/*` CloudFront behavior serves the active immutable release's browser prefix. No asset-service or upload-grant change is required.
- Preparation does not deploy or activate a release. The authorized publisher must include these files in the validated artifact, activate that artifact in **test**, and verify HTTP status, `image/webp` / `font/woff2` MIME types, and file hashes before promoting the referring draft payloads.
- Do not replace bytes at these immutable URLs. A changed asset set needs a new versioned directory and updated payload references.

## Provenance and limits

The [manifest](asset-manifest.txt) records exact file names, hashes, byte lengths, image dimensions, font weights, optical-size axes, and public upstream font sources. Runtime image and font bytes total 476,614 bytes.

The client approved the images and reported a commercial Booksaw template license. That does not independently establish all photo rights or authorize production publication; applicable client/source rights remain a production review gate. The studio portrait and three client-sheet crops retain their small native resolution. No extra detail has been generated.

Newsreader 400/500 and Open Sans 400/600 are normal-style faces. The original [Newsreader OFL](fonts/Newsreader-OFL.txt) and [Open Sans OFL](fonts/OpenSans-OFL.txt) notices accompany them. Text provenance deliberately uses `.txt`, not a draft configuration JSON file.

From the hub repository, verify the exact set with:

```sh
node --test tools/tests/the-hair-narrative-public-assets.spec.mjs
```
