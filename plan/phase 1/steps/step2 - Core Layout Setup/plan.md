# Step 2: Core Layout Setup Plan

## Overview

This step establishes the application shell, routing, and base layout that all features and sections rely on. We’ll wire the header/footer, container/section wrappers, modern Angular routing (standalone + lazy), SSR compatibility, accessibility landmarks, and performance baselines. The layout will integrate ngx-angora-css via pushColors and follow the atomic file principle.

## Objectives

### Primary Goals

- AppShell with persistent Header and Footer
- Configure Angular standalone Router with lazy routes and preloading
- Define landing “Home” route that renders the current section components
- SSR-safe rendering baseline (server.ts + main.server.ts already present)
- Accessibility: semantic landmarks, skip-link, focus/scroll management
- Integrate Theme and Language services at the shell level (providers)
- Hook analytics page-view event on navigation

### Secondary Goals

- Scroll restoration on navigation and hash/fragment support
- Error boundaries: global error route and shell-level error UI
- Lightweight skeletons/placeholders via @defer where appropriate
- Establish path aliases and barrel exports for layout pieces
- Initial performance budgets (bundle, LCP/INP baselines)

## Scope and Deliverables

### App Shell & Layout

- AppShell (root) composition that includes:
  - AppHeader (persistent)
  - Router outlet area wrapped by AppContainer/AppSection
  - AppFooter (persistent)
- Ensure all layout elements use ngx-angora-css classes and pushColors()
- Provide ThemeService and LanguageService at the app level

### Routing

- Standalone route config in `app.routes.ts`
- Root route “/” renders the landing page composition
- Optional future lazy child routes prepared (e.g., /privacy, /terms)
- Preloading strategy (e.g., quicklink or simple) to keep UX snappy
- Scroll position restoration, anchor scrolling, focus management on nav

### SSR Compatibility

- Verify server-side rendering still works with the shell structure
- Avoid direct DOM access in constructors; use AfterRender and signals
- No client-only APIs during SSR; guard as needed

### Accessibility

- Landmarks: header, main, footer, nav
- Skip-to-content link before header
- Visible focus states and correct tab order
- Language and theme toggles have proper labels, roles, and a11y names

## Technical Specifications

### MANDATORY Requirements (from Requirements Summary)

1. Types only (no interfaces/enums) for all new types
1. Atomic files: 50–80 lines per file, split types/constants/styles
1. ngx-angora-css pushColors() for theme styling (no hardcoded colors)
1. Latest Angular features: @if, @for, @switch, @defer (+ placeholder/error/loading)
1. Standalone components, signals, new input()/output() APIs

### Routing and Layout Patterns

- Use standalone route definitions (no NgModules)
- Root layout comp uses signals for small shell state (menu open, etc.)
- Use @defer for non-critical footer extras or heavy sections
- Use ChangeDetectionStrategy.OnPush where applicable

### File Structure (Atomic)

```text
src/app/core/components/layout/
├── app-shell/
│   ├── app-shell.component.ts
│   ├── app-shell.types.ts
│   ├── app-shell.constants.ts
│   └── index.ts
├── app-header/ … (already or per Step 1)
├── app-footer/ … (already or per Step 1)
├── app-container/ …
└── app-section/ …

src/app/
├── app.routes.ts (standalone routes)
└── app.component.ts (minimal bootstrap + providers)
```

## Implementation Strategy

### Task 1: App Shell and Routing

1. Create `AppShell` component that composes header, routed main, footer
2. Add skip-link and main landmark
3. Configure `app.routes.ts` for root route and placeholders for future pages
4. Enable scroll restoration and anchor scrolling

### Task 2: Layout Components Integration

1. Ensure AppHeader, AppFooter, AppContainer, AppSection follow atomic split
2. Apply pushColors() in AfterRender and call cssCreate()
3. Provide ThemeService and LanguageService at shell level
4. Wire up CTA regions to use shared Button component once available

### Task 3: SSR and Performance Baseline

1. Verify SSR renders landing route without client-only calls
2. Add @defer for non-critical sections and placeholders
3. Establish performance budgets and add scripts to validate

### Task 4: Testing and Documentation

1. Add unit tests for routing and shell render
2. Add a11y tests for landmarks and skip-link
3. Update docs and add usage examples

## Success Criteria

### Functional

- [ ] Navigating to “/” renders the shell and landing content
- [ ] Header and Footer persist across routes
- [ ] Scroll restoration and anchor links work
- [ ] Analytics page-view event fired on navigation

### Technical

- [ ] Types only, atomic files, pushColors usage validated
- [ ] Standalone components + signals + modern control flow used
- [ ] SSR renders without runtime errors
- [ ] Lint/type checks pass

### Accessibility & Performance

- [ ] Landmarks, skip-link, focus management verified
- [ ] Lighthouse 90+ scores target for Performance/Accessibility
- [ ] No blocking main-thread long tasks introduced by shell

## Dependencies

- Angular 20+ standalone routing and control flow
- ngx-angora-css for styling and dynamic colors
- ThemeService, LanguageService (shared)
- AnalyticsService (page-view event) – minimal abstraction ok in this step

## Risks & Mitigations

- SSR hydration mismatches → avoid client-only APIs in templates; guard with @defer and platform checks
- Overweight shell → keep logic minimal, lazy-load non-critical features
- a11y regressions → automated a11y tests + manual checklist

## Deliverables

- AppShell component + routing configuration
- Integrated layout with header/footer/container/section
- SSR-safe minimal baseline, @defer placeholders
- Automated + manual validation docs updated

---

Revision note: This step builds on Step 1’s components and focuses on wiring, standards enforcement (atomic files, pushColors), and platform quality (SSR, a11y, performance).
