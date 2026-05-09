Date: 2026-05-09 (Central Time)
Scope: Memorandum for the TIDAL runtime API integration workstream.
Status: Active
Applies To: `music.lynxpardelle.com`, runtime API proxy data sources, TIDAL integration
Source Of Truth:

- User requests in the May 2026 TIDAL/runtime API workstream.
- `docs/api-driven-config/15-runtime-api-proxy-data-sources.md`
- `zoolanding-api-proxy` `README.md`, `instructions.md`, and SAM deployment outputs.
- TIDAL Developer Portal dashboard and GitHub Discussion #318.
  Confidence: High
  Last Reviewed: 2026-05-09 (Central Time)

# 2026-05-09 TIDAL Runtime API Memorandum

## Summary

- `zoolanding-api-proxy` is the backend-for-frontend service for runtime draft API calls. It resolves server-only integration policies, reads credentials from AWS Secrets Manager, calls upstream APIs, filters responses, and returns safe JSON to drafts.
- `music.lynxpardelle.com` now has a runtime data source configured for TIDAL albums, with fallback album cards rendered when the live upstream is unavailable.
- The frontend can render runtime API album cards with optional image and outbound link fields.
- Runtime data-source field mappings support `prefix` and `suffix` so filtered upstream fields can be composed into safe display URLs.
- Real credential values are not committed. The TIDAL secret lives in AWS Secrets Manager as `zoolanding/api/music/tidal` with JSON fields `clientId` and `clientSecret`.
- `zoolanding-api-proxy` includes a repeatable placeholder workflow through `secret-placeholders/credential-placeholders.json` and `tools/ensure_secret_placeholders.py`.

## What Was Implemented

- Proxy support for:
  - `bearer`
  - `api-key-header`
  - `oauth2-client-credentials`
  - safe static non-secret headers through server-only policy
  - dynamic published draft-origin checks so production draft domains can only request their own draft domain
- Frontend support for:
  - runtime source mapping with `prefix` and `suffix`
  - `generic-card` feature variant image rendering
  - `generic-card` feature variant outbound links
- Draft support for `music.lynxpardelle.com`:
  - TIDAL album section
  - fallback values for unavailable upstream responses
  - `countryCode: "MX"`
  - artist reference `https://tidal.com/artist/10212180`

## Verified Evidence

- TIDAL OAuth client credentials token request succeeds.
- TIDAL token response includes:
  - `token_type: Bearer`
  - `expires_in: 14400`
  - access tier decoded from token payload as `THIRD_PARTY`
- TIDAL catalog endpoint tests failed after successful auth:
  - `GET https://openapi.tidal.com/v2/albums/59727856?countryCode=US`
  - `GET https://openapi.tidal.com/v2/artists/10212180/relationships/albums?countryCode=MX&include=albums`
- Both v2 endpoints returned `404` with `No static resource ...` responses.
- TIDAL legacy v1 catalog routes returned `401` with `Client does not have required access tier`.
- TIDAL Developer Portal app details show:
  - app type `THIRD PARTY`
  - app platform preset `WEB`
  - `Application Reviews`: no reviews found
  - available support channel points to GitHub Discussions
- GitHub Discussion created:
  - `https://github.com/orgs/tidal-music/discussions/318`
  - title: `openapi.tidal.com v2 catalog endpoints return 404 with valid client credentials token`

## Security Notes

- Do not copy TIDAL client secret, access tokens, signed URLs, or raw AWS secret values into repo files or notes.
- The proxy should continue to return generic public upstream errors while keeping actionable diagnostics in controlled logs or support tickets.
- Future credential placeholders should be tracked only as non-sensitive metadata under `zoolanding-api-proxy/secret-placeholders/`.

## Current Blocker

The Zoolanding implementation can authenticate to TIDAL, but TIDAL catalog endpoints currently do not return catalog data for this third-party app. Follow up through GitHub Discussion #318 before changing the integration to use another TIDAL route.
