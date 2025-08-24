# Task 1: Performance & Budgets

## Goal

Meet or exceed performance budgets and establish baseline measurements.

## Subtasks

- Verify Angular build budgets (ci:budgets) and adjust as needed
- Run Lighthouse (mobile) for LCP/CLS/INP targets; document in VALIDATION_REPORT.md
- Ensure SSR hydration success and minimal JS for above-the-fold via @defer
- Review bundle sizes and critical styles; avoid color literals, leverage Angora utilities

## Deliverables

- Budgets passing in CI
- Lighthouse scores captured
- Notes on defer/lazy strategies and results
