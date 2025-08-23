# Task 1: App Shell and Routing

## Goal

Implement the AppShell layout and modern standalone routing with scroll/anchor support and page-view analytics.

## Deliverables

- AppShell component (header, main with router, footer)
- Skip-to-content link and main landmark
- Root route and options (scroll restoration, anchor scrolling)
- Page-view analytics on navigation

## Steps

1. Create `app-shell/` with atomic split (component, types, constants)
2. Compose `<app-header>`, `<router-outlet>` in main, `<app-footer>`
3. Add skip-link targeting `#main-content`
4. Configure `app.routes.ts` with root route for landing
5. Enable `withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' })`
6. Hook `Router.events` to AnalyticsService for page-view events
7. Add unit tests for shell render and routing

## Success Criteria

- [ ] Shell renders and navigates to root
- [ ] Skip-link works and focus moves to main
- [ ] Page-view fired exactly once per route change
- [ ] Tests pass; lint/type checks clean
