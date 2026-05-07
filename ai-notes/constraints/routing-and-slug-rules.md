# Routing And Slug Rules

Date: 2026-05-07 (Central Time)
Scope: Shared rules for authored paths, aliases, draft-safe route ids, and internal navigation scroll behavior.
Status: Active
Applies To: Local draft routing and multi-page draft work
Source Of Truth:

- `docs/11-draft-lifecycle.md`
- `docs/DEVELOPER_ONBOARDING.md`
- Promoted from local draft notes and findings

Confidence: High
Last Reviewed: 2026-05-07 (Central Time)

## Preview Rules

- Use `draftDomain` and `draftPageId` in local preview URLs so draft resolution stays explicit.
- Do not embed those query parameters into authored navigation links.

## Authored Route Rules

- Prefer safe internal route ids such as `contact` over accented or fragile ids inside payloads.
- Preserve live-like routes through aliases or route metadata when the public site needs them.
- Keep folder names, payload domain values, aliases, and canonical origins aligned.

## Navigation Scroll Rules

- Internal client navigation preserves scroll position by default so existing drafts do not change behavior.
- Drafts that should reset after cross-page navigation can set `runtime.navigation.scrollRestoration.mode` in `site-config.json`.
- Supported modes are `preserve`, `top`, and `position`; use `position` with numeric `top` and optional `left` when a draft needs to land at a fixed offset instead of the top.
- For Pamela-style multi-page sites that should mimic full-page navigation, use `mode: "top"` and verify the behavior with a real browser click from a scrolled position.

## Drift Checks

When a route behaves strangely, verify:

1. draft folder name
2. payload `domain` values
3. authored links
4. local preview query parameters
5. alias and canonical config
6. `runtime.navigation.scrollRestoration` when the visible issue is scroll position after internal navigation

Record any durable mismatch in a local note or distill the reusable rule here.
