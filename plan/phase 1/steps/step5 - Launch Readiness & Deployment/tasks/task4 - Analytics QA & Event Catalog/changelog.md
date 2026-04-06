# Task 4: Analytics QA & Event Catalog — Changelog

## Changes

- Added centralized constants for analytics events and categories at `src/app/shared/services/analytics.events.ts`.
- Instrumented additional events in `LandingPageComponent`:
  - cta_click (generic proxy with location/variant meta)
  - section_view
  - process_step_change (for interactive process)
- Updated `docs/05-analytics-tracking.md` with the expanded event catalog and reference to constants file.

## Validation

- Dev run prints analytics events in console (debug mode) and buffers locally via `AnalyticsService`.
- Manually exercised: hero CTA, services CTA, final CTA, WhatsApp, process step change, nav clicks, language/theme toggles, and modal open/close.

## Follow-ups

- Add generic interaction-scope analytics hooks when authored forms or calculators are activated.
- Consider adding scroll/section view observers if deeper read-depth analytics are required.
- Implement server-side endpoint and enable `send()` in `AnalyticsService` when available.
