# Shared Edge Origin Drift Recovery Pattern

Date: 2026-04-20 (Central Time)
Scope: Sanitized reusable incident pattern where many tenant-backed public domains fail at once because a shared edge origin drifts from the active host.
Status: Active reference
Applies To: Edge-routed public domains, tenant routing, and host recovery triage
Source Of Truth:

- Sanitized from verified platform incident and recovery work completed on 2026-04-04

Confidence: Medium to high
Last Reviewed: 2026-04-20 (Central Time)

## Summary

Multiple public domains can fail simultaneously even when draft payloads, runtime APIs, and DNS records look healthy if they inherit a stale shared edge origin. Correcting the shared origin may restore routing, but final recovery can still require application-service repair on the active host.

## User-Visible Symptoms

- multiple public domains fail at once
- failures vary between 502, 504, connection resets, or generic edge error pages
- the direct management surface or host may still appear reachable
- runtime or authoring APIs may remain healthy, which can mislead triage

## Root Cause Pattern

- public domains inherit a shared base edge distribution or routing layer
- that shared layer still points at a retired or incorrect upstream host
- the active host may also have stale service state, so fixing the edge layer alone is not always enough

## Recovery Pattern

1. Confirm whether the failing domains share a common edge or tenant-routing layer.
2. Compare the configured shared origin with the active host that should currently serve the application.
3. Correct the shared origin first.
4. Verify the actual application service state on the active host.
5. If SSH is unavailable, use an alternate management path such as Systems Manager or a serial console.
6. Repair broken application services or missing images before declaring recovery complete.
7. Flush or invalidate caches only after origin and service health are both correct.

## Durable Lessons

- when many tenant-backed domains fail together, inspect shared edge inheritance before debugging each site individually
- treat runtime and authoring API health as separate from edge and host recovery
- keep alternate management access available on the active host
- verify container or process health after edge routing is fixed

## Security Rule

Do not record distribution IDs, instance IDs, hostnames, IP allowlists, PEM paths, or other volatile identifiers in committed notes. Keep those details in local-only incident material if they are needed at all.
