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
Last Reviewed: 2026-05-29 (Central Time)

## Authoring And QA

- Add a draft-domain consistency validator for folder name, payload domain values, internal links, aliases, and canonical origins.
- Add a first-class visual-parity checklist artifact to the draft workflow.
- Add preset reference viewports to the debug workspace.
- Add screenshot-diff or overlay support for local draft previews.
- Add a quick-hide mode for debug overlays during visual QA.
- Add a reference-style capture step to draft intake for visual inspiration. The workflow should record which public sites inspired the draft, which patterns were borrowed, and which prior Zoolanding drafts must be visually avoided so new drafts do not converge on the same house style.

## Draft Primitives

- Add a layout blueprint library for common landing structures.
- Add draft-level typography controls for font pairing and loading. The feature should let a draft select approved font families or font tokens, load them safely from an approved source, preserve SSR rendering, define fallbacks, and validate that chosen fonts do not break mobile text fit, performance budgets, or accessibility.
- Add a stronger draft-safe social-icon pattern.
- Add host-level classes or styles for leaf components such as `embed-frame`.
- Add a route-driven shared navigation manifest derived from site config.
- Add a dedicated structured contact-channels block for professional-services landings.
- Add a trust-signals component that is not coupled to testimonials.
- Extend stats-style components to support visible labels.
- Add per-card CTA destination support where service or offer cards need direct routing.
- Add a stock-image sourcing workflow for draft authors using approved providers such as Pexels and Pixabay. Provider API keys must stay out of browser payloads and committed draft files; the retrieval step should run in server-side tooling or local secure tooling, store only final public asset URLs in draft config, and preserve provider attribution, license/source metadata, search query, selected asset id, crop intent, alt text, and upload/compression settings.

## Future Site Features

- Add a first-class site-search model instead of draft-only search placeholders.
- Add navigation performance instrumentation for route bootstrap phases.
- Productize contact form and email-notification integrations before selling email-delivering forms as a standard package feature. The implementation should use server-only integration policies, allowlisted fields, credential references, rate limiting or spam controls, and clear PII handling; drafts can keep using direct contact links until this exists.
- Add an authenticated page/session model before selling login-protected internal areas, client portals, or account-gated pages. Until this exists, "internal landing page" in draft/product copy should mean a public in-site campaign or service page, not a login-required page.
- Add a pricing/resource-limit calculator for hosted draft sites before publishing technical plan limits. The model should estimate per-site cost and tier allowances from all resources involved in serving a site, including S3 reads/storage/transfer, Lambda invocations and duration, configuration delivery, SSR/container rendering, analytics ingestion/storage, cache behavior, and related AWS/network costs. Zoosite plan tables may later expose these as collapsed `Detalles tecnicos`, but public limits such as monthly views or request allowances should wait until the calculator uses current provider pricing and measured platform behavior.

## Workflow And Validation

- Add a first-class intake schema or questionnaire-to-payload contract.
- Add semantic validation on top of structural JSON validation.
- Add industry-specific blueprints for common verticals such as therapy/psychology, legal, music, education, and SaaS. For regulated or health-adjacent services, the blueprint should include claim-language guardrails, credential visibility, conservative audience wording, privacy/legal review checkpoints, and no unsupported clinical outcome promises.
- Add approval ownership metadata for legal, SEO, translation, and business sign-off.
- Add asset-presence and placeholder detection before release.
- Add a regulated-content review profile for industries with compliance risk.
- Add a deterministic draft smoke-test and readiness gate that covers security, tests, build warnings, manual QA, desktop and mobile browser QA, analytics consent, and localization review.

## Handoff Specs From Roberto Rodriguez Rodriguez Draft Planning

Source task: 2026-05-29 CT planning for a psychology/online-therapy draft.

### Draft Typography Controls

- Problem: Current drafts can vary color and layout through config, but font personality is not first-class enough for health, wellness, or premium service drafts that need a distinct editorial tone.
- Desired capability: Allow a draft to select a heading/body font pairing from approved presets or explicit safe tokens.
- Scope boundaries: Do not load arbitrary user-provided font URLs directly from browser payloads. Do not allow font changes to bypass SSR, CSP, performance, or accessibility review.
- Acceptance criteria:
  - Draft config can declare typography presets without app code per draft.
  - SSR output includes the same font strategy as hydrated output.
  - Fallback fonts are explicit.
  - Validation flags missing, unsupported, or performance-risky font choices.
  - Browser QA includes desktop/mobile checks for overflow, long Spanish copy, CTA labels, and heading wrapping.

### Pexels/Pixabay Stock Asset Sourcing

- Problem: Draft authors need professional supporting imagery without manually browsing and downloading assets every time.
- Desired capability: Use provider APIs such as Pexels and Pixabay to search, shortlist, download, optimize, and upload candidate images into the Zoolanding public assets flow.
- Security boundary: Provider API keys must remain in local secret stores, environment variables, or server-only secret management. They must never be committed to `ai-notes`, draft repos, JSON payloads, browser runtime bundles, or public URLs.
- Suggested workflow:
  - Input: domain, page id, section intent, Spanish/English search query, orientation, target dimensions, and desired mood.
  - Tooling searches approved providers and returns a small shortlist with provider, source URL, creator/attribution fields, dimensions, license/source metadata, and preview URL.
  - Human or agent selects assets.
  - Tooling downloads selected assets, optimizes them, uploads through the existing public asset path, and returns final `https://assets.zoolandingpage.com.mx/...` URLs.
  - Draft config stores only final public URLs, alt text, and any non-sensitive attribution/source metadata needed for audit.
- Acceptance criteria:
  - No provider key appears in git diff, runtime payload, console logs, or generated notes.
  - Every selected image has alt text tied to nearby content.
  - Every asset has recorded provider/source/selection metadata in a safe local or committed metadata file, depending on sensitivity and license needs.
  - Release checks can detect missing public assets, local `/drafts/...` image paths, and placeholder stock images before publication.
