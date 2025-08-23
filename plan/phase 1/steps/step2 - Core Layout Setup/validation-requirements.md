# Step 2 Validation Checklist - Core Layout Setup

## MANDATORY Requirements

### ✅ Type System (Types-only)

- [ ] All new definitions use `type` (no interfaces/enums)
- [ ] Public APIs documented via JSDoc

### ✅ ngx-angora-css Theme Management

- [ ] Layout components call `pushColors()` in `ngAfterRender()`
- [ ] `cssCreate()` called after pushing colors/combos
- [ ] No hardcoded colors in SCSS/HTML

### ✅ File Atomicity

- [ ] Each file ≤ 80 lines (component/types/constants split)
- [ ] Barrel `index.ts` present for layout component folders

### ✅ Angular Latest Features

- [ ] Standalone components only; no NgModules
- [ ] Use `@if`, `@for`, `@switch`, `@defer` with placeholder/error/loading
- [ ] Signals used for shell state where applicable

### ✅ Routing & Shell

- [ ] `app.routes.ts` uses standalone Router config
- [ ] Scroll restoration and anchor scrolling enabled
- [ ] Root route renders landing composition
- [ ] Page-view analytics fired on `NavigationEnd`

### ✅ Accessibility

- [ ] Landmarks: header, main, footer (+ nav)
- [ ] Skip-to-content link present and operable
- [ ] Focus management on navigation (focus main on route change or skip-link)

### ✅ SSR Safety

- [ ] No window/document access in constructors
- [ ] Guards for client-only code; AfterRender used appropriately
- [ ] No hydration mismatch warnings in console

## Automated Checks

```json
{
  "rules": {
    "@typescript-eslint/consistent-type-definitions": ["error", "type"],
    "@typescript-eslint/no-enum": "error",
    "@typescript-eslint/no-interface": "error",
    "@angular-eslint/prefer-standalone": "error",
    "max-lines": ["error", { "max": 80 }],
    "custom-rules/no-hardcoded-colors": "error",
    "custom-rules/require-pushColors": "error"
  }
}
```

## Tests Required

- [ ] AppShell render tests (header/main/footer + skip-link)
- [ ] Routing tests (root route, scroll/anchor, page-view analytics)
- [ ] Accessibility tests (axe-core: zero violations)
- [ ] SSR tests (server render ok)
- [ ] Budgets tests (bundle diff within thresholds)

## Success Criteria Summary

- [ ] Types-only, atomic files, modern Angular features
- [ ] pushColors/cssCreate used; zero hardcoded colors
- [ ] App shell + routing functionally correct
- [ ] A11y landmarks and skip-link verified
- [ ] SSR safe; no hydration issues
- [ ] Performance budgets respected
