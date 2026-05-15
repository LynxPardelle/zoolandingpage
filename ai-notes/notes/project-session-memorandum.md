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
- The PokeAPI catalog form includes hidden native sticky inputs for `draftDomain`, `debugWorkspace`, `sort`, `pageSize`, `type`, `move`, and `evolution` so pre-hydration GET submits on the testing preview host stay inside the selected draft.

Verified locally:

- `npm run build` completed successfully.
- `ng test` with focused `--include` targets timed out without a completed Karma result; do not treat it as passing evidence.
- Playwright/Edge QA on `http://127.0.0.1:4202` covered default desktop, `page=2&pageSize=8`, `move=mega-punch&page=2&pageSize=4`, `pokemon=lucario`, and mobile controls with no console errors other than Angular dev/HMR info logs.
- The default route now calls `pokeapiPokemonIndex` with `limit: 4, offset: 0`; `page=3&pageSize=4` calls it with `limit: "4", offset: 8` and renders only #9-#12.
- Agent-browser QA confirmed that catalog inputs render in desktop and mobile, the page input exposes `max: "338"`, page 3 shows Blastoise/Caterpie/Metapod/Butterfree, and `move=mega-punch&page=2&pageSize=4` shows Wartortle/Blastoise/Pikachu/Raichu with no page errors.
- Remote testing QA on `https://test.zoolandingpage.com.mx/?draftDomain=pokeapi-demo.zoolandingpage.com.mx&debugWorkspace=false` confirmed first-submit native pagination keeps `draftDomain`, reaches `page=3&pageSize=4`, renders Blastoise/Caterpie/Metapod/Butterfree, and reports no page errors.

Published:

- Draft version: `20260511T223646Z-2c0cd92d5baa`.
- Runtime-bundle verification through the raw API Gateway fallback returned `sourceStage: "published"` and `versionId: "20260511T223646Z-2c0cd92d5baa"`.
- Frontend commits `6f20889` and `717be1e` were pushed to `main`, `dev`, and `test`; immediately after the push, `https://test.zoolandingpage.com.mx` still served `main-JBHFSIRU.js`, so remote browser QA was blocked by stale deployment. A Dokploy `project.all` API check with the available token returned `Unauthorized`; do not record the token in notes.

Reusable lessons:

- For large API catalogs, prefer upstream pagination for the broad default index. Use client-side loop pagination only for already-narrowed collections returned by query-specific sources.
- Do not use `appendItems` for page-index sources; replacing is correct when the same logical list changes page or page size. Reserve append/merge for enrichment sources that intentionally add fields to a selected item.
- If a card template requires repeated generated children, cache or otherwise share the parent collection view; otherwise a 4-card page can still sort/filter the same source many times.
- Avoid `@defer (on viewport)` for critical controls unless the placeholder has stable dimensions and is verified to trigger in the target layout.

### 2026-05-11 19:10 CT - PokeAPI Numeric Pagination And Filter QA

Summary:

- Added a reusable `pagination` draft component for numeric page links, previous/next links, summaries, and query-param navigation.
- Added runtime data-source mapper `metaFields` so root API metadata like PokeAPI `count` can be stored with mapped `items`.
- The PokeAPI demo uses upstream `count` for the default catalog page count and filtered collection length for query-specific views.
- Removed the visible dead `Ver ataques` card action from the main catalog and kept move filtering inside the main Pokemon list.
- Moved `thunder-shock` near the top of the attack selector and gave dropdown overlay panels a higher z-index plus scrollable menus so local debug panels do not block the demo flow.
- Reduced catalog/UI radii to 8px.

Verified locally:

