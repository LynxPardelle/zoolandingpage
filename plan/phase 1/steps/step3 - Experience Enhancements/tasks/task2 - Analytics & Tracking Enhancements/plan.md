# Task 2: Analytics & Tracking Enhancements

## Goal

Instrument primary UX flows with analytics events and minimal assertions.

## Steps

1. Event catalog
   - CTA clicks (hero, services, final CTA)
   - ROI calculator interactions (size/industry changes)
   - Modal open/close events
2. Implementation
   - Use `AnalyticsService.track(name, { category, label, meta })`
   - Ensure events do not spam; one page_view per navigation (already implemented)
3. Testing
   - Add unit specs that assert events are fired on key interactions

## Success Criteria

- [ ] Catalog exists in code comments/docs
- [ ] Event emission verified by unit tests
- [ ] No duplicate or noisy events on simple interactions

## References

- docs/05-analytics-tracking.md
