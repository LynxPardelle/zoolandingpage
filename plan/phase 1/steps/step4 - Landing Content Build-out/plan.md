# Step 4: Landing Content Build-out

## Overview

This step assembles and polishes the actual landing content: hero messaging, feature/services sections, ROI calculator copy, social proof, and conversion touchpoints (final CTA and WhatsApp). It builds on Steps 1–3 (components, shell/routing, and experience enhancements) and aligns tightly with the copy in `docs/landing-copy-context.md` and architecture guidelines.

Related docs:

- docs/02-architecture.md
- docs/04-ngx-angora-css.md
- docs/05-analytics-tracking.md
- docs/07-animations-and-angora-integration.md
- docs/landing-copy-context.md
- docs/REQUIREMENTS_SUMMARY.md

## Objectives

Primary goals

- Implement and refine hero/value proposition and ensure responsive, accessible layout
- Integrate features/services/ROI sections with finalized copy and i18n
- Add social proof (testimonials, stats) and JSON-LD structured data
- Wire conversion surfaces: final CTA and WhatsApp, with analytics

Secondary goals

- Ensure reduced motion is respected in all sections
- Keep all styles via ngx-angora-css (no hardcoded colors)
- Light doc updates where helpful (copy references, JSON-LD examples)

## Scope and Deliverables

Tasks

- Task 1: Hero & Messaging
- Task 2: Content Sections Integration (Features, Services, ROI)
- Task 3: Social Proof & Structured Data
- Task 4: Contact & Conversion (Final CTA, WhatsApp)

Deliverables

- Completed hero and core sections with i18n copy and accessible markup
- Structured data injected (Organization + WebSite + Breadcrumb where applicable)
- Conversion flows instrumented (`final_cta_*`, `whatsapp_click`) and validated
- Updated validation checklists and minimal tests/extensions as needed

## Technical Specifications

MANDATORY requirements (enforced):

1. Types-only for new definitions (no interfaces/enums)
1. Atomic files (50–80 lines target) and split constants/types/styles
1. All colors through `pushColors()` / `updateColors()` via ThemeService/Angora
1. Modern Angular features only (standalone, signals, @if/@for/@defer, afterRender)

## Success Criteria

Functional

- [ ] Hero headline and subcopy render from i18n and match landing-copy-context
- [ ] Features/Services/ROI content localized and responsive
- [ ] Testimonials/Stats present; JSON-LD valid (Rich Results Test)
- [ ] Final CTA and WhatsApp actions work and are tracked

Technical & A11y

- [ ] No hardcoded colors; styles via ngx-angora-css
- [ ] Reduced motion honored across sections
- [ ] Landmarks/labels/alt text present; tab order correct
- [ ] Unit tests adjusted for critical flows and analytics emission

## Risks & Mitigations

- Copy drift vs. code → source text from `landing-copy-context.md` and i18n JSON
- Overly heavy motion → follow reduced-motion standard from Step 3
- Analytics noise → use the existing event catalog and avoid duplicates

## Deliverables Summary

- All content sections assembled, conversion wired and tracked, structured data in place, and docs/checklists updated.
