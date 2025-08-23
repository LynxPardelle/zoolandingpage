# Task 3: SSR and Performance Baseline

## Goal

Verify SSR safety for the shell and establish initial performance budgets and @defer placeholders.

## Steps

1. Run SSR render; fix any client-only access (window/document) in constructors
2. Add @defer for non-critical shell parts with placeholder/error/loading
3. Set budgets and add CI checks for bundle and Lighthouse

## Success Criteria

- [ ] SSR renders without hydration warnings
- [ ] Deferred regions render with placeholders
- [ ] Budgets enforced by CI scripts
