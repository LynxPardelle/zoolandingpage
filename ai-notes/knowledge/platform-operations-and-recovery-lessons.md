# Platform Operations And Recovery Lessons

Date: 2026-04-19 (Central Time)
Scope: Sanitized operational lessons promoted from verified platform incidents and recovery work.
Status: Active
Applies To: Zoolanding platform hosting, tenant routing, and host recovery workflows
Source Of Truth:

- Sanitized from verified platform recovery work completed on 2026-04-04

Confidence: Medium to high
Last Reviewed: 2026-04-30 (Central Time)

## Public Routing Lesson

If multiple tenant-backed public domains fail at once while the direct management surface still works, check the shared edge or tenant-base origin first. A stale shared origin can break many public domains at the same time even when DNS and application config look healthy.

## Host Recovery Lesson

Keep Systems Manager access available on the active host so recovery does not depend only on SSH. If SSH fails, Systems Manager can provide the control path needed to restore service and then repair SSH separately.

## Service Recovery Lesson

After edge routing is repaired, verify the actual application service state on the active host before declaring the incident closed. A broken container image or missing local image can keep the site down even after the edge layer is healthy again.

## Dokploy Build Host Resource Lesson

If a Dokploy-hosted Angular SSR app repeatedly fails during test deploys, check host memory, swap, root-disk pressure, and Docker build cache before assuming the application code is the root cause. A host can pass system status checks after reboot while still being vulnerable to the next local production build if it has no swap and little free disk.

If a Dokploy deploy fails quickly with `ENOSPC` during `npm install` inside Docker, the old healthy container can continue serving traffic while the app status remains `error`. Free unused Docker images/build cache without pruning data volumes, then reduce build disk pressure by using lockfile-based installs and local project tooling instead of global CLI installs inside the image. If switching Docker builds to `npm ci`, make sure `.dockerignore` does not exclude `package-lock.json`.

## Edge Verification Lesson

If CloudFront-backed domains still look broken after the origin host recovers, confirm the edge-to-origin path before changing host routing again. Traefik access logs can prove whether CloudFront is still reaching the origin over HTTP and receiving `200` responses even when some local CLI clients report TLS or connection-reset errors.

On Windows recovery work, do not trust one failing client alone. `curl.exe` and Node or undici may show `ECONNRESET` while PowerShell `Invoke-WebRequest`, .NET `HttpClient`, and Traefik access logs show the public page is actually serving correctly through CloudFront.

If the browser itself fails with connection resets while direct Dokploy/Traefik HTTPS is healthy, isolate app domains from the shared app edge before changing API or asset routing. Keep API and asset CloudFront distributions separate when they are healthy.

For browser-rendered media served from the asset CDN, add only bounded client retries with cache-busting when transient resets are observed. A recovered image retry improves user resilience, but it must not be recorded as a root-cause fix for CloudFront, TLS, DNS, or origin resets; keep probing the asset/API front doors separately.

## SSR Runtime Fallback Lesson

If browser fetches to the stable API custom domain are healthy but Node or undici requests from the SSR container intermittently fail with transport resets, keep the browser-facing base URL on the custom domain and add a `runtime-bundle` fallback base that points to the raw runtime-read origin. SSR should prefer that raw endpoint first; the browser can also prefer it when CORS allows public reads so Lighthouse does not record transient custom-domain resets as console failures. That isolates runtime bootstrap transport and reduces document TTFB without changing alias resolution behavior.

Apply the same raw-first rule to Express-side auxiliary SSR helpers, not only to Angular services. Helpers that build robots, sitemaps, 404 decisions, or route metadata can still touch runtime-read before Angular renders; they should honor `CONFIG_API_SERVER_FALLBACK_URL` / `CONFIG_API_RUNTIME_FALLBACK_URL` and preserve API Gateway stage path prefixes such as `/Prod`.

## SSR Bootstrap Timing Lesson

If a deployed Angular SSR container returns a small HTML shell with no `<main>` while the runtime API is reachable from inside the container, check whether runtime config initialization is blocking the server render. Component constructor fire-and-forget initialization can pass local Docker checks when the API is fast, then fail on Dokploy when remote runtime-bundle latency is higher. Keep server-side runtime bootstrap in an Angular server app initializer so SSR waits for the authored config before rendering.

Hydration needs the same first runtime identity as SSR. If the browser starts with empty runtime roots and only fetches config after component render, Angular can briefly remove the server-rendered tree and recreate it after the runtime bundle arrives. Use the shared app initializer for browser bootstrap too, and make the runtime connection path skip duplicate initial loads after the initializer succeeds.