- `npm run build` completed successfully.
- Focused Karma run completed with `31 SUCCESS`.
- Playwright QA on `http://127.0.0.1:4203` completed three audit passes across desktop and mobile, 30 cases total, with no browser console errors.
- Audited cases covered default page 1 (#1-#4, 338 pages at page size 4), page size 8 (169 pages), `type=electric&move=thunder-shock` (81 results, 21 pages, Pikachu/Raichu first), `pokemon=pikachu` (1 result, 1 page), numeric click to page 2 (#5 first), manual filter flow, mobile horizontal overflow, <= 8px radii, hidden old page input, and absence of `Ver ataques`.
- QA evidence: `Output/pokeapi-demo-qa/audit-final-summary.json`.

Published:

- Draft version: `20260512T010858Z-55255e7a0d81`.
- Authoring custom domain reset during push/publish; raw fallback authoring endpoint completed both operations.
- Clean local demo URL: `http://127.0.0.1:4203/?draftDomain=pokeapi-demo.zoolandingpage.com.mx&debugWorkspace=false`.
- Testing preview after frontend deployment served `main-S3XZZEDP.js`.
- Remote QA evidence: `Output/pokeapi-demo-qa/remote-final-summary.json`.

Reusable lessons:

- Prefer a reusable pagination component over per-draft numeric page inputs when API-driven lists need client-readable page buttons.
- Use API root metadata for unfiltered server-paginated totals, then fall back to filtered collection length when active query filters narrow the list locally.
- In local draft previews, `debugWorkspace=false` is the clean visual URL; localhost otherwise shows the debug workspace by default and its panels can cover lower-page controls.

### 2026-05-11 20:45 CT - PokeAPI Loading Skeletons And Stage Filter Decision

Summary:

- Added API loading skeleton sections to the PokeAPI catalog and the parameterized Pokemon detail page.
- Added per-link `scrollRestoration` and optional `navigateToUrl(..., top)` support so opening Pokemon details returns to the top without forcing global scroll behavior on all drafts.
- Fixed the condition DSL `any:` operator so it behaves like OR; the skeleton condition depends on `remoteStatus.pokemon.catalog.*.state`.
- Removed the visible Base/Evolution filter from the PokeAPI demo because the list/type/move endpoints in use do not include `evolves_from_species`.
- Removed the extra `pokeapi-catalog-search-species` runtime data source from the demo because it only existed for that stage-filter attempt.

Verified locally:

- Focused Karma run completed with `31 SUCCESS`.
- `npm run build` completed successfully.
- Playwright QA on `http://127.0.0.1:4203` completed three desktop/mobile cycles covering default load skeletons, filtered load skeletons, removed stage controls, default pagination, `type=electric&move=thunder-shock`, `pokemon=pikachu`, detail navigation scroll-top, detail skeletons, no console errors, no failed requests, and no horizontal overflow.
- QA evidence: `Output/pokeapi-demo-qa/20260511-loading-stage-audit/summary.json`.

Published:

- Draft version: `20260512T024408Z-07f94c12a922`.
- Runtime-bundle verification through the raw API Gateway runtime endpoint confirmed default and detail pages on the published version.
- Authoring publish used the raw fallback after the custom authoring domain reset during publish.
- Frontend commit `9d7543a` was pushed to `main`, `dev`, and `test`; testing later served `main-XAKQJ6IR.js`.
- Remote Playwright QA after deployment covered default desktop/mobile, `type=electric&move=thunder-shock`, and click-through detail scroll-top with no console errors, failed requests, bad responses, or horizontal overflow.
- Remote QA evidence: `Output/pokeapi-demo-qa/20260511-loading-stage-audit/remote-after-deploy-summary.json`.

Reusable lessons:

- When an external API exposes an attribute only on per-item detail endpoints, do not show broad list filters for that attribute unless the platform has an explicit enrichment/cache layer.
- Condition DSL `any:` is now safe for state-driven loading affordances; prefer specific `remoteStatus.*.state` checks over inferred empty-list checks when showing skeletons.
- Use per-link/action scroll restoration for detail-template navigation so pagination, anchors, and other draft links can keep their existing behavior.

### 2026-05-11 21:33 CT - PokeAPI Auto Search And Detail Skeleton Refinement

Summary:

- Added optional `autoSubmit` support to interaction scopes so authored drafts can choose automatic form submit behavior per event and per field.
- The PokeAPI demo enables auto-submit for dropdown-style catalog controls: `type`, `attack`, `sort`, and `pageSize`.
- Name search intentionally remains button-driven so typing in the text field does not call the API or change the URL on every keystroke.
- The demo includes an authored mode hint that says the current catalog mode is automatic for filter changes and explicit for typed search.
- Runtime data-source startup pre-marks every loadable source as `loading` before running sequential proxy reads, so filtered pages can show skeletons immediately without reintroducing concurrent request bursts.
- The parameterized Pokemon detail page no longer defaults missing `name` input to Pikachu; real detail sections render only after the selected source returns `success` and at least one item.
- The detail skeleton section now covers initial idle/loading states before the selected Pokemon appears.

Verified locally:

- Focused Karma run completed with `99 SUCCESS`.
- `npm run build` completed successfully.
- Local Playwright-core QA on `http://127.0.0.1:4203` completed three desktop/mobile cycles covering dropdown auto-search, manual text search by button, detail skeletons, hidden hero during skeleton, no default Pikachu during loading, final Charizard load, no console errors, no failed requests, no bad responses, and no horizontal overflow.
- A follow-up local check confirmed the immediate state after selecting `Electric` shows the catalog skeleton instead of `Pagina 1 de 1 · 0 resultados`, then resolves to `Pagina 1 de 29 · 114 resultados`.
- QA evidence: `Output/pokeapi-demo-qa/20260511-autosearch-detail-skeleton/summary.json`.

Published:

- Draft version: `20260512T034538Z-4f3fa36f6e09`.
- Runtime-bundle verification through the raw API Gateway runtime endpoint confirmed the published default and `pokemon-detail` pages.

Reusable lessons:

- Use interaction-scope `autoSubmit` for low-risk discrete controls such as dropdowns and segmented filters; keep free-text search explicit unless the draft has debouncing and request-volume safeguards.
- Scope auto-submit with `fieldIds` when a form mixes automatic filters and manual text inputs.
- For parameterized detail pages, avoid fallback query values that can flash the wrong entity; gate real detail sections on source status and item length, and show skeletons until the selected entity arrives.
- When runtime sources are intentionally sequential, mark every source that will load as `loading` before awaiting the first request; otherwise later filtered sources can briefly render as empty while earlier reads are still in flight.

### 2026-05-11 23:24 CT - PokeAPI Navigation Loading And Remote Closeout

Summary:

- Client-side draft navigation now pre-marks active page runtime data sources as `loading` before the runtime refresh begins.
- This closes the remote-only flash where selecting a dropdown filter could briefly show `Pagina 1 de 1 · 0 resultados` before the filtered API source completed.
- The fix preserves sequential runtime-source loading, so the draft avoids request bursts while still showing skeletons immediately.

Verified:

- Frontend commit `1004c3e` was pushed to `main`, `dev`, and `test`.
- Testing served bundle `main-2KZQTKCP.js`.
- Focused Karma run completed with `29 SUCCESS`.
- `npm run build` completed successfully.
- Remote Playwright-core QA completed three desktop/mobile cycles on `https://test.zoolandingpage.com.mx` with delayed `/api-proxy/read` calls.
- QA verified dropdown auto-search, button-only typed search, catalog loading skeletons, detail loading skeletons, no Pikachu fallback during detail loading, final Charizard state, no console errors, no failed requests, no bad responses, and no horizontal overflow.
- QA evidence: `Output/pokeapi-demo-qa/20260511-autosearch-detail-skeleton/remote-after-navigation-fix-summary.json`.

Operations:

- The Dokploy host disk-pressure incident was recovered with Docker cleanup and root-disk expansion.
- A pruned Lynx frontend image was rebuilt from its Dokploy checkout and the service returned to `1/1`.
- All Swarm services were confirmed at `1/1`.
- The temporary SSH ingress rule used for recovery was revoked after verification.

Reusable lessons:

- For History API based draft navigation, loading state must be set before the old rendered component tree has a chance to evaluate the new query params.
- Emergency Docker cleanup can remove local-only Dokploy app images; after pruning, check every Swarm service and rebuild missing images before closing access.
- Recovery notes should record the reusable procedure and outcome, not volatile IDs, IPs, credentials, or raw host-specific details.

### 2026-05-12 12:01 CT - PokeAPI Dynamic Type Options Closeout

Summary:

- The PokeAPI demo type dropdown was previously authored with a short static option list.
- Runtime data-source mappers now support `prependItems` so local options such as `Todos` can be added before API records.
- Runtime data-source field mappings now support `titleCase` so API values such as `electric`, `stellar`, and `shadow` can become friendly labels.
- `pokeapi-demo.zoolandingpage.com.mx` now loads type options from the server-only `pokeapiTypes` integration against PokeAPI `/type`, stores them at `remote.pokemon.typeOptions`, and binds the type dropdown through `valueInstructions`.
- The draft keeps a complete static fallback type list for first render or upstream failure, but the primary source is dynamic.

Published:

- Draft version: `20260512T174249Z-a3111c2c587b`.
- Frontend commit: `3c79188`.
- Testing bundle: `main-JVSVVG5U.js`.

Verified:

- Direct PokeAPI `/type?limit=100&offset=0` returned 21 type names: `normal`, `fighting`, `flying`, `poison`, `ground`, `rock`, `bug`, `ghost`, `steel`, `fire`, `water`, `grass`, `electric`, `psychic`, `ice`, `dragon`, `dark`, `fairy`, `stellar`, `unknown`, and `shadow`.
- Focused Karma run completed with `58 SUCCESS`.
- `npm run build` completed successfully.
- Local QA on `http://127.0.0.1:4203` ran three desktop/mobile cycles confirming the `pokeapiTypes` proxy read returned `200`, all type options were visible in the dropdown, selecting `Fairy` updated the catalog URL and list, and there were no console errors, failed requests, bad responses, or horizontal overflow.
- Remote QA on `https://test.zoolandingpage.com.mx` repeated the same three desktop/mobile cycles successfully after testing served `main-JVSVVG5U.js`.
- QA evidence: `Output/pokeapi-demo-qa/20260512-dynamic-types-local/summary.json` and `Output/pokeapi-demo-qa/20260512-dynamic-types-remote/summary.json`.

Reusable lessons:

- Prefer dynamic runtime option sources for API-owned enumerations instead of committing incomplete static lists into drafts.
- Keep a complete static fallback when the control is critical to first render or must remain usable if the upstream enum endpoint is temporarily unavailable.
- Use `mapper.prependItems` for author-owned sentinel options such as `Todos`; do not require upstream APIs to provide local UI control values.

### 2026-05-12 12:47 CT - PokeAPI Special Types And Boot Curtain Closeout

Summary:

- Direct PokeAPI checks showed `stellar`, `unknown`, and `shadow` are exposed by `/type`, but each currently has `pokemonCount: 0`; `shadow` only returned moves.
- The PokeAPI demo type dropdown now keeps the dynamic PokeAPI source, but requests the 18 standard Pokemon types and keeps the static fallback aligned to that same set.
- The boot curtain early-release path now requires static stylesheet coverage for SSR-rendered classes before removing the curtain.
- If SSR content exists but its authored classes are not covered by static CSS yet, the curtain stays visible until Angular and Angora finish the normal CSS-ready removal path.

Published:

- Draft version: `20260512T183326Z-2a869fdc8d7d`.
- Frontend commit: `43cce76`.
- Testing bundle: `main-3NKXSM4W.js`.

Verified:

- Direct PokeAPI calls returned `pokemonCount: 0` for `stellar`, `unknown`, and `shadow`, and `pokemonCount: 88` for `fairy`.
- Focused Karma run completed with `4 SUCCESS`.
- `npm run build` completed successfully.
- Remote Playwright QA completed three desktop/mobile cycles on `https://test.zoolandingpage.com.mx/?draftDomain=pokeapi-demo.zoolandingpage.com.mx&debugWorkspace=false`.
- QA verified the boot curtain remains visible immediately after `load`, the final hydrated page removes the curtain, the type dropdown contains `Todos` plus the 18 standard types, `Shadow`/`Unknown`/`Stellar` are absent, selecting `Fairy` returns `Pagina 1 de 22 · 88 resultados`, and there are no console errors, failed requests, bad responses, or horizontal overflow.
- QA evidence: `Output/pokeapi-demo-qa/20260512-special-types-curtain/summary.json`.

Reusable lessons:

- When an upstream enum endpoint mixes standard values with special/internal buckets, verify whether each value has usable records before exposing it as a client-facing filter.
- For SSR plus deferred hydration, do not remove the static boot curtain just because SSR text exists; first confirm the classes rendered above the fold have static CSS coverage, or wait for the Angora CSS-ready path.

### 2026-05-13 03:44 CT - PokeAPI Attack Filter Fallback Closeout

Summary:

- `generic-input` select options can now stay dynamic through `options.source`, but the PokeAPI attack filter needed a complete authored fallback because deferred hydration can leave the dropdown usable before the live `pokeapiMoves` source completes.
- The PokeAPI demo attack dropdown now binds to `remote.pokemon.moveOptions.items` and carries a full 938-option fallback generated from PokeAPI `/move?limit=2000&offset=0`.
- The Pokemon name search input keeps `autocompleteMinLength: 3`; typing in that text field remains button-only and does not auto-submit.

Published:

- Draft version: `20260513T091851Z-d50bad5f481b`.
- App frontend commit already deployed before this draft-only publish: `98bc279`.

Verified:

- Runtime-bundle verification confirmed the published draft version, 938 fallback attack options, `shadow-sky`, `pound`, and `autocompleteMinLength: 3`.
- Remote Playwright-core QA ran three cycles on `https://test.zoolandingpage.com.mx`.
- QA verified 938 attack options on the home route and filtered route, `Shadow Sky` present, `Mega Punch` visually selected after navigating from Charizard detail, filtered summary `Pagina 1 de 58 · 231 resultados`, no Pokemon detail API reads while typing in the search input, autocomplete hidden at 2 characters and showing bounded suggestions at 3 characters, and zero mobile horizontal overflow.
- QA evidence: `Output/pokeapi-demo-qa/20260513-attack-filter-audit/summary.json`.

Reusable lessons:

- For critical API-backed select controls, dynamic option sources should keep complete static fallbacks when the control must be correct before deferred hydration or when the upstream enum endpoint might be temporarily unavailable.
- Audit free-text autocomplete separately from selector auto-submit; request-volume safeguards should verify no detail/search API source fires while the user is only typing.

### 2026-05-13 13:41 CT - PokeAPI Design Polish Closeout

Summary:

- Reviewed the PokeAPI demo visual design across home, catalog, and detail templates.
- Tightened the light and dark palettes, reduced the rounded-corner treatment, compacted the top/detail bars, refined card spacing, and corrected action display classes that were making some controls stretch.
- Replaced the detail caption that exposed runtime status text with authored copy.
- Fixed a shared static CSS collision by renaming generic section hooks to draft-prefixed hooks such as `pokeSectionEyebrow`.

Published:

- Draft version: `20260513T194134Z-28891ce3529b`.

Verified:

- `node --test tools/tests/critical-css.spec.mjs` completed successfully.
- `npm run build` completed successfully.
- Local draft smoke check passed against local SSR on desktop and mobile for `/` and `/pokemon`.
- Browser QA ran three cycles across desktop/mobile home, filtered catalog, and Charizard detail with no console errors, failed requests, bad responses, horizontal overflow, stuck loaders, or broken images.
- QA evidence: `Output/pokeapi-demo-qa/20260513-design-review-after/browser-qa-3-cycles-final.json`.

Reusable lessons:

- Avoid broad semantic class names in draft combo hooks when they can collide through the shared generated Angora stylesheet; prefer draft-prefixed hooks for reusable but draft-specific presentation classes.

### 2026-05-13 14:47 CT - Browser Hydration Loader Follow-up

Summary:

- Testing QA after the PokeAPI design publish found the boot curtain could remain visible over rendered content when browser-only runtime services used optional `REQUEST` absence as part of their browser guard.
- Browser-side services now use `PLATFORM_ID`/`isPlatformBrowser(...)` to decide whether browser work can run; `REQUEST` remains only where SSR request URL/header data is needed.
- Config and runtime data-source services follow the same rule so browser navigation and query-driven API reads use `window.location`, not a stale SSR request object.
- The runtime CSS-ready fallback now releases the curtain after 4 seconds instead of waiting the previous longer timeout.
- An experimental static-stylesheet shortcut in `AngoraCombosService` was discarded because it did not measurably improve this draft and touched shared runtime behavior.

Reusable lessons:

- Do not use optional `REQUEST` as a browser/hydration discriminator in Angular SSR; browser hydration can still provide request context. Use platform detection for runtime browser work.
- Prefer a conservative timeout fallback over broad runtime optimizations when a loader bug is caused by readiness detection.

### 2026-05-13 15:58 CT - Boot Curtain Static Coverage Closeout

Summary:

- The PokeAPI design QA found the boot curtain could visually cover the first viewport while already in its `leaving` state because the fixed wrapper kept its opaque background after the split panels moved.
- The leaving state now makes the wrapper background transparent so delayed DOM removal cannot hide rendered content.
- Static coverage now ignores the generic `btnIcon` hook class because it is a component hook, not a draft-owned style class; this lets covered SSR content release the curtain early.

Verified:

- `npm run build` completed successfully.
- Local Playwright design QA ran three cycles across desktop/mobile home, fire-filter catalog, electric + `thunder-shock` catalog, and Charizard detail.
- The stable-image QA returned 18/18 passing checks with no stuck curtain, no `SUCCESS` leak, no debug workspace leak, no horizontal overflow, and no broken visible images after image-load stabilization.
- QA evidence: `Output/pokeapi-demo-qa/20260513-design-review-after/design-qa-3-cycles-final-stable-images.json`.

Reusable lessons:

- Static boot-curtain release should distinguish missing visual coverage from harmless component hook classes.
- A fixed loading overlay should have a visually transparent leaving state even when a removal timer is expected to clean up the element.
