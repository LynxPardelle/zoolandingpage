# Task 1: Performance & Budgets - Changelog

## 2025-08-23

- Defer-loaded ROI Calculator and FAQ sections in landing-page.component.html with placeholders to improve initial perf.
- Reviewed angular.json budgets (initial 500kB warn / 1MB error) and left as-is for now.
- Production build run: initial total ~636.44 kB (warn), lazy chunks created for ROI and FAQ. A toast style exceeded anyComponentStyle by ~9 bytes (warn).
- Further defers applied: Interactive Process and Testimonials with placeholders to reduce initial path.
