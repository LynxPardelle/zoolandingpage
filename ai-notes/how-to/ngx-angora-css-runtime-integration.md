Date: 2026-05-01 (Central Time)
Scope: Repeatable procedure for integrating `ngx-angora-css` runtime generation in Zoolandingpage drafts.
Status: Active
Applies To: Angular runtime rendering, draft payload combos, debug workspace, browser QA
Source Of Truth:

- `src/app/shared/services/angora-combos.service.ts`
- `src/app/core/services/runtime.service.ts`
- `src/app/core/components/app-shell/app-shell.component.ts`
- `src/index.html`
- `package.json`
- `node_modules/ngx-angora-css/lib/ngx-angora.service.d.ts`

Confidence: High
Last Reviewed: 2026-05-01 (Central Time)

# Ngx Angora CSS Runtime Integration

## Runtime Pattern

1. Keep the Angora stylesheet targets in `src/index.html`: `/css/animations.css`, `/css/angora-styles.css`, and `/css/angora-styles-responsive.css`.
2. Register draft and auxiliary combo payloads through `AngoraCombosService`; do not scatter `pushCombos()` or `cssCreate()` calls across components.
3. Wrap combo replacement in `NgxAngoraService.runInCssCreateBatch(...)` so removed combos and merged combos flush as one library-managed pass.
4. After dynamic roots render, collect the rendered component classes once, normalize/dedupe them, and choose the creation path by class type.
5. If the rendered batch contains any registered combo class key, run one full `cssCreate()` post-render pass. Combo keys such as `btnBase` do not have an `ank-property-value` shape, so they require the library DOM scan and combo parser.
6. If the rendered batch contains only direct Angora utility classes or known abbreviation utilities, call the faster explicit `cssCreate([...])` path.
7. Use the MutationObserver only to request the rendered-class refresh. Do not also schedule a full `cssCreate()` for the same mutation.

## Local Library Debugging

Use the local `ngx-angora-css` workspace when app and library behavior must be debugged together:

```powershell
npm run angora:build-local
npm run angora:link-local
npm start -- --port 4201
```

`angora:link-local` points `node_modules/ngx-angora-css` at `../ngx-angora-css/dist/ngx-angora-css-library` without saving a file dependency. After changing library code, rebuild the library and restart the app dev server.

To return the app to the registry package:

```powershell
npm run angora:restore-registry
```

## Debugging

- Prefer the library debug APIs over DOM hooks: `getCssCreateHistory()`, `getCssCreateDebugSummary()`, `getCssCreateDebugSnapshot()`, and `clearCssCreateHistory()`.
- On local hosts, use `window.__zlpAngoraDebug` from the browser console for app-level debugging. It exposes applied combo keys, replayed rendered classes, class-management checks, CSS creation history, CSS creation summaries, snapshots, and manual full-create/update helpers.
- A future debug workspace panel should read those APIs from the injected `NgxAngoraService` or the local debug bridge and show recent class-generation timings, pending class counts, and repeated calls.
- The old `#ankTimer` hook is not required for this app and should not be reintroduced.

## Browser QA

1. Run unit tests for `AngoraCombosService` and app-shell runtime scheduling.
2. Run the full Karma suite.
3. Run `npm run build` and `npm audit --omit=dev`.
4. Run local draft smoke checks against the active dev-server URL with live checks disabled when the task is local-only.
5. In desktop and mobile viewports, audit at least one heavy draft and one smaller draft for console errors, rendered heading/body content, Angora managed stylesheet rule counts, and duplicate exact rules.
6. For duplicate checks, wait until after the first post-render pass. A CSSOM sample taken too early can report empty Angora rules even though the runtime later fills the stylesheets.
7. When comparing local and testing environments, expect `window.__zlpAngoraDebug` only on local hosts. Use computed styles and CSSOM rule counts for testing-host comparisons unless a temporary testing-only debug build is explicitly deployed.
8. If the official draft smoke checker hangs without progress output, use a scoped Playwright CSSOM check against the local dev server on `4201`. Local production SSR on `4300` is still useful for Lighthouse on the main Zoo draft, but some other local draft domains can fall back to the public API and hit CORS from `127.0.0.1`.

## Future Library Improvements

- Add an official Angular helper that coalesces after-render class-list refreshes and exposes a debug signal or observable for the new timing/history data.
- Add a registration mode that updates combos/colors without forcing a full DOM scan until the host app explicitly asks for the first rendered-class pass.
- Expose an optional duplicate-rule audit helper in `ngx-angora-css` so consuming apps can run the same check without custom Playwright scripts.
