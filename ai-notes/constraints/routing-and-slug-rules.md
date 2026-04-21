# Routing And Slug Rules

Date: 2026-04-19 (Central Time)
Scope: Shared rules for authored paths, aliases, and draft-safe route ids.
Status: Active
Applies To: Local draft routing and multi-page draft work
Source Of Truth:

- `docs/11-draft-lifecycle.md`
- `docs/DEVELOPER_ONBOARDING.md`
- Promoted from local draft notes and findings

Confidence: High
Last Reviewed: 2026-04-19 (Central Time)

## Preview Rules

- Use `draftDomain` and `draftPageId` in local preview URLs so draft resolution stays explicit.
- Do not embed those query parameters into authored navigation links.

## Authored Route Rules

- Prefer safe internal route ids such as `contact` over accented or fragile ids inside payloads.
- Preserve live-like routes through aliases or route metadata when the public site needs them.
- Keep folder names, payload domain values, aliases, and canonical origins aligned.

## Drift Checks

When a route behaves strangely, verify:

1. draft folder name
2. payload `domain` values
3. authored links
4. local preview query parameters
5. alias and canonical config

Record any durable mismatch in a local note or distill the reusable rule here.
