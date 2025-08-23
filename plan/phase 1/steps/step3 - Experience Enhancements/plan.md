# Step 3: Experience Enhancements

## Overview

This step focuses on polishing the user experience by finalizing theme and language integration, strengthening analytics tracking, and introducing accessible animations powered by ngx-angora-css. We build on Step 2’s shell and routing foundation and adhere strictly to the project’s MANDATORY requirements.

Related docs:

- docs/04-ngx-angora-css.md
- docs/05-analytics-tracking.md
- docs/07-animations-and-angora-integration.md
- docs/REQUIREMENTS_SUMMARY.md

## Objectives

Primary goals

- Global Theme and Language integration (signals, persistence, no hardcoded colors)
- Analytics instrumentation for key UX flows (CTA clicks, ROI calculator, modal interactions)
- Accessible animations and microinteractions (reduced motion support, defer when needed)

Secondary goals

- Light docs refresh with examples/snippets
- Unit tests validating toggles, analytics, and reduced-motion behavior

## Scope and Deliverables

Tasks

- Task 1: Theme and Language Integration
- Task 2: Analytics & Tracking Enhancements
- Task 3: Animations and Angora Integration
- Task 4: Testing and Documentation

Deliverables

- Theme/Language fully wired (services at app level, persisted, documented)
- Analytics events catalog and minimal assertions in tests
- Animation combos integrated with graceful degradation
- Updated docs and validation checklists

## Technical Specifications

MANDATORY requirements (enforced):

1. Types only (no interfaces/enums) for new types
1. Atomic files (50–80 lines target), split constants/types/styles
1. All color changes via `pushColors()` / `updateColors()` (no hardcoded colors)
1. Latest Angular features (standalone, signals, @if/@for/@defer, afterRender guards)

## Success Criteria

Functional

- [ ] Theme toggle updates colors across the app and persists
- [ ] Language toggle flips between ES/EN and persists
- [ ] Analytics events recorded for primary CTAs and ROI changes
- [ ] Core animations visible (unless reduced motion is detected)

Technical

- [ ] Types-only, atomic file splits, and ngx-angora-css usage verified
- [ ] Tests added for toggles and analytics
- [ ] Docs updated with examples

Accessibility & Performance

- [ ] Reduced motion honored (no heavy animations when set)
- [ ] Deferred non-critical animation assets/components where appropriate

## Risks & Mitigations

- Over-animated UI → keep subtle microinteractions; respect reduced motion
- Event noise → keep a minimal analytics event catalog with clear naming
- Color regressions → enforce `pushColors()` centrally via ThemeService

## Deliverables Summary

- Completed tasks (1–4), tests passing, and docs updated. Changelogs for tasks populated as work proceeds.
