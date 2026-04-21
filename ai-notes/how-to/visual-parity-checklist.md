# Visual Parity Checklist

Date: 2026-04-19 (Central Time)
Scope: Shared visual-parity checklist for replicated or reference-matched landing pages.
Status: Active
Applies To: All visual replication or parity tasks
Source Of Truth:

- `docs/03-development-guide.md`
- `docs/11-draft-lifecycle.md`
- Promoted from local draft notes and findings

Confidence: High
Last Reviewed: 2026-04-19 (Central Time)

## Source Selection

- Prefer one primary source of truth per page.
- Use a fallback screenshot only when the live reference is unavailable or clearly broken in the tool.
- Record when integrated-browser limitations make screenshots or normal-browser checks more trustworthy than in-tool rendering.

## Acceptance Pass

Check these in order:

1. Header and navigation state
2. Hero structure, copy hierarchy, and CTA geometry
3. Section order and desktop composition
4. Footer structure, dividers, and external-link treatment
5. Mobile and narrow-width stacking behavior
6. Key CTA labels, colors, and spacing

## Validation Rules

- Ignore dev-only panels, overlays, event viewers, and temporary notifications during parity judgment.
- Judge third-party embeds by outer placement and visible composition, not by trying to restyle the provider internals.
- If the integrated browser falls back to an unreliable width or style state, document that limitation and rely on local-browser confirmation for sign-off.

## Output Rule

If the parity target will matter again, capture the page-specific baseline locally under `drafts/{domain}/ai_notes/` and distill any reusable validation rule into the committed canonical notes.
