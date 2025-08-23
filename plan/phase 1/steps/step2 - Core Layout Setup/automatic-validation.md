# Step 2: Core Layout Setup - Automatic Validation

## Overview

Automated checks for App Shell, routing, SSR safety, a11y landmarks, and ngx-angora-css usage. All checks must pass before Step 2 completes.

## Test Categories

### Unit and Integration Tests

- Shell Rendering

  - CreateComponent(AppShell) succeeds
  - Header/Footer present; main landmark exists
  - Skip-link targets `#main-content` and focuses correctly

- Routing

  - Navigating to `/` renders landing content area
  - Scroll restoration enabled and working
  - Anchor scrolling navigates to `#section-id`

- Services Wiring
  - ThemeService and LanguageService provided in shell
  - AnalyticsService fires page-view on route change

```typescript
describe('AppShell & Routing', () => {
  it('renders header, main, footer', () => {
    /* ... */
  });
  it('navigates to root and displays content', () => {
    /* ... */
  });
  it('fires page-view event on navigation', () => {
    /* ... */
  });
});
```

### Accessibility Tests

- axe-core scan has no violations
- Landmarks detected: header, main, footer, nav
- Skip-link appears on focus and is operable

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);
it('has no a11y violations', async () => {
  const results = await axe(fixture.nativeElement);
  expect(results).toHaveNoViolations();
});
```

### SSR Safety Tests

- Server render snapshot doesn’t access window/document in constructors
- Guards present for client-only code; AfterRender used appropriately

### ngx-angora-css Validation

- pushColors() invoked in layout components; no hardcoded colors
- cssCreate() called after pushColors

### Angular Modern Features Validation

- Standalone components only; no NgModules
- @if/@for/@switch control flow present
- @defer used for non-critical regions with placeholder/error/loading

### Performance Checks

- Basic Lighthouse CI with budgets
- Bundle diff stays within budget for shell additions

## CI Workflow Snippet

```yaml
name: Step 2 Validation
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run type-check
      - run: npm run lint
      - run: npm run test:unit
      - run: npm run test:a11y
      - run: npm run test:ssr
      - run: npm run test:budgets
```

## Success Criteria

- [ ] Unit/integration tests pass for shell and routing
- [ ] axe-core a11y scan passes with zero violations
- [ ] SSR tests pass; no client-only access during server render
- [ ] pushColors() used; no hardcoded colors
- [ ] Modern Angular features in templates
- [ ] Budgets respected; no large regressions
