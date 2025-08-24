# Task 4: Analytics QA & Event Catalog — Changelog

## Changes

- Added centralized constants for analytics events and categories at `src/app/shared/services/analytics.events.ts`.
- Instrumented additional events in `LandingPageComponent`:
  - cta_click (generic proxy with location/variant meta)
  - section_view
  - roi_visitors_change
  - roi_calculator_toggle (open/close)
  - process_step_change (for interactive process)
- Adopted constants in `roi-calculator-section.component.ts` for size/industry changes.
- Updated `docs/05-analytics-tracking.md` with the expanded event catalog and reference to constants file.

## Validation

- Dev run prints analytics events in console (debug mode) and buffers locally via `AnalyticsService`.
- Manually exercised: hero CTA, services CTA, final CTA, WhatsApp, ROI size/industry/visitors changes, calculator toggle, process step change, nav clicks, language/theme toggles, and modal open/close.

## Follow-ups

- Wire visitors input UI (when added) to call `updateVisitors()`.
- Consider adding scroll/section view observers if deeper read-depth analytics are required.
- Implement server-side endpoint and enable `send()` in `AnalyticsService` when available.
