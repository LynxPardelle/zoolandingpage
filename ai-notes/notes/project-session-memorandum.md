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

### 2026-05-09 22:55 CT - Parameterized PokeAPI Search And Detail Workstream

Summary:

- The PokeAPI demo advanced from a static visual API demo to a reusable parameterized runtime-page pattern.
- `runtime.dataSources[]` can now be scoped by `pageIds` so list-only sources do not run on unrelated routes.
- Runtime source `input` can now resolve from `literal`, `queryParam`, or `var` values and apply safe string transforms such as `trim` and `lowercase`.
- `search-box` configs can receive dynamic `suggestions` through `valueInstructions`, so a draft can populate search choices from a runtime API index.
- `zoolanding-api-proxy` now supports `urlTemplate` for server-owned parameterized upstream URLs. Template placeholders must be listed in `allowedInputFields`; values are scalar, non-empty, length-limited, and percent-encoded before the upstream request.
- `pokeapi-demo.zoolandingpage.com.mx` now has a `/pokemon` route that reads `?name=`, queries the proxy, and renders a reusable detail template for a selected Pokemon.
- The local `generic-icon` map includes `dark_mode` and `light_mode` SVG paths so theme buttons do not expose raw Material icon names when the external Material Icons font is absent.

Published and deployed:

- API proxy SAM stack `zoolanding-api-proxy` was updated in `us-east-1`.
- Draft version: `20260510T044815Z-42dfd6230702`.
- Local demo URL: `http://127.0.0.1:50503/?draftDomain=pokeapi-demo.zoolandingpage.com.mx&debugWorkspace=false`.
- Local detail URL: `http://127.0.0.1:50503/pokemon?draftDomain=pokeapi-demo.zoolandingpage.com.mx&debugWorkspace=false&name=charizard`.

Verified:

- Direct `/api-proxy/read` for `sourceId: "pokeapiPokemonDetail"` and `pokemonName: "charizard"` returned `200` with filtered Charizard fields.
- Direct `/api-proxy/read` for `sourceId: "pokeapiPokemonIndex"` returned `200` with PokeAPI index results.
- Local Playwright QA covered home, search, detail, dark mode, light mode, desktop, and mobile with no failed requests, no bad responses, no console errors, no broken images, no horizontal overflow, hidden skip links, and no visible `dark_mode`/`light_mode` text.
- Testing deploy took the fast-forwarded `test` branch at commit `0df759f` and served bundle `main-REKNAOOA.js`.
- Remote Puppeteer QA covered the testing home route, direct `/pokemon?name=charizard` route, and exact-search navigation to `name=charizard`; the final loaded state showed `Charizard`, `#6`, and `SUCCESS` with no failed requests, no bad responses, no console errors, no broken images, no horizontal overflow, and no visible raw theme icon text.
- QA evidence lives under local ignored `Output/pokeapi-demo-qa/`.

Reusable lessons:

- Parameterized detail routes should keep the route/query input in public config and the upstream URL pattern in `server/integrations.json`.
- Template fields consumed by `urlTemplate` should not be forwarded again as query/body input.
- For browser QA in this app, remember that the document body can be the scroll container; use body scroll metrics as well as documentElement metrics.
- Remote SSR may render fallback values before runtime API calls complete; QA for dynamic detail pages should wait for the expected loaded value or runtime `SUCCESS` before judging the final state.

### 2026-05-10 19:08 CT - PokeAPI Catalog Controls Workstream

Summary:

- The PokeAPI demo catalog now demonstrates reusable API-driven collection controls authored in draft config.
- Loop configs can apply scope-driven filters, sort options, and pagination before materializing template components.
- Filters support nested array paths, so authors can filter collections by values such as `types.type.name` or `moves.move.name`.
- Runtime data-source initial loads now run sequentially, which avoids browser/proxy request bursts when a draft declares many API sources.
- The demo home page now includes type, evolution-stage, move, sort, and pagination controls.
- The theme toggle keeps the moon SVG in dark mode and switches to the sun SVG in light mode through value instructions.
- The `/pokemon?name=charizard` detail page now renders real move names from the PokeAPI `moves` array.

Published:

- Draft version: `20260511T010302Z-b0e0fc2e78a9`
- Frontend commit: `92db6ff`
- Testing bundle: `main-MBFHBYEI.js`
- Local home QA URL: `http://localhost:4201/?draftDomain=pokeapi-demo.zoolandingpage.com.mx&debugWorkspace=false`
- Local detail QA URL: `http://localhost:4201/pokemon?draftDomain=pokeapi-demo.zoolandingpage.com.mx&debugWorkspace=false&name=charizard`
- Testing home QA URL: `https://test.zoolandingpage.com.mx/?draftDomain=pokeapi-demo.zoolandingpage.com.mx&debugWorkspace=false`
- Testing detail QA URL: `https://test.zoolandingpage.com.mx/pokemon?draftDomain=pokeapi-demo.zoolandingpage.com.mx&debugWorkspace=false&name=charizard`

