Date: 2026-05-18 (Central Time)
Scope: Sanitized runtime API front-door reset investigation.
Status: Active; SSR mitigation added
Applies To: `api.zoolandingpage.com.mx`, runtime-read `runtime-bundle`, SSR runtime bootstrap, operational probes
Source Of Truth:

- Probe command output saved under local ignored `logs/runtime-front-door-probe-despacho-*.md` and `logs/runtime-front-door-probe-despacho-c10-json-20260518.json`
- AWS CloudFront distribution config query for `api.zoolandingpage.com.mx`
- AWS API Gateway stage and metric queries for `zoolanding-config-runtime-read`
- Lambda log sample query for runtime-read

Confidence: Medium
Last Reviewed: 2026-05-18 (Central Time)

# Runtime Front-Door Transient Resets

## Summary

- 2026-05-18 21:24:29 CT probe, 200 requests per target, concurrency 10:
  - custom domain: 168 success, 32 failure, 16.00% failure; errors were 14 `ECONNRESET` transport failures and 18 HTTP `500`
  - raw API Gateway: 180 success, 20 failure, 10.00% failure; errors were 20 HTTP `500`
- 2026-05-18 21:26:42 CT probe, 100 requests per target, concurrency 1:
  - custom domain: 100 success, 0 failure
  - raw API Gateway: 100 success, 0 failure
- 2026-05-18 21:27:51 CT probe, 150 requests per target, concurrency 3:
  - custom domain: 143 success, 7 failure, 4.67% failure; all failures were `ECONNRESET`
  - raw API Gateway: 150 success, 0 failure
- 2026-05-18 21:30:14 CT probe, 50 requests per target, concurrency 10:
  - custom domain: 37 success, 13 failure, 26.00% failure; 6 `ECONNRESET`, 7 HTTP `500`
  - raw API Gateway: 46 success, 4 failure, 8.00% failure; all HTTP `500`
- HTTP `500` body prefix was `{"message": "Internal server error"}`
- 2026-05-18 21:57 CT mitigation: `src/server.ts` auxiliary runtime reads now prefer the server-only raw runtime-read fallback before the custom API domain. `npm run ssr:smoke` validates that a fallback base with `/Prod` reaches `/Prod/runtime-bundle` and that the custom-domain base is not called when the fallback succeeds.

## User-Visible Symptoms

- Node/undici and `curl.exe` can report transient custom-domain runtime failures.
- Retrying usually succeeds.
- SSR should continue to prefer the raw runtime-read fallback for server-side bootstrap because sequential raw and custom probes were stable, while concurrent custom-domain probes still reset.

## Root Cause Pattern

- Basic DNS/TLS and sequential runtime-read behavior were not the failing surface in this probe.
- At concurrency 3, raw API Gateway stayed clean while the custom domain returned `ECONNRESET`, so CloudFront/custom-domain transport remains implicated for moderate burst resets.
- At concurrency 10, raw API Gateway also returned HTTP `500`, and API Gateway `5XXError` metrics showed spikes during probe windows. That indicates a second origin/API Gateway integration failure mode under heavier burst load.
- Runtime-read Lambda sampled logs around the probe window showed `START`, `END`, and `REPORT` entries without visible stack traces in the sampled output. Immediate Lambda `Errors` and `Throttles` metric queries did not return datapoints, so those metrics did not prove Lambda handler exceptions or throttling in this pass.
- API Gateway stage access logs and tracing were disabled, and CloudFront standard logging was disabled, so request-level attribution between CloudFront, API Gateway integration, and Lambda could not be completed from logs.

## Recovery Pattern

1. Keep `configApiServerFallbackUrl` / raw runtime-read fallback active for SSR, and keep `CONFIG_API_SERVER_FALLBACK_URL` / `CONFIG_API_RUNTIME_FALLBACK_URL` aligned when the raw endpoint changes.
2. Keep retry/backoff support in local authoring and ops tools when using custom API domains.
3. Use `node tools/ops/probe-runtime-front-door.mjs` for before/after measurements. Do not declare the reset fixed from a single successful request.
4. Enable API Gateway access logs or execution logs for runtime-read before the next deep investigation, then repeat the concurrency 3 and concurrency 10 probes.
5. Enable CloudFront standard or real-time logs if custom-domain resets need request-level confirmation.
6. Test CloudFront changes one at a time, especially origin keepalive/timeout and viewer HTTP version behavior, then rerun the same probes.

## Durable Lessons

- Separate probes by concurrency. Sequential success can hide burst-only reset behavior.
- Compare custom-domain and raw API Gateway endpoints in the same run; if raw is clean and custom resets, focus on CloudFront/custom-domain transport.
- If raw also returns HTTP `500`, check API Gateway metrics/logs before changing frontend or SSR code.
- Do not touch configurable 404 logic for this failure mode unless a probe proves route resolution regressed.

## Security Rule

- Keep account IDs, instance IDs, raw ARNs, private IPs, and operator-specific host details out of committed notes. Use sanitized service names and public hostnames only.
