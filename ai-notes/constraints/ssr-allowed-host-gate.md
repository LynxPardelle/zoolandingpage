Date: 2026-06-04 (Central Time)
Scope: SSR host validation for published draft domains and aliases.
Status: Active
Applies To: `src/server.ts`, `angular.json` `security.allowedHosts`, runtime domain resolution, Dokploy/Traefik routing
Source Of Truth:

- `src/server.ts`
- `docs/06-deployment.md`
- `node_modules/@angular/ssr/fesm2022/validation.mjs`
- `node_modules/@angular/ssr/fesm2022/node.mjs`

Confidence: High
Last Reviewed: 2026-06-04 (Central Time)

# SSR Allowed Host Gate

## Rule

- Do not add every newly published branded domain to `angular.json` as an operational hotfix.
- Express must validate `Host` and `X-Forwarded-Host` before Angular SSR handles a request.
- A host is allowed only when it matches a static approved family already served by the app or resolves to a local/runtime `site-config` whose `domain`, `aliases`, environment aliases, or `site.hostOverrides` include that exact host.
- After validation, pass the exact validated host set into `AngularNodeAppEngine` so Angular's built-in SSR host check still runs without using `*`.

## Why It Exists

- Angular SSR validates request URL hostnames and host-like headers before render to reduce SSRF and host-header risk.
- Published runtime config can add valid branded domains faster than the app container is rebuilt, so a static `angular.json` list can reject a correctly routed public domain.
- Accepting all hosts at Angular without an app-level gate would make canonical URL poisoning, cache poisoning, and preview query abuse easier.

## How To Work Safely

1. Publish or update the draft runtime config first so the canonical domain and aliases resolve through the runtime API.
2. Sync DNS, TLS, and Traefik/Dokploy routing for the public host.
3. Run `npm run ssr:smoke` after changes to `src/server.ts`, `angular.json` host security, or front-door routing.
4. Verify unknown custom hosts return a host rejection, published canonical hosts render, published aliases resolve, `test.zoolandingpage.com.mx` still supports `draftDomain` preview, and production hosts ignore cross-draft `draftDomain` query params.