Verified:

- `npm test -- --watch=false --browsers=ChromeHeadless` returned `369 SUCCESS`.
- `npm run build` completed successfully.
- Local browser QA covered desktop dark/light, Fire type filter, Flamethrower move filter, evolution filter, number-desc sort, Charizard detail moves, and mobile layout.
- Final browser QA saw 17 home proxy reads and 2 detail proxy reads, all with status `200`, with no console errors, request failures, bad responses, or horizontal overflow.
- Remote testing browser QA covered home desktop, Flamethrower move filter, Charizard detail, and home mobile with the same clean result: no console errors, request failures, bad responses, or horizontal overflow, and all proxy reads returned `200`.
- QA evidence lives under local ignored `Output/pokeapi-demo-qa/`.

Reusable lessons:

- For API-driven catalogs, prefer a generic loop collection view over one-off component code so the same pattern can support albums, blog posts, products, or Pokemon.
- When a draft can declare many runtime data sources, avoid firing every source concurrently from the browser; sequential initial loads are slower but more stable and keep fallback content visible.
- Detail templates that loop directly over array items need explicit loop bindings on the parent loop config; otherwise the template fallback text is rendered for every item.

### 2026-05-11 CT - PokeAPI Catalog Performance And Pagination Correction

Summary:

- The PokeAPI catalog was freezing because the default list route fetched a 1500-record index on every catalog click and repeated the same loop filtering/sorting work for each child template in the card.
- Runtime data sources can now calculate upstream `offset` from `page` and `pageSize` with `queryParamPageOffset`.
- Runtime data sources can skip broad default reads with `skipWhenQueryParams` when query-specific sources such as `pokemon`, `type`, or `move` are active.
- Loop collection pagination can now declare `applyWhenAnyQueryParam` so a server-paginated default source is not paginated a second time, while query-filtered sources still use client-side pagination.
- The loop materializer caches identical collection views during one render so repeated card child templates reuse the same filtered/sorted/paginated item set.
- Interaction-scope registration/configuration effects now avoid no-op signal writes and use `untracked(...)` around effect-triggered registration/configuration to prevent `NG0103` infinite change detection loops.
- `generic-input` now renders directly instead of through `@defer (on viewport)` because the zero-size placeholder prevented critical filter and pagination inputs from mounting in the catalog controls.

Verified locally:

- `npm run build` completed successfully.
- `ng test` with focused `--include` targets timed out without a completed Karma result; do not treat it as passing evidence.
- Playwright/Edge QA on `http://127.0.0.1:4202` covered default desktop, `page=2&pageSize=8`, `move=mega-punch&page=2&pageSize=4`, `pokemon=lucario`, and mobile controls with no console errors other than Angular dev/HMR info logs.
- The default route now calls `pokeapiPokemonIndex` with `limit: 4, offset: 0`; `page=3&pageSize=4` calls it with `limit: "4", offset: 8` and renders only #9-#12.
- Agent-browser QA confirmed that catalog inputs render in desktop and mobile, the page input exposes `max: "338"`, page 3 shows Blastoise/Caterpie/Metapod/Butterfree, and `move=mega-punch&page=2&pageSize=4` shows Wartortle/Blastoise/Pikachu/Raichu with no page errors.

Published:

- Draft version: `20260511T221336Z-9f0fe9350cf8`.
- Runtime-bundle verification through `https://api.zoolandingpage.com.mx/runtime-bundle` failed with a forced remote connection interruption in this environment; the raw API Gateway fallback returned `sourceStage: "published"` and `versionId: "20260511T221336Z-9f0fe9350cf8"`.
- Frontend commits `6f20889` and `717be1e` were pushed to `main`, `dev`, and `test`; immediately after the push, `https://test.zoolandingpage.com.mx` still served `main-JBHFSIRU.js`, so remote browser QA was blocked by stale deployment. A Dokploy `project.all` API check with the available token returned `Unauthorized`; do not record the token in notes.

Reusable lessons:

- For large API catalogs, prefer upstream pagination for the broad default index. Use client-side loop pagination only for already-narrowed collections returned by query-specific sources.
- Do not use `appendItems` for page-index sources; replacing is correct when the same logical list changes page or page size. Reserve append/merge for enrichment sources that intentionally add fields to a selected item.
- If a card template requires repeated generated children, cache or otherwise share the parent collection view; otherwise a 4-card page can still sort/filter the same source many times.
- Avoid `@defer (on viewport)` for critical controls unless the placeholder has stable dimensions and is verified to trigger in the target layout.
