# Task 3: SSR and Performance Baseline - Changelog

## Changes in this iteration

- Shell footer wrapped in `@defer` with `@placeholder`, `@loading`, and `@error` fallbacks
  - File: `src/app/core/components/layout/app-shell/app-shell.component.ts`
- CI-friendly scripts for budgets and performance baseline
  - File: `package.json`
  - Scripts: `ci:budgets`, `ci:perf` (uses existing `tools/perf-baseline.mjs`)

## Notes

- Existing Angular production budgets already present in `angular.json`; CI build will enforce them.
- SSR-safe checks: direct DOM/window access remains guarded in `AppHeader` via `isPlatformBrowser` and `afterNextRender()`.