For public SSR routes backed by remote config, cache `runtime-bundle` responses briefly in the server process by request identity. This keeps repeated page requests and health-check-warmed Lighthouse runs from paying remote runtime-read latency on every document render while still letting newly published drafts roll forward after the short TTL.

## SSR Critical CSS Lesson

When Angora runtime CSS generates layout utilities after the document has already painted, SSR can briefly show geometry that the hydrated client later fixes. Treat responsive display utilities and first-viewport spacing utilities as critical CSS, especially when they control mutually exclusive desktop/mobile header variants. A no-JS SSR inspection that shows both variants visible is a reliable signal that Lighthouse CLS will regress even if manual hydrated QA looks visually correct.

## Automated Audit Telemetry Lesson

Do not send remote analytics or quick-stats mutations for Lighthouse/PageSpeed user agents. Synthetic audits should still render and buffer local events as normal, but they should not create production telemetry or fail Best Practices because an unrelated analytics transport resets during the audit window.

For browser automation, also check `navigator.webdriver` in addition to Lighthouse/PageSpeed user-agent tokens. Headless Chrome audits can present a generic Chrome user agent while still setting the WebDriver flag; using both signals prevents analytics and sibling-route prefetches from becoming synthetic audit work.

## Authoring Endpoint Fallback Lesson

If the config-authoring custom domain intermittently fails with `ECONNRESET`, keep retry/fallback support to the raw API Gateway endpoint in local tooling. A successful fallback response should still be reported in closeout notes because repeated primary resets are an operational signal, even when the draft push or publish completes with `ok: true`.

## Traefik Forwarded Header Lesson

Angular SSR deopts to a client-side shell when reverse-proxy `X-Forwarded-*` headers are present but not trusted by the server engine. For Dokploy/Traefik deployments, keep `src/server.ts` `trustProxyHeaders` aligned with the headers Traefik injects and keep Angular `allowedHosts` restricted to the public domains. A public page that returns `200` with a title but no `<main>` should be treated as an SSR deopt, not a successful page render.

## Traefik Provider Compatibility Lesson

If a Dokploy app is healthy on its container port but public requests return Traefik `404`, verify whether Traefik actually loaded the route. Check Traefik's HTTP router API and logs before changing DNS. A Docker Engine upgrade or API-version mismatch can break Traefik's Docker/Swarm providers, leaving Docker labels ignored while file-provider routes continue to work.

For incident containment, a sanitized file-provider route can restore a known healthy app domain without moving Microsoft-managed DNS or email records. Treat that as a temporary recovery path: repair the provider compatibility afterward, keep the route target tied to a stable container or service name, and avoid committing tokens, host identifiers, raw environment values, or customer-sensitive details in recovery notes.

## Managed Alias Front-Door Lesson

`site-config.json.aliases` is necessary for runtime-read alias resolution, but it is not sufficient for public traffic. Managed aliases under `*.zoolandingpage.com.mx` also need Route 53 records, Traefik file-provider routers, and TLS issuance through the active front door. Use the repeatable sync tool and keep operational inputs in environment variables or CLI flags instead of committing host-specific values.

Before replacing a Traefik dynamic file through SSM, create a remote backup in the same host-side dynamic-config area. Validate with DNS, HTTPS home, HTTPS invented-route 404, and browser desktop/mobile checks before considering the alias live.

## Upload Binary Recovery Lesson

For CMS-style apps that store file metadata in MongoDB and binary files on disk, a database restore is not a complete content restore. If public pages show broken images after deployment or host recovery, compare the populated file metadata with the mounted `uploads/` directories. Back up and restore uploaded binaries with the same discipline as the database, and use temporary placeholders only when the approved original asset cannot be recovered.

When migrating a small CMS upload tree to S3 after an incident, preserve the existing metadata contract if the frontend already stores only filenames. Keep the database `File.location` values stable, copy local `uploads/{category}/{filename}` objects to a versioned bucket under the same key shape, and have existing `get-file` routes redirect to the S3 public URL with a local fallback. Add a scheduled host sync for legacy paths until every upload endpoint writes directly to S3, and verify local count/bytes match S3 before relying on the bucket for recovery.

## Security Rule

Do not copy instance identifiers, PEM paths, security-group details, or operator IP details into committed notes. Keep volatile operational specifics out of the canonical tree.
