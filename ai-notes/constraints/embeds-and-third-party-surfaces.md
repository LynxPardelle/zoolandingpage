# Embeds And Third-Party Surfaces

Date: 2026-04-19 (Central Time)
Scope: Shared rules for drafts that depend on embeds or third-party visual surfaces.
Status: Active
Applies To: Embedded forms, maps, videos, documents, and other third-party surfaces
Source Of Truth:

- `docs/03-development-guide.md`
- `docs/11-draft-lifecycle.md`
- Promoted from local draft notes and findings

Confidence: High
Last Reviewed: 2026-04-19 (Central Time)

## Composition Rules

- Style the surrounding composition first: heading alignment, lead width, outer spacing, container width, and placement.
- Treat the embedded provider surface as the visible card or media block when that matches the live reference.
- Avoid adding extra wrapper cards or duplicate CTAs unless the source reference clearly needs them.

## Validation Rules

- Judge iframe-based surfaces by outer placement and visible first-screen behavior.
- Do not promise precise parity for provider-owned internals that the draft system does not control.
- Record any host-level styling limitation as a reusable future idea instead of hiding it in a one-off task log.

## Known Durable Limitation

- Leaf components such as `embed-frame` may need host-level classes or styles in future platform work when payload authors need stronger outer-width control.
