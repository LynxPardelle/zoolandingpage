# Step 2: Core Layout Setup - Changelog

## Overview

Track all files created/modified during App Shell, routing, and layout wiring.

## Planned File Changes

### New Components

- `src/app/core/components/layout/app-shell/app-shell.component.ts`
- `src/app/core/components/layout/app-shell/app-shell.types.ts`
- `src/app/core/components/layout/app-shell/app-shell.constants.ts`
- `src/app/core/components/layout/app-shell/index.ts`

### Routing & Config

- `src/app/app.routes.ts` (update to add root route and options)
- `src/app/app.component.ts` or `app.config.ts` (providers wiring)

### Services Integration

- Provide `ThemeService`, `LanguageService`, `AnalyticsService` at shell level

### Tests

- `src/app/core/components/layout/app-shell/app-shell.component.spec.ts`
- Routing tests under `src/app/**/__tests__/routing.spec.ts`

### Docs

- Update `docs/02-architecture.md` routing diagram (if needed)
- Update `docs/03-development-guide.md` with shell examples (if needed)

## Actual Changes Log

Record concrete diffs as work proceeds:

- [x] Modified files:

  - src/app/core/components/layout/app-shell/app-shell.component.ts
    - Inject ThemeService and LanguageService to initialize providers at app level.
  - src/app/core/components/layout/app-header/app-header.component.ts
    - Inject NgxAngoraService and call cssCreate() after first render.
  - src/app/core/components/layout/app-footer/app-footer.component.ts
    - Inject NgxAngoraService and call cssCreate() after first render.
  - src/app/core/components/layout/app-container/app-container.component.ts
    - Inject NgxAngoraService and call cssCreate() after first render.
  - src/app/core/components/layout/app-section/app-section.component.ts
    - Inject NgxAngoraService and call cssCreate() after first render.

- [x] Notes:
  - AppShell already initializes Angora combos and regenerates CSS after every render; per-component cssCreate() is lightweight and ensures projected content and lazy DOM updates have classes available without flash of unstyled content.

### Task 3 (SSR and Performance Baseline)

- [x] Modified files:

  - src/app/core/components/layout/app-shell/app-shell.component.ts
    - Wrap footer in @defer with placeholder/loading/error blocks for SSR/perf baseline.
  - package.json
    - Add CI scripts: ci:budgets (production build enforcing budgets), ci:perf (perf baseline report).

- [x] Notes:
  - Production budgets are defined in angular.json; perf baseline report generated via tools/perf-baseline.mjs.

## Deviations

Note any deviations from the plan and the rationale.
