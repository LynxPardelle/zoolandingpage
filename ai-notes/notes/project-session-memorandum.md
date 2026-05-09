Date: 2026-05-09 (Central Time)
Scope: Cross-session memorandum for active Zoolandingpage project workstreams.
Status: Active
Applies To: Zoolandingpage project sessions, active workstreams, future handoffs
Source Of Truth:

- User requests across Zoolandingpage sessions.
- `Codex.md`
- Active workstream notes and project TODOs.
- Verified local repo state, deployed services, public support threads, and browser QA evidence.
  Confidence: High
  Last Reviewed: 2026-05-09 (Central Time)

# Project Session Memorandum

Use this file as the rolling memorandum for important project work across sessions. Add a new dated entry whenever a session produces durable context, an implementation decision, a deployment result, an external blocker, or a follow-up that future agents should not rediscover.

Do not store secrets, tokens, raw environment variable values, signed URLs, private customer data, or other sensitive data here. Link to safe public threads, committed docs, and sanitized evidence instead.

## Entry Format

Each entry should include:

- date and time in Central Time when relevant
- workstream name
- what changed
- what was verified
- what remains blocked or pending
- links to safe follow-up artifacts

## Session Entries

### 2026-05-09 CT - TIDAL Runtime API Workstream

Summary:

- `zoolanding-api-proxy` is the backend-for-frontend service for runtime draft API calls. It resolves server-only integration policies, reads credentials from AWS Secrets Manager, calls upstream APIs, filters responses, and returns safe JSON to drafts.
- `music.lynxpardelle.com` has a runtime data source configured for TIDAL albums, with fallback album cards rendered when the live upstream is unavailable.
- The frontend can render runtime API album cards with optional image and outbound link fields.
- Runtime data-source field mappings support `prefix` and `suffix` so filtered upstream fields can be composed into safe display URLs.
- Real credential values are not committed. The TIDAL secret lives in AWS Secrets Manager as `zoolanding/api/music/tidal` with JSON fields `clientId` and `clientSecret`.
- `zoolanding-api-proxy` includes a repeatable placeholder workflow through `secret-placeholders/credential-placeholders.json` and `tools/ensure_secret_placeholders.py`.

Implemented:

- Proxy support for `bearer`, `api-key-header`, `oauth2-client-credentials`, safe static non-secret headers, and dynamic published draft-origin checks.
- Frontend support for runtime source mapping with `prefix`/`suffix`, feature-card image rendering, and feature-card outbound links.
- Draft support for a TIDAL album section on `music.lynxpardelle.com`, with `countryCode: "MX"` and artist reference `https://tidal.com/artist/10212180`.

Verified:

- TIDAL OAuth client credentials token request succeeds.
- TIDAL token response includes `token_type: Bearer`, `expires_in: 14400`, and access tier decoded from token payload as `THIRD_PARTY`.
- TIDAL v2 catalog endpoint tests failed after successful auth:
  - `GET https://openapi.tidal.com/v2/albums/59727856?countryCode=US`
  - `GET https://openapi.tidal.com/v2/artists/10212180/relationships/albums?countryCode=MX&include=albums`
- Both v2 endpoints returned `404` with `No static resource ...` responses.
- TIDAL legacy v1 catalog routes returned `401` with `Client does not have required access tier`.
- TIDAL Developer Portal app details show app type `THIRD PARTY`, platform preset `WEB`, and `Application Reviews: No Application Reviews found`.

External follow-up:

- TIDAL GitHub Discussion created: `https://github.com/orgs/tidal-music/discussions/318`
- Discussion title: `openapi.tidal.com v2 catalog endpoints return 404 with valid client credentials token`

Current blocker:

- Zoolanding can authenticate to TIDAL, but TIDAL catalog endpoints currently do not return catalog data for this third-party app. Follow up through GitHub Discussion #318 before changing the integration to use another TIDAL route.
- As of 2026-05-09 16:38 CT, the `music.lynxpardelle.com` TIDAL album section is paused in draft config. The section remains authored, but `tidalAlbumsSection` uses `condition: "all:false"` and the `lynx-tidal-albums` runtime data source is disabled so the page does not call the API while blocked.

### 2026-05-09 16:26 CT - Spotify Runtime API Workstream

Summary:

- Spotify was evaluated as an alternate source for album cards on `music.lynxpardelle.com` while TIDAL catalog access remains blocked.
- The intended design was to reuse `zoolanding-api-proxy`, AWS Secrets Manager, and server-only draft integration policies for Spotify Client Credentials auth.
- No Spotify secret placeholder, draft source, or UI section was implemented.

Verified:

- The Spotify Developer Dashboard create-app screen displayed: `Upgrade to Spotify Premium to access the Web API and unlock additional features for your app.`
- Spotify documentation says Development Mode apps require the app owner to have an active Spotify Premium subscription.
- The user does not currently have Spotify Premium and chose to skip this implementation.

Current blocker:

- Spotify Web API integration is parked until the project owner has Spotify Premium or a different allowed catalog source is selected.

### 2026-05-09 17:40 CT - PokeAPI Visual Demo Workstream

Summary:

- `pokeapi-demo.zoolandingpage.com.mx` was created as a client-facing demonstration draft for runtime API-driven pages.
- The draft consumes eight PokeAPI read sources through `zoolanding-api-proxy`; it does not use or require secrets.
- The visual implementation uses `container`, `media`, `text`, and `link` components for Pokemon cards so it works with the currently deployed testing frontend.
- The draft keeps static fallback numbers and outbound PokeAPI links in draft variables/config while live API data supplies names, primary type labels, and official artwork URLs.
- Server-only PokeAPI policies filter upstream responses down to the fields needed by the draft and remain outside the runtime browser bundle.
- `zoolanding-api-proxy` now sends a default upstream `User-Agent` because PokeAPI returned `403` to Python `urllib` without one.

Published:

- Draft version: `20260509T233642Z-3feb20a40422`
- Testing preview URL: `https://test.zoolandingpage.com.mx/?draftDomain=pokeapi-demo.zoolandingpage.com.mx&debugWorkspace=false`

Verified:

- Direct `/api-proxy/read` calls for PokeAPI sources returned `200` and filtered JSON.
- `runtime-bundle` returned published version `20260509T233642Z-3feb20a40422` and did not include `server/integrations.json`.
- Final browser QA ran three desktop and three mobile passes with eight proxy calls per pass, nine loaded images, no failed requests, no bad responses, no console errors, no broken images, no horizontal overflow, and the skip link hidden with `display: none`.
- QA evidence file: `reports/draft-qa/pokeapi-demo-20260509/qa-final.json`

Reusable lessons:

- For demos that must work against the already deployed frontend, prefer broadly supported primitives (`container`, `media`, `text`, `link`) over recently added component features until the frontend build containing those features is deployed.
- Do not rely on newly added frontend mapper `prefix`/`suffix` support in published drafts until the frontend deployment is confirmed; keep critical display labels and safe outbound links in fallback config when necessary.
