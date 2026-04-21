# Platform Improvement Opportunities

Date: 2026-04-19 (Central Time)
Scope: Cross-site product and workflow opportunities promoted from draft work.
Status: Backlog input
Applies To: Platform-level UX, authoring workflow, and runtime ergonomics
Source Of Truth:

- `docs/03-development-guide.md`
- `docs/11-draft-lifecycle.md`
- Promoted from local draft findings

Confidence: Medium
Last Reviewed: 2026-04-19 (Central Time)

## Authoring And QA

- Add a draft-domain consistency validator for folder name, payload domain values, internal links, aliases, and canonical origins.
- Add a first-class visual-parity checklist artifact to the draft workflow.
- Add preset reference viewports to the debug workspace.
- Add screenshot-diff or overlay support for local draft previews.
- Add a quick-hide mode for debug overlays during visual QA.

## Draft Primitives

- Add a layout blueprint library for common landing structures.
- Add a stronger draft-safe social-icon pattern.
- Add host-level classes or styles for leaf components such as `embed-frame`.
- Add a route-driven shared navigation manifest derived from site config.
- Add a dedicated structured contact-channels block for professional-services landings.
- Add a trust-signals component that is not coupled to testimonials.
- Extend stats-style components to support visible labels.
- Add per-card CTA destination support where service or offer cards need direct routing.

## Future Site Features

- Add a first-class site-search model instead of draft-only search placeholders.
- Add navigation performance instrumentation for route bootstrap phases.

## Workflow And Validation

- Add a first-class intake schema or questionnaire-to-payload contract.
- Add semantic validation on top of structural JSON validation.
- Add industry-specific blueprints for common verticals such as legal, music, education, and SaaS.
- Add approval ownership metadata for legal, SEO, translation, and business sign-off.
- Add asset-presence and placeholder detection before release.
- Add a regulated-content review profile for industries with compliance risk.
- Add a deterministic draft smoke-test and readiness gate that covers security, tests, build warnings, manual QA, desktop and mobile browser QA, analytics consent, and localization review.
