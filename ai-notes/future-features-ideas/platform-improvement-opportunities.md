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
Last Reviewed: 2026-05-14 (Central Time)

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
- Productize contact form and email-notification integrations before selling email-delivering forms as a standard package feature. The implementation should use server-only integration policies, allowlisted fields, credential references, rate limiting or spam controls, and clear PII handling; drafts can keep using direct contact links until this exists.
- Add an authenticated page/session model before selling login-protected internal areas, client portals, or account-gated pages. Until this exists, "internal landing page" in draft/product copy should mean a public in-site campaign or service page, not a login-required page.
- Add a pricing/resource-limit calculator for hosted draft sites before publishing technical plan limits. The model should estimate per-site cost and tier allowances from all resources involved in serving a site, including S3 reads/storage/transfer, Lambda invocations and duration, configuration delivery, SSR/container rendering, analytics ingestion/storage, cache behavior, and related AWS/network costs. Zoosite plan tables may later expose these as collapsed `Detalles tecnicos`, but public limits such as monthly views or request allowances should wait until the calculator uses current provider pricing and measured platform behavior.

## Workflow And Validation

- Add a first-class intake schema or questionnaire-to-payload contract.
- Add semantic validation on top of structural JSON validation.
- Add industry-specific blueprints for common verticals such as legal, music, education, and SaaS.
- Add approval ownership metadata for legal, SEO, translation, and business sign-off.
- Add asset-presence and placeholder detection before release.
- Add a regulated-content review profile for industries with compliance risk.
- Add a deterministic draft smoke-test and readiness gate that covers security, tests, build warnings, manual QA, desktop and mobile browser QA, analytics consent, and localization review.
