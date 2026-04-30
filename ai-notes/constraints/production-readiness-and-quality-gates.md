# Production Readiness And Quality Gates

Date: 2026-04-19 (Central Time)
Scope: Shared release-readiness and quality-gate expectations for AI-authored landings.
Status: Active
Applies To: All draft-to-release workflows
Source Of Truth:

- `docs/11-draft-lifecycle.md`
- `.github/skills/zoolanding-frontend-workflow/references/repo-checklist.md`
- Promoted from local draft findings

Confidence: High
Last Reviewed: 2026-04-30 (Central Time)

## Minimum Gates

Before calling a landing production-ready, confirm:

1. approved intake and business facts
2. structural payload validation
3. semantic completeness review
4. security gate status
5. build status and warning triage
6. deterministic test status
7. manual desktop and mobile QA
8. analytics and consent verification
9. localization review where applicable
10. release verdict recorded in a readiness note

## Lighthouse Gates

When remediating Lighthouse findings for a public SSR landing:

1. Do not remove `src/index.html` stylesheet targets just because the same files appear in `angular.json`. The Angora runtime may depend on those stylesheet surfaces for generated classes; prove visual parity on desktop and mobile before changing that path.
2. Keep initial render free of non-render-critical analytics, quick-stat increments, route prefetches, and third-party enrichment calls. Schedule that work after the first successful browser bootstrap.
3. Apply HTTP compression in the active deployment path. `nginx.conf` only helps no-SSR/static deployments; SSR deployments also need compression in `src/server.ts` or at the platform proxy.
4. Avoid `aria-selected` on native disclosure buttons. Reserve it for widgets with a selectable role, such as `role="tab"`.
5. Treat `consentUI: "none"` as a data-minimization mode. Do not collect raw IP, precise geolocation, raw cookies, or battery details unless a separate consent and compliance review approves it.
6. Keep `optimization.styles.inlineCritical` disabled while Angora runtime CSS link targets are present in `src/index.html`; Angular cannot inline those runtime/public stylesheet URLs reliably and will emit misleading absolute-path warnings.
7. Confirm SSR waits for authored runtime config before rendering. A public `200` response with only the CSR shell can inflate CLS and break no-JS crawlability even when `/health` and the runtime API are healthy.
8. Confirm hydration does not duplicate the initial runtime bootstrap. The browser should not clear SSR-rendered roots before the same authored config is ready.

## Common Blockers

- placeholder business facts or unapproved legal copy
- unresolved dependency vulnerabilities
- unstable test exits despite passing assertions
- build warnings that lower production confidence
- missing lint or smoke-test coverage
- no manual QA evidence

## Reusable Rule

A payload can be structurally valid and still fail release readiness. Keep readiness notes separate from payload-generation notes so future agents do not confuse "draft works" with "safe to publish."
