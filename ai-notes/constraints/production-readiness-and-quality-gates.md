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
Last Reviewed: 2026-04-19 (Central Time)

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

## Common Blockers

- placeholder business facts or unapproved legal copy
- unresolved dependency vulnerabilities
- unstable test exits despite passing assertions
- build warnings that lower production confidence
- missing lint or smoke-test coverage
- no manual QA evidence

## Reusable Rule

A payload can be structurally valid and still fail release readiness. Keep readiness notes separate from payload-generation notes so future agents do not confuse "draft works" with "safe to publish."
