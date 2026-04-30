# Platform Operations And Recovery Lessons

Date: 2026-04-19 (Central Time)
Scope: Sanitized operational lessons promoted from verified platform incidents and recovery work.
Status: Active
Applies To: Zoolanding platform hosting, tenant routing, and host recovery workflows
Source Of Truth:

- Sanitized from verified platform recovery work completed on 2026-04-04

Confidence: Medium to high
Last Reviewed: 2026-04-27 (Central Time)

## Public Routing Lesson

If multiple tenant-backed public domains fail at once while the direct management surface still works, check the shared edge or tenant-base origin first. A stale shared origin can break many public domains at the same time even when DNS and application config look healthy.

## Host Recovery Lesson

Keep Systems Manager access available on the active host so recovery does not depend only on SSH. If SSH fails, Systems Manager can provide the control path needed to restore service and then repair SSH separately.

## Service Recovery Lesson

After edge routing is repaired, verify the actual application service state on the active host before declaring the incident closed. A broken container image or missing local image can keep the site down even after the edge layer is healthy again.

## Dokploy Build Host Resource Lesson

If a Dokploy-hosted Angular SSR app repeatedly fails during test deploys, check host memory, swap, root-disk pressure, and Docker build cache before assuming the application code is the root cause. A host can pass system status checks after reboot while still being vulnerable to the next local production build if it has no swap and little free disk.

## Edge Verification Lesson

If CloudFront-backed domains still look broken after the origin host recovers, confirm the edge-to-origin path before changing host routing again. Traefik access logs can prove whether CloudFront is still reaching the origin over HTTP and receiving `200` responses even when some local CLI clients report TLS or connection-reset errors.

On Windows recovery work, do not trust one failing client alone. `curl.exe` and Node or undici may show `ECONNRESET` while PowerShell `Invoke-WebRequest`, .NET `HttpClient`, and Traefik access logs show the public page is actually serving correctly through CloudFront.

If the browser itself fails with connection resets while direct Dokploy/Traefik HTTPS is healthy, isolate app domains from the shared app edge before changing API or asset routing. Keep API and asset CloudFront distributions separate when they are healthy.

## SSR Runtime Fallback Lesson

If browser fetches to the stable API custom domain are healthy but Node or undici requests from the SSR container intermittently fail with transport resets, keep the browser-facing base URL on the custom domain and add a server-only fallback for `runtime-bundle` to the raw runtime-read origin base. That isolates the issue to SSR transport without changing public browser URLs or alias resolution behavior.

## Traefik Forwarded Header Lesson

Angular SSR deopts to a client-side shell when reverse-proxy `X-Forwarded-*` headers are present but not trusted by the server engine. For Dokploy/Traefik deployments, keep `src/server.ts` `trustProxyHeaders` aligned with the headers Traefik injects and keep Angular `allowedHosts` restricted to the public domains. A public page that returns `200` with a title but no `<main>` should be treated as an SSR deopt, not a successful page render.

## Security Rule

Do not copy instance identifiers, PEM paths, security-group details, or operator IP details into committed notes. Keep volatile operational specifics out of the canonical tree.
